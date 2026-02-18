import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { parseISO } from 'date-fns';

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { clientId, monthYear } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        console.log(`[Sync Spend] Iniciando sincronização para Client: ${clientId}, Mês: ${monthYear || 'Atual'}`);

        // 1. Obter Integração Google
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('*')
            .eq('client_id', clientId)
            .eq('provider', 'google')
            .single();

        if (integrationError || !integration || !integration.refresh_token) {
            return NextResponse.json({
                success: false,
                error: 'Integração Google Ads não encontrada ou desconectada.'
            }, { status: 404 });
        }

        const customerId = integration.external_account_id;
        if (!customerId || customerId === 'PENDING_SELECTION') {
            return NextResponse.json({
                success: false,
                error: 'Conta de anúncios não selecionada.'
            }, { status: 400 });
        }

        // 2. Buscar campanhas locais elegíveis (ID ou REGRA)
        let campaignQuery = supabase
            .from('campaigns')
            .select('*')
            .eq('client_id', clientId)
            .eq('channel', 'google_ads')
            .or('observations.ilike.%[GOOGLE_ID:%,observations.ilike.%[GOOGLE_RULE:%');

        if (monthYear) {
            campaignQuery = campaignQuery.eq('month_year', monthYear);
        }

        const { data: campaigns, error: campaignsError } = await campaignQuery;

        if (campaignsError) {
            console.error('Erro ao buscar campanhas:', campaignsError);
            return NextResponse.json({ error: 'Erro ao buscar campanhas locais' }, { status: 500 });
        }

        if (!campaigns || campaigns.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Nenhuma campanha vinculada encontrada para este período.'
            });
        }

        // 3. Preparar Google API
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({ refresh_token: integration.refresh_token });
        const { token } = await oauth2Client.getAccessToken();

        const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
        const loginCustomerId = integration.metadata?.login_customer_id;

        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
        };

        if (loginCustomerId) {
            headers['login-customer-id'] = loginCustomerId;
        }

        // 4. Buscar TODAS as campanhas do Google Ads no período
        let minDate = '9999-12-31';
        let maxDate = '0000-01-01';

        for (const camp of campaigns) {
            if (camp.start_date < minDate) minDate = camp.start_date;
            if (camp.end_date > maxDate) maxDate = camp.end_date;
        }

        if (minDate > maxDate) {
            // Fallback se algo der errado com datas
            minDate = new Date().toISOString().slice(0, 10);
            maxDate = minDate;
        }

        console.log(`[Sync Spend] Buscando dados globais do Google Ads entre ${minDate} e ${maxDate}`);

        // Fetch ALL data: campaign ID, Name, Status, Date, Cost
        const query = `
            SELECT 
                campaign.id, 
                campaign.name, 
                campaign.status,
                segments.date, 
                metrics.cost_micros 
            FROM campaign 
            WHERE 
                segments.date BETWEEN '${minDate}' AND '${maxDate}'
                AND campaign.status != 'REMOVED'
        `;

        const url = `https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`;

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Erro Google Ads API:', errText);
            throw new Error(`Erro na API do Google Ads: ${errText}`);
        }

        const resultData = await response.json();
        const googleRows = resultData.results || [];

        console.log(`[Sync Spend] Total de registros retornados do Google: ${googleRows.length}`);

        // Build Unique Campaigns Map (Global for this client/request)
        const uniqueCampaigns = new Map<string, { id: string, name: string, status: string }>();
        for (const row of googleRows) {
            const idStr = String(row.campaign.id);
            if (!uniqueCampaigns.has(idStr)) {
                uniqueCampaigns.set(idStr, {
                    id: idStr,
                    name: row.campaign.name,
                    status: row.campaign.status
                });
            }
        }

        // 5. Processar Local Campaigns
        const updates = [];
        let updatedCount = 0;

        for (const camp of campaigns) {
            let matchingCampaignIds = new Set<string>();

            const obs = camp.observations || '';
            const ruleMatch = obs.match(/\[GOOGLE_RULE:([^\]]+)\]/);

            if (ruleMatch && ruleMatch[1]) {
                // RULE BASED MATCHING
                try {
                    const json = Buffer.from(ruleMatch[1], 'base64').toString('utf-8');
                    const parsed = JSON.parse(json); // { rules: [...] }
                    const rules = parsed.rules || [];

                    for (const [gId, gCamp] of uniqueCampaigns.entries()) {
                        // Check Validation logic (AND logic for all rules)
                        const matches = rules.every((rule: any) => {
                            if (!rule.value) return true;
                            const val = rule.value.toLowerCase();
                            const field = rule.field === 'id' ? 'id' : rule.field;
                            const targetVal = String(gCamp[field as keyof typeof gCamp] || '').toLowerCase();

                            switch (rule.operator) {
                                case 'contains': return targetVal.includes(val);
                                case 'equals': return targetVal === val;
                                case 'not_contains': return !targetVal.includes(val);
                                case 'starts_with': return targetVal.startsWith(val);
                                default: return true;
                            }
                        });

                        if (matches) {
                            matchingCampaignIds.add(gId);
                        }
                    }

                } catch (e) {
                    console.error(`Erro ao processar regra para campanha ${camp.id}`, e);
                }
            }

            // ID BASED MATCHING - ALWAYS CHECK
            const idMatches = obs.match(/\[GOOGLE_ID:(\d+)\]/g);
            if (idMatches) {
                idMatches.forEach((m: string) => {
                    const id = m.match(/\d+/)?.[0];
                    if (id) matchingCampaignIds.add(id);
                });
            }

            if (matchingCampaignIds.size === 0) continue;

            // Calcular Custo para os IDs identificados
            let totalSpend = 0;
            const start = parseISO(camp.start_date);
            const end = parseISO(camp.end_date);

            // Define cutoff date: Exclude data from TODAY onwards to only count COMPLETED days.
            const today = new Date();
            const todayString = today.toISOString().slice(0, 10); // YYYY-MM-DD

            for (const row of googleRows) {
                const gId = String(row.campaign.id);
                if (matchingCampaignIds.has(gId)) {
                    const rowDateStr = row.segments.date;

                    // Skip if row data is from today or future
                    if (rowDateStr >= todayString) continue;

                    const rowDate = parseISO(rowDateStr);
                    if (rowDate >= start && rowDate <= end) {
                        const cost = Number(row.metrics.costMicros) / 1000000;
                        totalSpend += cost;
                    }
                }
            }

            // LOG DE DEBUG PARA ENCONTRAR DIFERENÇAS
            if (ruleMatch && ruleMatch[1]) {
                console.log(`[DEBUG RULE MATCH] Campanha Local: ${camp.campaign_type} | Total Calculado: ${totalSpend.toFixed(2)}`);
                console.log(`[DEBUG] IDs Google Vinculados: ${Array.from(matchingCampaignIds).join(', ')}`);

                // Detalhar custos por campanha do Google
                const breakdown: Record<string, number> = {};
                for (const row of googleRows) {
                    const gId = String(row.campaign.id);
                    if (matchingCampaignIds.has(gId)) {
                        const rowDateStr = row.segments.date;
                        if (rowDateStr >= todayString) continue;

                        const rowDate = parseISO(rowDateStr);
                        if (rowDate >= start && rowDate <= end) {
                            const cost = Number(row.metrics.costMicros) / 1000000;
                            breakdown[row.campaign.name] = (breakdown[row.campaign.name] || 0) + cost;
                        }
                    }
                }
                console.log('[DEBUG] Quebra de custos:', JSON.stringify(breakdown, null, 2));
            }

            totalSpend = Math.round(totalSpend * 100) / 100;

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
            message: `Sincronização concluída. ${updatedCount} campanhas atualizadas.`
        });

    } catch (error: any) {
        console.error('Erro Sync Spend:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
