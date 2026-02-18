import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error } = await supabase
            .from('integrations')
            .delete()
            .match({ client_id: clientId, provider: 'facebook' });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error disconnecting Meta Ads:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
