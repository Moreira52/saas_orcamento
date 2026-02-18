import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const provider = searchParams.get('provider'); // 'google' | 'facebook'

    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 });

    const { data, error } = await supabase
        .from('integrations')
        .select('id, created_at, updated_at, external_account_id, metadata')
        .eq('client_id', clientId)
        .eq('provider', provider)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
        return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
        connected: true,
        integrationId: data.id,
        needsSelection: data.external_account_id === 'PENDING_SELECTION',
        accountName: data.metadata?.account_name || null // Retornar nome salvo
    });
}
