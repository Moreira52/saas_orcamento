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

        console.log('--- DEBUG LIST CAMPAIGNS ---');
        console.log('Recebido IntegrationID:', integrationId);

        // 1. Buscar credenciais no banco por ID
        const { data: integration, error } = await supabase
            .from('integrations')
            .select('*')
            .eq('id', integrationId)
            .single();

        if (error || !integration) {
            console.error('Erro Supabase:', error);
            return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
        }

        // Verificar se temos o ID da conta externa vinculado
        const customerId = integration.external_account_id;
        const loginCustomerId = integration.metadata?.login_customer_id; // Obrigatório se for acesso via MCC

        if (!customerId || customerId === 'PENDING_SELECTION') {
            return NextResponse.json({ error: 'Nenhuma conta de anúncio selecionada para esta integração.' }, { status: 400 });
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

        const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
        if (!developerToken) {
            return NextResponse.json({ error: 'Developer Token não configurado' }, { status: 500 });
        }

        // 4. Executar Consulta GAQL
        // Buscamos ID, Nome e Status. Filtramos removidos para limpeza inicial.
        const query = `
            SELECT 
                campaign.id, 
                campaign.name, 
                campaign.status,
                campaign.advertising_channel_type
            FROM campaign 
            WHERE campaign.status != 'REMOVED'
            ORDER BY campaign.name ASC
        `;

        const url = `https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`;

        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
        };

        // Se o acesso for via MCC, precisamos do login-customer-id no header
        if (loginCustomerId) {
            headers['login-customer-id'] = loginCustomerId;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro Google Ads API (Campanhas):', errorText);
            return NextResponse.json({
                error: 'Erro ao buscar campanhas do Google',
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();

        // Mapear resultados
        const campaigns = data.results?.map((row: any) => ({
            id: row.campaign.id,
            name: row.campaign.name,
            status: row.campaign.status,
            type: row.campaign.advertisingChannelType
        })) || [];

        return NextResponse.json({ success: true, campaigns });

    } catch (err: any) {
        console.error('Erro geral (List Campaigns):', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
