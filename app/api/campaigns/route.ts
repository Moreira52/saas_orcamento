import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import { differenceInDays, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

// GET /api/campaigns?client_id=xxx&month_year=2025-11
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('client_id');
        const monthYear = searchParams.get('month_year');

        if (!clientId) {
            return NextResponse.json(
                { success: false, error: 'client_id é obrigatório' },
                { status: 400 }
            );
        }

        let query = supabase
            .from('campaigns')
            .select('*')
            .eq('client_id', clientId)
            .order('start_date', { ascending: true });

        if (monthYear) {
            query = query.eq('month_year', monthYear);
        }

        const { data, error } = await query;

        if (error) return NextResponse.json(handleSupabaseError(error), { status: 500 });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET /api/campaigns error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar campanhas' },
            { status: 500 }
        );
    }
}

// POST /api/campaigns - Criar campanha (com split automático multi-mês)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            client_id,
            channel,
            campaign_type,
            budget,
            meta_percentage = 97,
            start_date,
            end_date,
            current_spend = 0,
            observations,
        } = body;

        // Validações
        if (!client_id || !channel || !budget || !start_date || !end_date) {
            return NextResponse.json(
                { success: false, error: 'Campos obrigatórios faltando' },
                { status: 400 }
            );
        }

        const parseToLocalDate = (dateStr: string) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        if (parseToLocalDate(end_date) < parseToLocalDate(start_date)) {
            return NextResponse.json(
                { success: false, error: 'Data final deve ser >= data inicial' },
                { status: 400 }
            );
        }

        if (budget > 100000) {
            console.warn(`⚠️ Orçamento alto detectado: R$ ${budget}`);
        }

        // Verificar se campanha cruza meses
        const startMonth = format(parseToLocalDate(start_date), 'yyyy-MM');
        const endMonth = format(parseToLocalDate(end_date), 'yyyy-MM');
        const isMultiMonth = startMonth !== endMonth;

        if (!isMultiMonth) {
            // Campanha de 1 mês apenas
            const { data, error } = await supabase
                .from('campaigns')
                .insert([
                    {
                        client_id,
                        channel,
                        campaign_type,
                        budget,
                        meta_percentage,
                        start_date,
                        end_date,
                        current_spend,
                        observations,
                        is_multi_month: false,
                        month_year: startMonth,
                    },
                ])
                .select()
                .single();

            if (error) return NextResponse.json(handleSupabaseError(error), { status: 500 });

            await supabase
                .from('clients')
                .update({ last_updated_at: new Date().toISOString() })
                .eq('id', client_id);

            return NextResponse.json({ success: true, data }, { status: 201 });
        }

        // Campanha multi-mês: calcular proporções
        const totalDays = differenceInDays(parseToLocalDate(end_date), parseToLocalDate(start_date)) + 1;
        const months = eachMonthOfInterval({
            start: parseToLocalDate(start_date),
            end: parseToLocalDate(end_date),
        });

        const campaignsToInsert: any[] = [];
        let parentCampaignId: string | null = null;

        for (const month of months) {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            // Calcular período efetivo dentro do mês
            const effectiveStart = parseToLocalDate(start_date) > monthStart ? parseToLocalDate(start_date) : monthStart;
            const effectiveEnd = parseToLocalDate(end_date) < monthEnd ? parseToLocalDate(end_date) : monthEnd;
            const daysInMonth = differenceInDays(effectiveEnd, effectiveStart) + 1;

            // Calcular orçamento proporcional
            const proportionalBudget = (budget * daysInMonth) / totalDays;

            campaignsToInsert.push({
                client_id,
                channel,
                campaign_type,
                budget: proportionalBudget,
                meta_percentage,
                start_date: format(effectiveStart, 'yyyy-MM-dd'),
                end_date: format(effectiveEnd, 'yyyy-MM-dd'),
                current_spend: 0,
                observations,
                is_multi_month: true,
                month_year: format(month, 'yyyy-MM'),
                parent_campaign_id: parentCampaignId,
            });
        }

        // Inserir campanha principal primeiro (parent)
        const { data: parentCampaign, error: parentError } = await supabase
            .from('campaigns')
            .insert([campaignsToInsert[0]])
            .select()
            .single();

        if (parentError) return NextResponse.json(handleSupabaseError(parentError), { status: 500 });

        // Atualizar parent_id das demais
        parentCampaignId = parentCampaign.id;
        const childCampaigns = campaignsToInsert.slice(1).map((c) => ({
            ...c,
            parent_campaign_id: parentCampaignId,
        }));

        if (childCampaigns.length > 0) {
            const { error: childError } = await supabase
                .from('campaigns')
                .insert(childCampaigns);

            if (childError) return NextResponse.json(handleSupabaseError(childError), { status: 500 });
        }

        await supabase
            .from('clients')
            .update({ last_updated_at: new Date().toISOString() })
            .eq('id', client_id);

        return NextResponse.json(
            {
                success: true,
                message: `Campanha multi-mês criada: ${campaignsToInsert.length} parte(s)`,
                data: parentCampaign,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('POST /api/campaigns error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao criar campanha' },
            { status: 500 }
        );
    }
}
