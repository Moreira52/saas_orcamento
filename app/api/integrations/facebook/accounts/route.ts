import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
        return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Obter o Access Token do banco
    const { data: integration, error: dbError } = await supabase
        .from('integrations')
        .select('access_token')
        .eq('client_id', clientId)
        .eq('provider', 'meta')
        .single();

    if (dbError || !integration) {
        return NextResponse.json({ error: 'Integração não encontrada.' }, { status: 404 });
    }

    const accessToken = integration.access_token;

    try {
        // 2. Buscar Contas de Anúncio no Facebook
        // fields=name,account_id,currency,account_status,amount_spent
        const response = await fetch(
            `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency,account_status,business_name&access_token=${accessToken}&limit=100`
        );
        const fbData = await response.json();

        if (fbData.error) {
            throw new Error(fbData.error.message);
        }

        const accounts = fbData.data.map((acc: any) => ({
            id: `act_${acc.account_id}`,
            name: acc.name || `Conta ${acc.account_id}`,
            currency: acc.currency,
            status: acc.account_status, // 1=ACTIVE, 2=DISABLED, etc.
            businessName: acc.business_name
        }));

        return NextResponse.json({ accounts });
    } catch (error: any) {
        console.error('Erro ao buscar contas do Facebook:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
