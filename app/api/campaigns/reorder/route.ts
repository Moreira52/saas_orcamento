import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const { orderedIds } = await request.json();

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Atualiza a posição de cada campanha em lote ou sequencialmente
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('campaigns')
                .update({ position: index })
                .eq('id', id)
        );

        await Promise.all(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao reordenar campanhas:', error);
        return NextResponse.json({ error: 'Erro interno ao reordenar' }, { status: 500 });
    }
}
