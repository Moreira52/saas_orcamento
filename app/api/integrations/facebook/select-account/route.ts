import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, accountId } = body;

        if (!clientId || !accountId) {
            return NextResponse.json({ error: 'Missing clientId or accountId' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Atualiza a integração com a conta escolhida
        const { error } = await supabase
            .from('integrations')
            .update({
                external_account_id: accountId,
                updated_at: new Date().toISOString()
            })
            .match({ client_id: clientId, provider: 'facebook' });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error selecting Meta account:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
