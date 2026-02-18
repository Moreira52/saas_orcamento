import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
    const supabase = await createClient();
    try {
        const { searchParams } = new URL(request.url);
        const integrationId = searchParams.get('integrationId');

        if (!integrationId) {
            return NextResponse.json({ error: 'Integration ID is required' }, { status: 400 });
        }

        console.log('--- DEBUG LIST ACCOUNTS ---');
        console.log('Recebido IntegrationID:', integrationId);

        // 1. Buscar credenciais no banco por ID direto (PK)
        const { data: integration, error } = await supabase
            .from('integrations')
            .select('*')
            .eq('id', integrationId)
            .single(); // Agora pode ser single, pois ID é único

        console.log('Resultado Supabase:', integration ? 'Encontrado' : 'Não encontrado');
        if (error) console.error('Erro Supabase:', error);

        if (error || !integration) {
            console.log('Erro final: Integração não encontrada no banco para este ID.');
            return NextResponse.json({ error: 'Integração não encontrada', supabaseError: error }, { status: 404 });
        }

        // 2. Configurar Google OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            refresh_token: integration.refresh_token
        });

        // 3. Obter Access Token atualizado
        const { token } = await oauth2Client.getAccessToken();

        if (!token) {
            return NextResponse.json({ error: 'Falha ao obter token de acesso' }, { status: 401 });
        }

        // 4. Verificar Developer Token
        const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

        console.log('--- SETUP ---');
        console.log('Client ID (início):', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');
        console.log('Dev Token (início):', developerToken?.substring(0, 5) + '...');
        console.log('-------------');

        if (!developerToken) {
            console.warn('GOOGLE_ADS_DEVELOPER_TOKEN não configurado.');
            // Retornar erro amigável para o dev configurar
            return NextResponse.json({
                error: 'Configuration Error',
                message: 'Developer Token não configurado no servidor (.env).'
            }, { status: 500 });
        }

        // 5. Chamada à API do Google Ads (Listar Clientes Acessíveis)
        // Usando v21 (Versão atual 2026)
        const response = await fetch('https://googleads.googleapis.com/v21/customers:listAccessibleCustomers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'developer-token': developerToken,
                'Content-Type': 'application/json'
            }
        });

        const textBody = await response.text();

        console.log('--- RESPOSTA GOOGLE ADS ---');
        console.log('Status:', response.status, response.statusText);

        let data;
        try {
            data = JSON.parse(textBody);
        } catch (e) {
            throw new Error(`Resposta da API não é JSON. Status: ${response.status}. Body: ${textBody}`);
        }

        if (!response.ok) {
            console.error('Erro Google Ads API:', JSON.stringify(data, null, 2));

            // Extrair mensagem de erro útil do Google
            const errorMessage = data.error?.message || 'Erro desconhecido na API do Google';
            const errorCode = data.error?.code || response.status;

            return NextResponse.json({
                error: errorMessage,
                code: errorCode,
                details: data
            }, { status: response.status });
        }

        // data.resourceNames é um array de strings: ["customers/1234567890", "customers/0987654321"]
        const resourceNames = data.resourceNames || [];
        const allClientAccounts: any[] = [];
        const seenAccountIds = new Set<string>();

        // 6. Para cada conta acessível, determinar se é MCC ou cliente direto
        console.log(`Encontradas ${resourceNames.length} contas acessíveis diretamente.`);

        for (const resourceName of resourceNames) {
            const loginCustomerId = resourceName.split('/')[1];

            try {
                // Passo 1: Obter detalhes da própria conta (para saber se é manager)
                const selfQuery = `
                    SELECT 
                        customer.id, 
                        customer.descriptive_name, 
                        customer.manager, 
                        customer.currency_code, 
                        customer.time_zone 
                    FROM customer 
                    LIMIT 1
                `;

                const selfSearchUrl = `https://googleads.googleapis.com/v21/customers/${loginCustomerId}/googleAds:search`;

                const selfResponse = await fetch(selfSearchUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'developer-token': developerToken,
                        'login-customer-id': loginCustomerId,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query: selfQuery })
                });

                if (!selfResponse.ok) {
                    console.warn(`Falha ao obter detalhes da conta ${loginCustomerId}: ${selfResponse.status}`);
                    continue;
                }

                const selfData = await selfResponse.json();
                const selfCustomer = selfData.results?.[0]?.customer;

                if (!selfCustomer) continue;

                const isManager = selfCustomer.manager;

                if (!isManager) {
                    // É uma conta de cliente direta
                    if (!seenAccountIds.has(String(selfCustomer.id))) {
                        seenAccountIds.add(String(selfCustomer.id));
                        allClientAccounts.push({
                            id: String(selfCustomer.id),
                            resourceName: resourceName,
                            name: selfCustomer.descriptiveName || `Conta ${selfCustomer.id}`,
                            currency: selfCustomer.currencyCode,
                            timeZone: selfCustomer.timeZone,
                            loginCustomerId: loginCustomerId // Acesso direto
                        });
                    }
                } else {
                    // É um MCC, buscar sub-contas (clientes)
                    const clientQuery = `
                        SELECT 
                            customer_client.client_customer,
                            customer_client.id, 
                            customer_client.descriptive_name,
                            customer_client.manager,
                            customer_client.currency_code,
                            customer_client.time_zone
                        FROM customer_client
                        WHERE 
                            customer_client.status = 'ENABLED' 
                            AND customer_client.manager = false
                    `;

                    // TODO: Implementar paginação se necessário (para MCCs gigantes)
                    // Atualmente pega a primeira página (normalmente até 10k resultados)
                    const clientResponse = await fetch(selfSearchUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'developer-token': developerToken,
                            'login-customer-id': loginCustomerId,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ query: clientQuery })
                    });

                    if (clientResponse.ok) {
                        const clientData = await clientResponse.json();
                        if (clientData.results) {
                            for (const row of clientData.results) {
                                const client = row.customerClient;
                                if (!seenAccountIds.has(String(client.id))) {
                                    seenAccountIds.add(String(client.id));
                                    allClientAccounts.push({
                                        id: String(client.id),
                                        resourceName: client.resourceName,
                                        name: client.descriptiveName || `Conta ${client.id}`,
                                        currency: client.currencyCode,
                                        timeZone: client.timeZone,
                                        loginCustomerId: loginCustomerId // Acesso via este MCC
                                    });
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                console.error(`Erro ao processar conta ${loginCustomerId}:`, err);
            }
        }

        // Caso especial: Se não encontrou NENHUMA sub-conta
        // Devemos retornar as contas acessíveis diretamente como fallback
        // e avisar o frontend que são contas diretas
        if (allClientAccounts.length === 0 && resourceNames.length > 0) {
            console.log('Nenhuma sub-conta encontrada recursivamente. Retornando contas diretas.');
            const directAccounts = resourceNames.map((r: string) => {
                const id = r.split('/')[1];
                return {
                    id: id,
                    resourceName: r,
                    name: `Conta Direta ${id}`, // Nome genérico pois access customers não retorna nome
                    loginCustomerId: id // Login direto na conta
                };
            });
            return NextResponse.json({ success: true, customers: directAccounts, warning: 'Mostrando contas diretas (nenhuma sub-conta encontrada).' });
        }

        // Ordenar alfabeticamente
        allClientAccounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return NextResponse.json({ success: true, customers: allClientAccounts });

    } catch (err: any) {
        console.error('Erro geral:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
