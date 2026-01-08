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
import Image from 'next/image';
import { Bell, UserPlus, FileText } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const [currentUser, setCurrentUser] = useState<any>(null);
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

        setCurrentUser(userData);
        await fetchData(selectedMonth);
        setLoading(false);
    };

    const fetchData = async (monthStr: string) => {
        try {
            // 1. Fetch Analysts only (anyone who might have clients)
            const { data: analysts } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'analyst')
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
            {/* Header - Dashboard Style */}
            <header className="sticky top-0 z-30 py-4 px-6 bg-card-light/90 backdrop-blur-sm border-b border-border-light shadow-sm">
                <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">

                    {/* LEFT: Identity */}
                    <div className="flex items-center gap-6">
                        {/* Logo - Acts as Home/Back */}
                        <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => router.push('/')}>
                            <div className="w-10 h-10 bg-text-primary-light rounded-xl flex items-center justify-center text-white shadow-md">
                                <LayoutDashboard className="h-6 w-6" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-text-primary-light uppercase hidden xl:block">Budget Box</h1>
                        </div>
                        <div className="h-8 w-px bg-border-light hidden md:block"></div>
                        <h2 className="text-base font-semibold text-text-muted-light hidden md:block">Visão Geral Admin</h2>
                    </div>

                    {/* RIGHT: Controls & User */}
                    <div className="flex items-center gap-6">
                        <MonthYearPicker
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            className="h-11 w-auto px-4 rounded-full border border-border-light bg-card-light text-text-primary-light font-medium hover:bg-card-hover-light focus:ring-accent-primary transition-all shadow-sm cursor-pointer"
                        />

                        {/* Divider */}
                        <div className="h-8 w-px bg-border-light hidden sm:block"></div>

                        {/* System & Profile */}
                        <div className="flex items-center gap-4">
                            <button className="w-11 h-11 rounded-full bg-card-light border border-border-light flex items-center justify-center text-text-muted-light hover:text-text-primary-light hover:bg-card-hover-light transition-colors shadow-sm relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-3 right-3 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full hover:bg-card-hover-light transition-colors outline-none group">
                                        <div className="text-right hidden md:block pr-3">
                                            <p className="text-sm font-bold text-text-primary-light group-hover:text-text-primary-light transition-colors leading-tight whitespace-nowrap">
                                                {currentUser?.name || 'Usuário'}
                                            </p>
                                            <p className="text-xs text-text-muted-light group-hover:text-text-primary-light transition-colors font-medium whitespace-nowrap">
                                                {currentUser?.role === 'admin' ? 'Admin' : 'Analista'}
                                            </p>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-0.5 shadow-sm group-hover:shadow-md transition-all">
                                            <div className="w-full h-full rounded-full overflow-hidden relative bg-card-light">
                                                {currentUser?.avatar_url ? (
                                                    <Image src={currentUser.avatar_url} alt="Profile" fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-card-hover-light">
                                                        {currentUser?.name
                                                            ? currentUser.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                                                            : 'U'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-card-light border border-border-light shadow-xl rounded-2xl p-2 mt-2">
                                    <DropdownMenuLabel className="font-normal px-2 py-2">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-bold leading-none text-text-primary-light">{currentUser?.name}</p>
                                            <p className="text-xs leading-none text-text-muted-light">{currentUser?.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-100 my-1" />

                                    <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 hover:bg-card-hover-light focus:bg-card-hover-light transition-colors text-text-primary-light" asChild>
                                        <a href="/profile" className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                <UserPlus className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">Meu Perfil</span>
                                        </a>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 hover:bg-card-hover-light focus:bg-card-hover-light transition-colors text-text-primary-light text-red-500 hover:text-red-600" onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}>
                                        <div className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                                            <LogOut className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium">Sair</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-[1600px] mx-auto">
                <div className="flex items-center gap-3 border-b border-border-light pb-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full hover:bg-card-light">
                        <ArrowLeft className="h-5 w-5 text-text-muted-light" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary-light uppercase">
                            Visão por analista
                        </h2>
                        <p className="text-sm text-text-muted-light">Relatório de performance detalhado por carteira</p>
                    </div>
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
    const router = useRouter(); // Use router for navigation

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
        <Card
            onClick={() => router.push(`/?client=${client.id}&month=${selectedMonth}`)}
            className="group cursor-pointer hover:shadow-xl hover:border-accent-primary hover:-translate-y-1 transition-all duration-300 border-border-light bg-card-light dark:bg-card-light"
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-text-primary-light uppercase truncate group-hover:text-accent-primary transition-colors" title={client.name}>
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
