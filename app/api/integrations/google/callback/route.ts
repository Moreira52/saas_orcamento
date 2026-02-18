import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Endpoint de retorno do OAuth2 do Google.
 * Recebe o CODE, troca por Tokens e salva no Supabase.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const clientId = searchParams.get('state'); // Esse é nosso client_id interno
    const error = searchParams.get('error');

    // 1. Validações básicas
    if (error) {
        return NextResponse.json({ error: `Erro do Google: ${error}` }, { status: 400 });
    }

    if (!code || !clientId) {
        return NextResponse.json({ error: 'Faltando código ou identificador do cliente.' }, { status: 400 });
    }

    try {
        // 2. Configurar o Cliente OAuth (mesma config da ida)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // 3. A Grande Troca: Code -> Tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Opcional: configurar as credenciais no cliente para validar se funcionou
        oauth2Client.setCredentials(tokens);

        // 4. Inicializar Supabase (Admin Mode para poder escrever na tabela de qualquer um)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 5. Salvar no Banco
        /* 
           IMPORTANTE: Aqui estamos assumindo que o Customer ID é "PENDENTE".
           Em um fluxo real completo, você redirecionaria o usuário para uma tela
           onde ele listaria as contas do Google Ads e escolheria uma.
           
           Por enquanto, vamos salvar com 'PENDING_SELECTION' para não quebrar o fluxo.
        */

        const { data, error: dbError } = await supabase
            .from('integrations')
            .upsert({
                client_id: clientId,
                provider: 'google',
                refresh_token: tokens.refresh_token, // Guarde isso com a vida!
                access_token: tokens.access_token,
                external_account_id: 'PENDING_SELECTION', // Placeholder
                metadata: {
                    scope: tokens.scope,
                    expiry_date: tokens.expiry_date
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'client_id, provider' })
            .select();

        if (dbError) {
            console.error('Erro ao salvar no Supabase:', dbError);
            return NextResponse.json({ error: 'Falha ao salvar integração no banco.' }, { status: 500 });
        }

        // 6. Sucesso!
        // 6. Redirecionar para página de sucesso (Popup)
        const redirectUrl = new URL('/integrations/google/success', request.url);
        return NextResponse.redirect(redirectUrl);
    } catch (err: any) {
        console.error('Erro na troca de tokens:', err);
        return NextResponse.json({ error: 'Falha na autenticação com Google.', details: err.message }, { status: 500 });
    }
}
