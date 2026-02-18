import { NextResponse } from 'next/server';

/**
 * Rota para iniciar a autenticação OAuth2 com a Meta (Facebook Ads).
 * O usuário será redirecionado para a página de consentimento da Meta.
 * 
 * Uso: /api/integrations/facebook/auth?clientId=123-abc-456
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const internalClientId = searchParams.get('clientId');

    if (!internalClientId) {
        return NextResponse.json(
            { error: 'Você precisa informar o clientId do sistema (ex: ?clientId=xyz)' },
            { status: 400 }
        );
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    const state = internalClientId;

    if (!appId || !redirectUri) {
        return NextResponse.json(
            { error: 'Configurações de ambiente do Facebook ausentes (App ID ou Redirect URI).' },
            { status: 500 }
        );
    }

    // Permissões solicitadas
    // ads_read: Ver dados de anúncios e campanhas
    // read_insights: (Opcional, mas útil) Ver métricas de desempenho
    // ads_management: Necessário se fossemos editar campanhas (cuidado ao pedir se não for usar)
    // Se o app pedir, use 'ads_read,read_insights'
    const scope = 'ads_read,read_insights';

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;

    return NextResponse.redirect(authUrl);
}
