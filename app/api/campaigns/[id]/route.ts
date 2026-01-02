import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleSupabaseError } from '@/lib/supabase/client';

// PATCH /api/campaigns/[id] - Atualizar campanha
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id } = await params;
        const body = await request.json();
        const { current_spend, observations, campaign_type, channel, meta_percentage, budget } = body;

        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        // Campos editáveis
        if (current_spend !== undefined) updateData.current_spend = current_spend;
        if (observations !== undefined) updateData.observations = observations;
        if (campaign_type !== undefined) updateData.campaign_type = campaign_type;
        if (channel !== undefined) updateData.channel = channel;
        if (budget !== undefined) updateData.budget = budget;

        // NOVO: Permitir editar meta_percentage
        if (meta_percentage !== undefined) {
            // Validação: Meta deve estar entre 0 e 100
            if (meta_percentage < 0 || meta_percentage > 100) {
                return NextResponse.json(
                    { success: false, error: 'Meta deve estar entre 0% e 100%' },
                    { status: 400 }
                );
            }
            updateData.meta_percentage = meta_percentage;
        }

        const { data, error } = await supabase
            .from('campaigns')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return NextResponse.json(handleSupabaseError(error), { status: 500 });

        // Atualizar timestamp do cliente
        if (data) {
            await supabase
                .from('clients')
                .update({ last_updated_at: new Date().toISOString() })
                .eq('id', data.client_id);
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PATCH /api/campaigns/[id] error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar campanha' },
            { status: 500 }
        );
    }
}

// DELETE /api/campaigns/[id] - Deletar campanha (e campanhas vinculadas)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id } = await params;
        const { data: campaign, error: fetchError } = await supabase
            .from('campaigns')
            .select('*, client_id')
            .eq('id', id)
            .single();

        if (fetchError) return NextResponse.json(handleSupabaseError(fetchError), { status: 500 });

        if (!campaign) {
            return NextResponse.json(
                { success: false, error: 'Campanha não encontrada' },
                { status: 404 }
            );
        }

        if (campaign.is_multi_month) {
            const { error: childError } = await supabase
                .from('campaigns')
                .delete()
                .eq('parent_campaign_id', campaign.parent_campaign_id || id);

            if (childError) return NextResponse.json(handleSupabaseError(childError), { status: 500 });

            const { error: parentError } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', campaign.parent_campaign_id || id);

            if (parentError) return NextResponse.json(handleSupabaseError(parentError), { status: 500 });
        } else {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (error) return NextResponse.json(handleSupabaseError(error), { status: 500 });
        }

        await supabase
            .from('clients')
            .update({ last_updated_at: new Date().toISOString() })
            .eq('id', campaign.client_id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/campaigns/[id] error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao deletar campanha' },
            { status: 500 }
        );
    }
}
