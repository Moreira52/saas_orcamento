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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Budget Tracker - Tráfego Pago
            </h1>
            <div className="flex items-center gap-4">
              <MonthYearPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <Tabs value={activeClientId || ''} onValueChange={setActiveClientId}>
            <div className="flex items-center gap-2">
              <TabsList className="flex-1 overflow-x-auto">
                {clients.map((client) => (
                  <TabsTrigger
                    key={client.id}
                    value={client.id}
                    className="gap-2 group relative pr-8"
                  >
                    {/* Logo (se existir) */}
                    {client.logo_url && (
                      <img
                        src={client.logo_url}
                        alt={client.name}
                        className="h-5 w-5 object-contain rounded"
                      />
                    )}
                    {/* Nome do cliente */}
                    <span>{client.name}</span>

                    {/* Botão de deletar (aparece ao hover) */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToDelete(client);
                        setShowDeleteClientModal(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setClientToDelete(client);
                          setShowDeleteClientModal(true);
                        }
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-all"
                      title="Deletar cliente"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewClientModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Cliente
              </Button>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeClient && (
          <div className="space-y-4">
            {/* Badge de última atualização */}
            <div className="flex items-center justify-between">
              <Button onClick={() => setShowNewCampaignModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>

              <Badge variant="outline" className="gap-2">
                <Clock className="h-3 w-3" />
                Atualizado{' '}
                {formatDistanceToNow(new Date(activeClient.last_updated_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </Badge>
            </div>

            {/* Tabela de Campanhas */}
            <div className="bg-white rounded-lg shadow">
              {loadingCampaigns ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Carregando campanhas...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">Nenhuma campanha neste mês</p>
                </div>
              ) : (
                <>
                  <CampaignsTable
                    campaigns={campaigns}
                    onUpdate={async (id, data) => {
                      await updateCampaign.mutateAsync({ id, data });
                    }}
                    onDelete={async (id) => {
                      await deleteCampaign.mutateAsync(id);
                    }}
                  />

                  {/* Linha TOTAL */}
                  <div className="bg-yellow-50 border-t-2 border-yellow-300 p-4">
                    <div className="grid grid-cols-6 gap-4 font-bold text-sm">
                      <div>
                        <div className="text-gray-600 text-xs mb-1">TOTAL</div>
                        <div className="text-lg">{campaigns.length} campanhas</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs mb-1">Plano Total</div>
                        <div className="text-blue-600">{formatCurrency(totals.budget)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs mb-1">Parcial 97%</div>
                        <div className="text-green-600">{formatCurrency(totals.parcial97)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs mb-1">Investido</div>
                        <div className="text-lg">{formatCurrency(totals.currentSpend)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs mb-1">Invest./dia 97%</div>
                        <div className="text-green-600">{formatCurrency(totals.investDia97)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs mb-1">% da Meta</div>
                        <div>
                          {totals.parcial97 > 0
                            ? ((totals.currentSpend / totals.parcial97) * 100).toFixed(1)
                            : 0}
                          %
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

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
    </div>
  );
}
