import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { items } = body;

        if (!items || !Array.isArray(items)) {
            return NextResponse.json(
                { success: false, error: 'Lista de items inválida' },
                { status: 400 }
            );
        }

        // Prepare updates
        // Supabase upsert works if we provide primary keys.
        // We only want to update display_order.
        // However, upsert might require all non-null fields or default values if we are not careful,
        // but since the rows exist, it should update.
        // Better: items.map(item => upsert ...). No, too many requests.
        // Supabase/Postgrest doesn't have a bulk update for different values easily in one standard call unless using upsert.
        // We need to fetch current data to preserve other fields? No, upsert updates specified fields if ID matches.
        // BUT, if we upsert with just {id, display_order}, other fields might be set to null if not specified? 
        // No, `upsert` in Supabase (PostgreSQL) typically performs an INSERT ... ON CONFLICT UPDATE.
        // If we don't supply other fields, they might be nulled IF it was a new row (which it isn't).
        // Actually, upserting partial data: "For an update to take place, you must include the primary key... and you should include all required columns that don't have a default value."
        // That is risky.

        // Safer approach: use `rpc` if we had a stored procedure (we don't).
        // Or loop?
        // SQLite/Postgres limit is usually fine for < 100 items. 
        // Let's use Promise.all with updates. It's slower but safer without a custom function.

        const updates = items.map((item: { id: string; display_order: number }) =>
            supabase
                .from('clients')
                .update({ display_order: item.display_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ PUT /api/clients/reorder error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao reordenar clientes' },
            { status: 500 }
        );
    }
}
