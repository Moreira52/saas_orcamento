import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Endpoint de retorno do OAuth2 do Facebook/Meta.
 * Recebe o CODE, troca por Token (curta duração), troca por Long-Lived Token e salva no Supabase.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const clientId = searchParams.get('state'); // client_id interno
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `Erro do Facebook: ${error}` }, { status: 400 });
    }

    if (!code || !clientId) {
        return NextResponse.json({ error: 'Faltando código ou identificador do cliente.' }, { status: 400 });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
        return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    try {
        // 1. Trocar Code por Short-Lived Access Token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error.message);
        }

        const shortLivedToken = tokenData.access_token;

        // 2. Trocar Short-Lived Token por Long-Lived Access Token (60 dias)
        // Isso é crucial para serviços de servidor que rodam em background
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
        );
        const longLivedData = await longLivedResponse.json();

        if (longLivedData.error) {
            throw new Error(`Erro ao trocar por token de longa duração: ${longLivedData.error.message}`);
        }

        const longLivedToken = longLivedData.access_token;
        const expiresIn = longLivedData.expires_in; // Segundos

        // 3. Inicializar Supabase Admin
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 4. Salvar no Banco
        const { error: dbError } = await supabase
            .from('integrations')
            .upsert({
                client_id: clientId,
                provider: 'facebook',
                access_token: longLivedToken, // Meta usa apenas access_token (long-lived), não tem refresh_token padrão como Google
                refresh_token: null, // Não se aplica da mesma forma
                external_account_id: 'PENDING_SELECTION',
                metadata: {
                    expires_in: expiresIn,
                    token_type: 'long_lived'
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'client_id, provider' });

        if (dbError) {
            console.error('Erro ao salvar no Supabase:', dbError);
            return NextResponse.json({ error: 'Falha ao salvar integração no banco.' }, { status: 500 });
        }

        // 5. Redirecionar para página de sucesso via Client (fechar popup)
        // Podemos usar a mesma página de sucesso do Google se for genérica, ou criar uma nova.
        // Vamos assumir que a página de sucesso apenas fecha a janela.
        const redirectUrl = new URL('/integrations/success', request.url); // Rota genérica de sucesso
        return NextResponse.redirect(redirectUrl);

    } catch (err: any) {
        console.error('Erro na autenticação Meta:', err);
        return NextResponse.json({ error: 'Falha na autenticação com Meta.', details: err.message }, { status: 500 });
    }
}
