'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MonthYearPicker from '@/components/ui/month-year-picker';
import CampaignsTable from '@/components/tables/campaigns-table';
import { Client, Campaign } from '@/types/database';
import { Plus, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useCampaignCalculations } from '@/lib/hooks/use-campaign-calculations';
import NewClientModal from '@/components/modals/new-client-modal';
import NewCampaignModal from '@/components/modals/new-campaign-modal';
import DeleteClientModal from '@/components/modals/delete-client-modal';
import { Toaster } from '@/components/ui/sonner';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { startOfMonth, endOfMonth, differenceInDays, isPast, isFuture } from 'date-fns';
import StitchDashboard from '@/components/dashboard/stitch-dashboard';

export default function HomePage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const queryClient = useQueryClient();

  // Buscar clientes
  const { data: clientsData, isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Erro ao buscar clientes');
      return res.json();
    },
  });

  const clients: Client[] = clientsData?.data || [];
  const [activeClientId, setActiveClientId] = useState<string | null>(
    clients[0]?.id || null
  );

  useEffect(() => {
    if (!activeClientId && clients.length > 0) {
      setActiveClientId(clients[0].id);
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



  if (loadingClients) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Nenhum cliente cadastrado</h2>
          <p className="text-gray-600 mb-6">Crie seu primeiro cliente para começar</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>
    );
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
      />

      <NewClientModal
        open={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
      />

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
