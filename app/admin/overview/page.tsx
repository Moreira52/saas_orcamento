'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import MonthYearPicker from '@/components/ui/month-year-picker';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCampaignCalculations } from '@/lib/hooks/use-campaign-calculations';
import { startOfMonth, endOfMonth, format, isSameMonth } from 'date-fns';
import { User, Client, Campaign } from '@/types/database';

interface AnalystWithClients {
    analyst: User;
    clients: Client[];
    squadName?: string;
}

export default function AdminOverviewPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [analystsData, setAnalystsData] = useState<AnalystWithClients[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        checkSessionAndFetchData();
    }, [selectedMonth]);

    const checkSessionAndFetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        // Check if admin
        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (userData?.role !== 'admin') {
            router.push('/'); // Redirect unauthorized
            return;
        }

        await fetchData(selectedMonth);
        setLoading(false);
    };

    const fetchData = async (monthStr: string) => {
        try {
            // 1. Fetch Analysts and Admins (anyone who might have clients)
            const { data: analysts } = await supabase
                .from('users')
                .select('*')
                .in('role', ['analyst', 'admin'])
                .neq('is_active', false)
                .order('name');

            if (!analysts) return;

            // 2. Fetch Clients
            const { data: clients } = await supabase
                .from('clients')
                .select('*')
                .is('deleted_at', null)
                .order('name');

            if (!clients) return;

            // 2.5 Fetch Squads
            const { data: squads } = await supabase
                .from('squads')
                .select('id, name');

            // 3. Bind Clients to Analysts
            const grouped: AnalystWithClients[] = analysts.map(analyst => {
                const squad = squads?.find(s => s.id === analyst.squad_id);
                return {
                    analyst,
                    clients: clients.filter(c => c.analyst_id === analyst.id),
                    squadName: squad ? squad.name : 'Sem Squad'
                };
            });

            // Filter out analysts with no clients if user desires, or keep them. 
            // Keeping them is better for visibility (Analyst with 0 clients).
            setAnalystsData(grouped);

            // 4. Fetch Campaigns for the selected month to calculate stats
            // We need campaigns that match the month_year
            const { data: monthCampaigns } = await supabase
                .from('campaigns')
                .select('*')
                .eq('month_year', monthStr);

            setCampaigns(monthCampaigns || []);

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-bg-light dark:bg-bg-light text-text-primary-light">
            {/* Header */}
            <header className="px-6 py-4 border-b border-border-light bg-card-light sticky top-0 z-50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold uppercase tracking-wide">Visão Geral Admin</h1>
                        <p className="text-xs text-text-muted-light">Relatório de performance por analista</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />
                    <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                        <LayoutDashboard className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-[1600px] mx-auto">
                <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold text-text-primary-light border-b border-border-light pb-2">
                        Visão por analista
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <span className="loading loading-spinner text-text-primary-light">Carregando dados...</span>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {analystsData.map(({ analyst, clients, squadName }) => (
                            <div key={analyst.id} className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-element-light flex items-center justify-center text-xs font-bold border border-border-light text-text-muted-light">
                                        {analyst.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <h3 className="text-lg font-bold text-text-primary-light flex items-center gap-2">
                                        {analyst.name}
                                        <span className="text-sm font-normal text-text-muted-light">
                                            | {squadName}
                                        </span>
                                    </h3>
                                    <Badge variant="outline" className="bg-element-light text-text-muted-light border-border-light">
                                        {clients.length} Clientes
                                    </Badge>
                                </div>

                                {clients.length === 0 ? (
                                    <div className="p-4 rounded-xl border border-dashed border-border-light text-text-muted-light text-sm italic">
                                        Nenhum cliente vinculado a este analista.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {clients.map(client => (
                                            <ClientOverviewCard
                                                key={client.id}
                                                client={client}
                                                campaigns={campaigns.filter(c => c.client_id === client.id)}
                                                selectedMonth={selectedMonth}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function ClientOverviewCard({ client, campaigns, selectedMonth }: { client: Client, campaigns: Campaign[], selectedMonth: string }) {
    // Calculate global stats for this client in this month
    const totalBudget = campaigns.reduce((acc, curr) => acc + (curr.budget || 0), 0);
    const totalSpend = campaigns.reduce((acc, curr) => acc + (curr.current_spend || 0), 0);

    // Calculate pace logic
    // We assume the date range is the full selected month
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    // We reuse the hook logic by creating a "dummy" single campaign representing the total
    // Note: metaPercentage default 100 for global view
    const calcs = useCampaignCalculations(
        totalBudget,
        100, // Meta 100%
        startDate,
        endDate,
        totalSpend
    );

    // Determine Pace label and color
    // "Dentro do pace ideal" (Green), "Próximo" (Yellow), "Fora" (Red)
    // Using calcs.spentBadgeColor logic? Or the explicitly requested logic?
    // Request: "Dentro do pace ideal" (Green), "próximo" (Yellow), "fora" (Red).
    // Let's use the 'diffIndex' logic from the hook manually or interpret 'spentBadgeColor'.
    // The hook uses: 
    // Green: diffIndex >= -3 (Technically >= -3 is OK/Good, > 1.5 is overspending?)
    // Actually the hook says:
    // > 1.5 or < -5 => Red (Bad)
    // >= -5 and < -3 => Yellow (Warning)
    // Else => Green (Good)

    // Let's map this to the requested text.
    let paceText = "Dentro do pace ideal";
    let paceColorClass = "text-green-600 bg-green-500/10 border-green-500/20";

    // Calculate diff the same way the hook does
    const diffIndex = calcs.percentRealSpent - calcs.percentTime;

    if (totalBudget === 0) {
        paceText = "Sem Orçamento";
        paceColorClass = "text-text-muted-light bg-element-light border-border-light";
    } else {
        if (diffIndex > 5 || diffIndex < -10) { // Widened tolerances slightly for "Fora"
            paceText = "Fora do pace ideal";
            paceColorClass = "text-red-600 bg-red-500/10 border-red-500/20";
        } else if ((diffIndex >= -10 && diffIndex < -5) || (diffIndex > 2 && diffIndex <= 5)) {
            paceText = "Próximo do pace ideal";
            paceColorClass = "text-yellow-600 bg-yellow-500/10 border-yellow-500/20";
        } else {
            paceText = "Dentro do pace ideal";
            paceColorClass = "text-green-600 bg-green-500/10 border-green-500/20";
        }
    }


    return (
        <Card className="hover:shadow-lg transition-all border-border-light bg-card-light dark:bg-card-light">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-text-primary-light uppercase truncate" title={client.name}>
                    {client.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted-light uppercase tracking-wider">Investimento</p>
                    <p className="text-xl font-bold text-text-primary-light">
                        {formatCurrency(totalBudget)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-[10px] font-bold text-text-muted-light uppercase tracking-wider">Utilizado</p>
                        <p className="text-sm font-semibold text-text-primary-light">{formatCurrency(totalSpend)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-text-muted-light uppercase tracking-wider">% Utilizado</p>
                        <p className={`text-sm font-semibold ${calcs.percentRealSpent > 100 ? 'text-red-500' : 'text-text-primary-light'}`}>
                            {formatPercentage(calcs.percentRealSpent)}
                        </p>
                    </div>
                </div>

                <div className={`text-center py-2 rounded-lg border font-medium text-xs uppercase tracking-wide ${paceColorClass}`}>
                    {paceText}
                </div>
            </CardContent>
        </Card>
    );
}
