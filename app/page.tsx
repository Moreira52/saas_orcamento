'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import GoogleAccountSelectorModal from '@/components/modals/google-account-selector-modal';
import ConnectingModal from '@/components/modals/connecting-modal';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionLoading, setSessionLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'analyst' | 'pm' | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: 'admin' | 'analyst' | 'pm'; avatar_url?: string | null } | null>(null);

  // States for Admin Filter
  const [analysts, setAnalysts] = useState<any[]>([]);
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>(() => {
    return searchParams.get('analyst') || 'all';
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth) return urlMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeClientId, setActiveClientId] = useState<string | null>(() => {
    return searchParams.get('client') || null;
  });

  const handleClientChange = (id: string) => {
    setActiveClientId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set('client', id);
    else params.delete('client');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Google Integration States
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [connectingClientId, setConnectingClientId] = useState<string | null>(null);
  const [foundIntegrationId, setFoundIntegrationId] = useState<string | null>(null);
  const [showGoogleAccountSelector, setShowGoogleAccountSelector] = useState(false);

  // Polling for Google Connection
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isConnectingGoogle && connectingClientId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/integrations/status?clientId=${connectingClientId}`);
          const json = await res.json();

          if (json.connected && json.integrationId) {
            // Conectou!
            setIsConnectingGoogle(false);
            setFoundIntegrationId(json.integrationId);
            setShowGoogleAccountSelector(true);
            toast.success('Autorização do Google recebida!');
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000); // Checa a cada 3 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    }
  }, [isConnectingGoogle, connectingClientId]);

  const handleConnectGoogle = (clientId: string) => {
    setConnectingClientId(clientId);
    setIsConnectingGoogle(true);

    // Abrir Popup
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      `/api/integrations/google/auth?clientId=${clientId}`,
      'Google Ads Connect',
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };


  const queryClient = useQueryClient();

  // 1. Check Session on Mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch User Role and Details
      const { data: userData } = await supabase
        .from('users')
        .select('name, email, role, avatar_url')
        .eq('id', session.user.id)
        .single();

      const role = userData?.role || 'analyst';
      const name = userData?.name || 'Usuário';
      const email = userData?.email || session.user.email || '';
      const avatar_url = userData?.avatar_url || null;

      setUserRole(role);
      setCurrentUser({ id: session.user.id, name, email, role, avatar_url }); // Include ID

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
    queryKey: ['clients', selectedAnalystId, currentUser?.id], // Include currentUser.id to force refetch on user switch
    queryFn: async () => {
      let url = '/api/clients';
      if (selectedAnalystId && selectedAnalystId !== 'all') {
        url += `?analyst_id=${selectedAnalystId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao buscar clientes');
      return res.json();
    },
    enabled: !sessionLoading && !!currentUser, // Only fetch after session check and user is set
  });

  const clients: Client[] = clientsData?.data || [];
  useEffect(() => {
    if ((!activeClientId || !clients.find(c => c.id === activeClientId)) && clients.length > 0) {
      // If current active client is invalid, default to first client and update URL
      handleClientChange(clients[0].id);
    } else if (clients.length === 0 && activeClientId) {
      setActiveClientId(null);
      const params = new URLSearchParams(window.location.search);
      params.delete('client');
      router.replace(`/?${params.toString()}`, { scroll: false });
    }
  }, [clients, activeClientId]);

  // Buscar campanhas do cliente ativo
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns', activeClientId, selectedMonth, currentUser?.id], // Also robust here
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
    queryClient.removeQueries(); // Clear all cache on logout
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
    const daysPassed = differenceInDays(today, startOfSelectedMonth);
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
        setActiveClientId={handleClientChange}
        campaigns={campaigns}
        totals={totals}
        monthProgress={monthProgress}
        percentMetaTotal={percentMetaTotal}
        onNewCampaign={() => setShowNewCampaignModal(true)}
        selectedMonth={selectedMonth}
        onMonthChange={(newMonth) => {
          setSelectedMonth(newMonth);
          // Update URL
          const searchParams = new URLSearchParams(window.location.search);
          searchParams.set('month', newMonth);
          router.replace(`/?${searchParams.toString()}`, { scroll: false });
        }}
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
        onSelectAnalyst={(analystId) => {
          setSelectedAnalystId(analystId);
          // Update URL
          const searchParams = new URLSearchParams(window.location.search);
          if (analystId === 'all') {
            searchParams.delete('analyst');
          } else {
            searchParams.set('analyst', analystId);
          }
          router.replace(`/?${searchParams.toString()}`, { scroll: false });
        }}
        onLogout={handleLogout}
        currentUser={currentUser}
        onConnectGoogle={handleConnectGoogle}
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

      {/* Google Ads Account Selector Logic */}
      {/* 
          Agora controlamos via state 'showGoogleAccountSelector' 
          e 'foundIntegrationId' que veio do polling
      */}
      {showGoogleAccountSelector && foundIntegrationId && connectingClientId && (
        <GoogleAccountSelectorModal
          open={true}
          onClose={() => {
            setShowGoogleAccountSelector(false);
            setFoundIntegrationId(null);
            setConnectingClientId(null);
            // Limpar URL se tiver sobrado sujeira
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            url.searchParams.delete('integration_id');
            router.replace(url.toString());
          }}
          clientId={connectingClientId}
          integrationId={foundIntegrationId}
        />
      )}

      {/* Modal de "Aguarde..." */}
      <ConnectingModal
        open={isConnectingGoogle}
        onCancel={() => setIsConnectingGoogle(false)}
      />

      <Toaster />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
