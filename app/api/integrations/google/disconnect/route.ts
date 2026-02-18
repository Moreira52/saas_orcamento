
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    try {
        const { clientId } = await request.json();

        if (!clientId) {
            return NextResponse.json({ error: 'Faltando clientId' }, { status: 400 });
        }

        const { error } = await supabase
            .from('integrations')
            .delete()
            .eq('client_id', clientId)
            .eq('provider', 'google');

        if (error) {
            console.error('Erro ao desconectar:', error);
            return NextResponse.json({ error: 'Erro ao remover integração.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
