import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Join with users table to get the name of who changed it
        // Assuming public.users is where we keep profile info and it shares IDs with auth.users
        const { data, error } = await supabase
            .from('campaign_budget_logs')
            .select(`
                *,
                users (
                    name,
                    email
                )
            `)
            .eq('campaign_id', id)
            .order('changed_at', { ascending: false });

        if (error) return NextResponse.json(handleSupabaseError(error), { status: 500 });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET /api/campaigns/[id]/logs error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar logs' },
            { status: 500 }
        );
    }
}
