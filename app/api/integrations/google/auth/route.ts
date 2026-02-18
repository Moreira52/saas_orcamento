import { google } from 'googleapis';
import { NextResponse } from 'next/server';

/**
 * Rota para iniciar a autenticação OAuth2 com o Google Ads.
 * O usuário será redirecionado para a página de consentimento do Google.
 * 
 * Uso: /api/integrations/google/auth?clientId=123-abc-456
 */
export async function GET(request: Request) {
    // 1. Pegamos o ID do cliente (da nossa base) que queremos conectar
    // Passaremos isso via 'state' para não perder essa informação na volta
    const { searchParams } = new URL(request.url);
    const internalClientId = searchParams.get('clientId');

    if (!internalClientId) {
        return NextResponse.json(
            { error: 'Você precisa informar o clientId do sistema (ex: ?clientId=xyz)' },
            { status: 400 }
        );
    }

    // 2. Configuração do cliente OAuth2
    // Essas chaves devem estar no seu arquivo .env.local
    // Debug: Verificando se as variáveis estão carregadas
    console.log('--- DEBUG GOOGLE AUTH ---');
    console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Carregado (Começa com ' + process.env.GOOGLE_CLIENT_ID.substring(0, 5) + '...)' : 'MISSING/UNDEFINED');
    console.log('REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
    console.log('-------------------------');

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI // Deve ser algo como http://localhost:3000/api/integrations/google/callback
    );

    // 3. Definição dos Escopos
    // O que estamos pedindo permissão para fazer?
    const scopes = [
        'https://www.googleapis.com/auth/adwords' // Permissão para gerenciar campanhas no Google Ads
    ];

    // 4. Gerar a URL de Autorização
    const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'offline' é OBRIGATÓRIO para recebermos o Refresh Token (acesso contínuo)
        access_type: 'offline',
        // Nossos escopos definidos acima
        scope: scopes,
        // Força o Google a mostrar a tela de consentimento de novo (útil para garantir que recebemos o refresh token)
        prompt: 'consent',
        // Passamos o ID do nosso cliente no estado para recuperar depois
        state: internalClientId
    });

    // 5. Redirecionar o usuário para o Google
    return NextResponse.redirect(authorizationUrl);
}
