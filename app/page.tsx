'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client'; // CLIENT Side
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MonthYearPicker from '@/components/ui/month-year-picker';
import CampaignsTable from '@/components/tables/campaigns-table';
import { Client, Campaign } from '@/types/database';
import { Plus, Clock, X, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useCampaignCalculations } from '@/lib/hooks/use-campaign-calculations';
import NewClientModal from '@/components/modals/new-client-modal';
import EditClientModal from '@/components/modals/edit-client-modal';
import NewCampaignModal from '@/components/modals/new-campaign-modal';
import DeleteClientModal from '@/components/modals/delete-client-modal';
import { Toaster } from '@/components/ui/sonner';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { startOfMonth, endOfMonth, differenceInDays, isPast, isFuture } from 'date-fns';
import StitchDashboard from '@/components/dashboard/stitch-dashboard';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'analyst' | 'pm' | null>(null);

  // States for Admin Filter
  const [analysts, setAnalysts] = useState<any[]>([]);
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>('all');

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const queryClient = useQueryClient();

  // 1. Check Session on Mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch User Role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const role = userData?.role || 'analyst';
      setUserRole(role);

      // If Admin/PM, fetch analysts list for filter
      if (role === 'admin' || role === 'pm') {
        fetchAnalysts();
      }

      setSessionLoading(false);
    };

    checkSession();
  }, [router]);

  const fetchAnalysts = async () => {
    try {
      const res = await fetch('/api/users/analysts');
      const json = await res.json();
      if (json.success) {
        setAnalysts(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch analysts", e);
    }
  }

  // Buscar clientes (Modified to include analyst_id filter)
  const { data: clientsData, isLoading: loadingClients } = useQuery({
    queryKey: ['clients', selectedAnalystId], // Refetch when filter changes
    queryFn: async () => {
      let url = '/api/clients';
      if (selectedAnalystId && selectedAnalystId !== 'all') {
        url += `?analyst_id=${selectedAnalystId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao buscar clientes');
      return res.json();
    },
    enabled: !sessionLoading, // Only fetch after session check
  });

  const clients: Client[] = clientsData?.data || [];
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    if ((!activeClientId || !clients.find(c => c.id === activeClientId)) && clients.length > 0) {
      setActiveClientId(clients[0].id);
    } else if (clients.length === 0) {
      setActiveClientId(null);
    }
  }, [clients, activeClientId]);

  // Buscar campanhas do cliente ativo
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns', activeClientId, selectedMonth],
    queryFn: async () => {
      if (!activeClientId) return { data: [] };
      const res = await fetch(
        `/api/campaigns?client_id=${activeClientId}&month_year=${selectedMonth}`
      );
      if (!res.ok) throw new Error('Erro ao buscar campanhas');
      return res.json();
    },
    enabled: !!activeClientId,
  });

  const campaigns: Campaign[] = campaignsData?.data || [];

  // Mutation para atualizar campanha
  const updateCampaign = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar campanha');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  // Mutation para deletar campanha
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao deletar campanha');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Mutation para deletar cliente
  const deleteClient = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao deletar cliente');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setActiveClientId(null);
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Calcular linha TOTAL
  const totals = campaigns.reduce(
    (acc, campaign) => {
      const calc = useCampaignCalculations(
        campaign.budget,
        campaign.meta_percentage,
        campaign.start_date,
        campaign.end_date,
        campaign.current_spend
      );

      return {
        budget: acc.budget + campaign.budget,
        parcial97: acc.parcial97 + calc.parcial97,
        currentSpend: acc.currentSpend + campaign.current_spend,
        parcial100: acc.parcial100 + calc.parcial100,
        investDia97: acc.investDia97 + calc.investDia97,
        investDia100: acc.investDia100 + calc.investDia100,
      };
    },
    {
      budget: 0,
      parcial97: 0,
      currentSpend: 0,
      parcial100: 0,
      investDia97: 0,
      investDia100: 0,
    }
  );

  // Calcular progresso do mês
  const [year, month] = selectedMonth.split('-').map(Number);
  const startOfSelectedMonth = new Date(year, month - 1, 1);
  const endOfSelectedMonth = new Date(year, month, 0); // Último dia do mês
  const today = new Date();

  let monthProgress = 0;
  if (isPast(endOfSelectedMonth)) {
    monthProgress = 100;
  } else if (isFuture(startOfSelectedMonth)) {
    monthProgress = 0;
  } else {
    const totalDays = differenceInDays(endOfSelectedMonth, startOfSelectedMonth) + 1;
    const daysPassed = differenceInDays(today, startOfSelectedMonth) + 1;
    monthProgress = (daysPassed / totalDays) * 100;
  }

  const percentMetaTotal = totals.parcial97 > 0
    ? (totals.currentSpend / totals.parcial97) * 100
    : 0;

  const activeClient = clients.find((c) => c.id === activeClientId);

  if (sessionLoading || loadingClients) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // If no clients, but we are loaded, we might still want to show dashboard frame if admin?
  // Or just empty state.
  if (clients.length === 0 && !loadingClients) {
    // Even if 0 clients, better to show something wrapped in a Layout or Navbar so they can logout/add
  }



  return (
    <>
      <StitchDashboard
        clients={clients}
        activeClientId={activeClientId}
        setActiveClientId={setActiveClientId}
        campaigns={campaigns}
        totals={totals}
        monthProgress={monthProgress}
        percentMetaTotal={percentMetaTotal}
        onNewCampaign={() => setShowNewCampaignModal(true)}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onNewClient={() => setShowNewClientModal(true)}
        onUpdateCampaign={async (id, data) => {
          await updateCampaign.mutateAsync({ id, data });
        }}
        onDeleteCampaign={async (id) => {
          await deleteCampaign.mutateAsync(id);
        }}
        onDeleteClient={(client) => {
          setClientToDelete(client);
          setShowDeleteClientModal(true);
        }}
        onEditClient={(client) => {
          setClientToEdit(client);
          setShowEditClientModal(true);
        }}
        // Admin Props
        userRole={userRole}
        analysts={analysts}
        selectedAnalystId={selectedAnalystId}
        onSelectAnalyst={setSelectedAnalystId}
        onLogout={handleLogout}
      />

      <NewClientModal
        open={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
      />

      {clientToEdit && (
        <EditClientModal
          open={showEditClientModal}
          onClose={() => {
            setShowEditClientModal(false);
            setClientToEdit(null);
          }}
          client={clientToEdit}
        />
      )}

      {activeClientId && (
        <NewCampaignModal
          open={showNewCampaignModal}
          onClose={() => setShowNewCampaignModal(false)}
          clientId={activeClientId}
        />
      )}

      <DeleteClientModal
        open={showDeleteClientModal}
        onClose={() => {
          setShowDeleteClientModal(false);
          setClientToDelete(null);
        }}
        client={clientToDelete}
        onConfirm={async (clientId) => {
          await deleteClient.mutateAsync(clientId);
        }}
      />
      <Toaster />
    </>
  );
}
