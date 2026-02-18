import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient(); // Autenticado
    try {
        // Obter os dados do corpo da requisição de uma vez
        const { integrationId, externalAccountId, loginCustomerId, accountName } = await request.json();

        if (!integrationId || !externalAccountId) {
            return NextResponse.json({ error: 'Faltando dados obrigatórios.' }, { status: 400 });
        }

        // Preparar objeto de atualização
        const updates: any = {
            external_account_id: externalAccountId,
            updated_at: new Date().toISOString()
        };

        // Atualizar metadados com loginCustomerId e accountName
        if (loginCustomerId || accountName) {
            const metadata: any = {
                last_updated_by: 'user_selection'
            };
            if (loginCustomerId) metadata.login_customer_id = loginCustomerId;
            if (accountName) metadata.account_name = accountName;

            updates.metadata = metadata;
        }

        // Atualizar a integração
        const { data, error } = await supabase
            .from('integrations')
            .update(updates)
            .eq('id', integrationId)
            .select()
            .single();

        if (error) {
            console.error('Erro Supabase ao salvar conta:', error);
            return NextResponse.json({ error: 'Erro ao salvar integração no banco de dados.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (err: any) {
        console.error('Erro interno ao salvar conta:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
