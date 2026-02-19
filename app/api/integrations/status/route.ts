import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const provider = searchParams.get('provider'); // 'google' | 'meta'

    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 });

    const { data, error } = await supabase
        .from('integrations')
        .select('id, created_at, updated_at, external_account_id, metadata, refresh_token')
        .eq('client_id', clientId)
        .eq('provider', provider)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
        return NextResponse.json({ connected: false });
    }

    // Special validation for pending Google integrations
    // If we have a pending connection that is invalid (e.g. user revoked access or flow interrupted),
    // we should clean it up so the user can start fresh.
    if (provider === 'google' && data.external_account_id === 'PENDING_SELECTION') {
        // If refresh_token is missing, it's an invalid state for offline access - CLEAN IT UP
        if (!data.refresh_token) {
            console.warn('Pending Google integration missing refresh_token, cleaning up.');
            await supabase.from('integrations').delete().eq('id', data.id);
            return NextResponse.json({ connected: false });
        }

        try {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            oauth2Client.setCredentials({ refresh_token: data.refresh_token });

            // Attempt to get a fresh access token to verify the grant is still valid
            await oauth2Client.getAccessToken();
        } catch (authError) {
            console.warn('Invalid pending Google integration detected, cleaning up:', authError);

            // Delete the invalid integration
            await supabase
                .from('integrations')
                .delete()
                .eq('id', data.id);

            return NextResponse.json({ connected: false });
        }
    }

    return NextResponse.json({
        connected: true,
        integrationId: data.id,
        needsSelection: data.external_account_id === 'PENDING_SELECTION',
        accountName: data.metadata?.account_name || null // Retornar nome salvo
    });
}
