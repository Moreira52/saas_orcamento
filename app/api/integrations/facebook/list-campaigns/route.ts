import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const supabase = await createClient();

    try {
        const { searchParams } = new URL(request.url);
        const integrationId = searchParams.get('integrationId');

        if (!integrationId) {
            return NextResponse.json({ error: 'Integration ID is required' }, { status: 400 });
        }

        // 1. Fetch integration from DB
        const { data: integration, error } = await supabase
            .from('integrations')
            .select('*')
            .eq('id', integrationId)
            .single();

        if (error || !integration) {
            return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
        }

        const accountId = integration.external_account_id;

        if (!accountId || accountId === 'PENDING_SELECTION') {
            return NextResponse.json({ error: 'Nenhuma conta de anúncio selecionada para esta integração.' }, { status: 400 });
        }

        const accessToken = integration.access_token;

        // 2. Fetch campaigns from Meta Graph API
        const url = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${accessToken}`;
        const response = await fetch(url);
        const fbData = await response.json();

        if (fbData.error) {
            console.error('Meta Ads API error:', fbData.error);
            return NextResponse.json({ error: fbData.error.message }, { status: 400 });
        }

        const campaigns = (fbData.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,    // ACTIVE | PAUSED | ARCHIVED | DELETED
            type: c.objective || '',
        }));

        return NextResponse.json({ success: true, campaigns });
    } catch (err: any) {
        console.error('Error listing Meta campaigns:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
