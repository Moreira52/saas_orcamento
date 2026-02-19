import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseISO } from 'date-fns';

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { clientId, monthYear } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        console.log(`[Sync Meta Spend] Iniciando sincronização para Client: ${clientId}, Mês: ${monthYear || 'Atual'}`);

        // 1. Obter Integração Facebook
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('*')
            .eq('client_id', clientId)
            .eq('provider', 'meta')
            .single();

        if (integrationError || !integration || !integration.access_token) {
            return NextResponse.json({
                success: false,
                error: 'Integração Meta Ads não encontrada ou desconectada.'
            }, { status: 404 });
        }

        const accountId = integration.external_account_id;
        if (!accountId || accountId === 'PENDING_SELECTION') {
            return NextResponse.json({
                success: false,
                error: 'Conta de anúncios Meta não selecionada.'
            }, { status: 400 });
        }

        const accessToken = integration.access_token;

        // 2. Buscar campanhas locais elegíveis (ID ou REGRA ou CANAL)
        let campaignQuery = supabase
            .from('campaigns')
            .select('*')
            .eq('client_id', clientId)
            .eq('channel', 'meta_ads')
            .or('observations.ilike.%[META_ID:%,observations.ilike.%[META_RULE:%');

        if (monthYear) {
            campaignQuery = campaignQuery.eq('month_year', monthYear);
        }

        const { data: campaigns, error: campaignsError } = await campaignQuery;

        if (campaignsError) {
            console.error('Erro ao buscar campanhas locais:', campaignsError);
            return NextResponse.json({ error: 'Erro ao buscar campanhas locais' }, { status: 500 });
        }

        if (!campaigns || campaigns.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Nenhuma campanha Meta vinculada encontrada para este período.'
            });
        }

        // 3. Definir intervalo de datas global para a busca na API
        let minDate = '9999-12-31';
        let maxDate = '0000-01-01';

        for (const camp of campaigns) {
            if (camp.start_date < minDate) minDate = camp.start_date;
            if (camp.end_date > maxDate) maxDate = camp.end_date;
        }

        if (minDate > maxDate) {
            minDate = new Date().toISOString().slice(0, 10);
            maxDate = minDate;
        }

        // 4. Buscar Insights da Conta de Anúncios (Marketing API)
        // Nível: campaign
        // Fields: campaign_id, campaign_name, spend, date_start, date_stop
        // Filtrando por time_range

        console.log(`[Sync Meta Spend] Buscando dados da conta ${accountId} entre ${minDate} e ${maxDate}`);

        const url = `https://graph.facebook.com/v19.0/${accountId}/insights?` +
            `level=campaign` +
            `&fields=campaign_id,campaign_name,spend,date_start,date_stop` +
            `&time_range={'since':'${minDate}','until':'${maxDate}'}` +
            `&time_increment=1` + // Retorna dados diários para podermos filtrar corretamente por data da campanha
            `&limit=1000` +
            `&access_token=${accessToken}`;

        const response = await fetch(url);
        const fbData = await response.json();

        if (fbData.error) {
            console.error('Erro Meta Marketing API:', fbData.error);
            throw new Error(`Erro na API do Meta: ${fbData.error.message}`);
        }

        const fbRows = fbData.data || [];
        console.log(`[Sync Meta Spend] Total de registros retornados do Meta: ${fbRows.length}`);

        // 5. Build Unique Campaigns Map (para regras de nome)
        const uniqueCampaigns = new Map<string, { id: string, name: string }>();
        for (const row of fbRows) {
            const idStr = String(row.campaign_id);
            if (!uniqueCampaigns.has(idStr)) {
                uniqueCampaigns.set(idStr, {
                    id: idStr,
                    name: row.campaign_name
                });
            }
        }

        // 6. Processar Campanhas Locais
        const updates = [];
        let updatedCount = 0;

        // Data de corte para não sobrescrever dados parciais de "hoje" (opcional, igual ao Google)
        const today = new Date();
        const todayString = today.toISOString().slice(0, 10);

        for (const camp of campaigns) {
            let matchingIds = new Set<string>();
            const obs = camp.observations || '';
            const ruleMatch = obs.match(/\[META_RULE:([^\]]+)\]/);

            // A. Regras (Nome, ID, etc)
            if (ruleMatch && ruleMatch[1]) {
                try {
                    const json = Buffer.from(ruleMatch[1], 'base64').toString('utf-8');
                    const parsed = JSON.parse(json);
                    const rules = parsed.rules || [];

                    for (const [mId, mCamp] of uniqueCampaigns.entries()) {
                        const matches = rules.every((rule: any) => {
                            if (!rule.value) return true;
                            const val = rule.value.toLowerCase();
                            const field = rule.field === 'id' ? 'id' : 'name'; // Meta basicamente usa id ou name aqui
                            const targetVal = String(mCamp[field as keyof typeof mCamp] || '').toLowerCase();

                            switch (rule.operator) {
                                case 'contains': return targetVal.includes(val);
                                case 'equals': return targetVal === val;
                                case 'not_contains': return !targetVal.includes(val);
                                case 'starts_with': return targetVal.startsWith(val);
                                default: return true;
                            }
                        });

                        if (matches) matchingIds.add(mId);
                    }
                } catch (e) {
                    console.error(`Erro ao processar regra Meta para campanha ${camp.id}`, e);
                }
            }

            // B. ID Direto
            const idMatches = obs.match(/\[META_ID:(\d+)\]/g);
            if (idMatches) {
                idMatches.forEach((m: string) => {
                    const id = m.match(/\d+/)?.[0];
                    if (id) matchingIds.add(id);
                });
            }

            if (matchingIds.size === 0) continue;

            // C. Calcular Custo Total para os IDs encontrados
            let totalSpend = 0;
            const start = parseISO(camp.start_date);
            const end = parseISO(camp.end_date);

            for (const row of fbRows) {
                const rowId = String(row.campaign_id);
                if (matchingIds.has(rowId)) {
                    // row.date_start e row.date_stop sáo iguais quando time_increment=1
                    const apiDateStr = row.date_start;

                    // Ignorar dados futuros ou de hoje (se quiser consistência D-1)
                    if (apiDateStr >= todayString) continue;

                    const rowDate = parseISO(apiDateStr);
                    if (rowDate >= start && rowDate <= end) {
                        const cost = parseFloat(row.spend || '0');
                        totalSpend += cost;
                    }
                }
            }

            // Atualizar Banco se houve mudança > 0.01
            totalSpend = Math.round(totalSpend * 100) / 100;

            // Log debug para ajudar usuário
            if (ruleMatch) {
                console.log(`[DEBUG META] Campanha: ${camp.campaign_type} | IDs: ${Array.from(matchingIds).join(',')} | Total: ${totalSpend}`);
            }

            if (Math.abs(camp.current_spend - totalSpend) > 0.01) {
                updates.push(
                    supabase
                        .from('campaigns')
                        .update({
                            current_spend: totalSpend,
                            updated_at: new Date().toISOString(),
                            last_update_type: 'api'
                        })
                        .eq('id', camp.id)
                );
                updatedCount++;
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
        }

        return NextResponse.json({
            success: true,
            updatedCount: updatedCount,
            message: `Sincronização Meta concluída. ${updatedCount} campanhas atualizadas.`
        });

    } catch (error: any) {
        console.error('Erro Sync Meta Spend:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
