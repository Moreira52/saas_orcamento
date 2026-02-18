'use client';

import { MouseEvent, useState, useEffect } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface IntegrationsButtonProps {
    clientId: string;
    onConnectGoogle: () => void;
}

export default function IntegrationsButton({ clientId, onConnectGoogle }: IntegrationsButtonProps) {
    const queryClient = useQueryClient();
    const [isSelectionOpen, setSelectionOpen] = useState(false); // Meta Ads
    const [isGoogleSelectionOpen, setGoogleSelectionOpen] = useState(false); // Google Ads

    // --- GOOGLE ADS ---
    const { data: googleStatus, isLoading: isLoadingGoogle } = useQuery({
        queryKey: ['integration-status', 'google', clientId],
        queryFn: async () => {
            const res = await fetch(`/api/integrations/status?clientId=${clientId}&provider=google`);
            if (!res.ok) throw new Error('Failed to check status');
            return res.json();
        },
        refetchInterval: 5000
    });

    const isGoogleConnected = googleStatus?.connected;
    const googleNeedsSelection = googleStatus?.needsSelection;

    // Monitor Google status to auto-open modal if needed
    useEffect(() => {
        if (isGoogleConnected && googleNeedsSelection) {
            setGoogleSelectionOpen(true);
        }
    }, [isGoogleConnected, googleNeedsSelection]);

    const googleDisconnectMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/integrations/google/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId })
            });
            if (!res.ok) throw new Error('Falha ao desconectar');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Google Ads desconectado com sucesso.');
            queryClient.invalidateQueries({ queryKey: ['integration-status', 'google', clientId] });
        },
        onError: () => {
            toast.error('Erro ao desconectar Google Ads.');
        }
    });

    const handleGoogleAction = (e: MouseEvent) => {
        e.preventDefault();
        if (isLoadingGoogle) return;

        if (isGoogleConnected) {
            if (googleNeedsSelection) {
                setGoogleSelectionOpen(true);
            } else if (confirm('Tem certeza que deseja desconectar o Google Ads deste cliente?')) {
                googleDisconnectMutation.mutate();
            }
        } else {
            onConnectGoogle();
        }
    };

    // Google Accounts Query
    const {
        data: googleAccountsData,
        isLoading: isLoadingGoogleAccounts,
        status: googleAccountsStatus
    } = useQuery({
        queryKey: ['google-accounts', clientId],
        queryFn: async () => {
            const res = await fetch(`/api/integrations/google/list-accounts?integrationId=${googleStatus.integrationId}`);
            // if (!res.ok) throw new Error('Failed to fetch google accounts'); // Don't throw, let us read the error body
            return res.json();
        },
        enabled: isGoogleSelectionOpen && !!googleStatus?.integrationId
    });

    const selectGoogleAccountMutation = useMutation({
        mutationFn: async ({ externalAccountId, loginCustomerId, accountName }: { externalAccountId: string, loginCustomerId?: string, accountName?: string }) => {
            const res = await fetch('/api/integrations/google/save-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integrationId: googleStatus.integrationId,
                    externalAccountId,
                    loginCustomerId,
                    accountName
                })
            });
            if (!res.ok) throw new Error('Falha ao selecionar conta');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Conta Google Ads vinculada com sucesso!');
            setGoogleSelectionOpen(false);
            queryClient.invalidateQueries({ queryKey: ['integration-status', 'google', clientId] });
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao vincular conta Google Ads.');
        }
    });

    const googleAccountsError = googleAccountsData?.error || (googleAccountsStatus === 'error' ? 'Falha ao carregar contas' : null);

    // --- META ADS ---
    const { data: facebookStatus, isLoading: isLoadingFacebook } = useQuery({
        queryKey: ['integration-status', 'facebook', clientId],
        queryFn: async () => {
            const res = await fetch(`/api/integrations/status?clientId=${clientId}&provider=facebook`);
            if (!res.ok) throw new Error('Failed to check status');
            return res.json();
        },
        refetchInterval: 5000
    });

    const isFacebookConnected = facebookStatus?.connected;
    const needsSelection = facebookStatus?.needsSelection;

    // Monitor status to auto-open modal if needed
    useEffect(() => {
        if (isFacebookConnected && needsSelection) {
            setSelectionOpen(true);
        }
    }, [isFacebookConnected, needsSelection]);

    const facebookDisconnectMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/integrations/facebook/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId })
            });
            if (!res.ok) throw new Error('Falha ao desconectar');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Meta Ads desconectado com sucesso.');
            queryClient.invalidateQueries({ queryKey: ['integration-status', 'facebook', clientId] });
        },
        onError: () => {
            toast.error('Erro ao desconectar Meta Ads.');
        }
    });

    // Fetch Accounts for Selection
    const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ['facebook-accounts', clientId],
        queryFn: async () => {
            const res = await fetch(`/api/integrations/facebook/accounts?clientId=${clientId}`);
            if (!res.ok) throw new Error('Failed to fetch accounts');
            return res.json();
        },
        enabled: isSelectionOpen // Only fetch when modal is open
    });

    const selectAccountMutation = useMutation({
        mutationFn: async (accountId: string) => {
            const res = await fetch('/api/integrations/facebook/select-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, accountId })
            });
            if (!res.ok) throw new Error('Falha ao selecionar conta');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Conta de Anúncio vinculada com sucesso!');
            setSelectionOpen(false);
            queryClient.invalidateQueries({ queryKey: ['integration-status', 'facebook', clientId] });
        },
        onError: () => {
            toast.error('Erro ao vincular conta.');
        }
    });

    const handleFacebookAction = (e: MouseEvent) => {
        e.preventDefault();
        if (isLoadingFacebook) return;

        if (isFacebookConnected) {
            if (needsSelection) {
                setSelectionOpen(true);
            } else if (confirm('Tem certeza que deseja desconectar o Meta Ads deste cliente?')) {
                facebookDisconnectMutation.mutate();
            }
        } else {
            // OAuth Flow
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            window.open(
                `/api/integrations/facebook/auth?clientId=${clientId}`,
                'Connect Meta Ads',
                `width=${width},height=${height},top=${top},left=${left}`
            );
        }
    };

    const hasAnyConnection = isGoogleConnected || isFacebookConnected;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-muted-light hover:text-text-primary-light hover:bg-card-hover-light rounded-lg transition-colors border border-transparent hover:border-border-light focus:outline-none"
                        title="Gerenciar Integrações"
                    >
                        <Zap className={`w-4 h-4 ${hasAnyConnection ? 'text-green-500 fill-green-500' : 'text-text-muted-light'}`} />
                        Integrações
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px] p-2">
                    <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-2">
                        Plataformas Disponíveis
                    </DropdownMenuLabel>

                    {/* GOOGLE ADS */}
                    <DropdownMenuItem
                        onClick={handleGoogleAction}
                        disabled={isLoadingGoogle || googleDisconnectMutation.isPending}
                        className="flex items-center justify-between p-2 cursor-pointer rounded-lg mb-1"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 relative bg-white rounded-lg p-1 border border-gray-100 shadow-sm flex-shrink-0">
                                <Image src="/channel-icons/google-ads.png" alt="Google" fill className="object-contain p-1" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-900">Google Ads</span>
                                <span className={`text-[10px] ${isGoogleConnected ? (googleNeedsSelection ? 'text-amber-600 font-bold' : 'text-green-600 font-medium') : 'text-gray-500'}`}>
                                    {isLoadingGoogle ? 'Verificando...' :
                                        isGoogleConnected ? (
                                            googleNeedsSelection ? 'Configurar Conta' : (
                                                googleStatus?.accountName
                                                    ? `Conectado: ${googleStatus.accountName}`
                                                    : 'Conectado'
                                            )
                                        ) :
                                            'Clique para conectar'}
                                </span>
                            </div>
                        </div>

                        {isLoadingGoogle || googleDisconnectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : isGoogleConnected ? (
                            googleNeedsSelection ? (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )
                        ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    {/* META ADS */}
                    <DropdownMenuItem
                        onClick={handleFacebookAction}
                        disabled={isLoadingFacebook || facebookDisconnectMutation.isPending}
                        className="flex items-center justify-between p-2 cursor-pointer rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 relative bg-white rounded-lg p-1 border border-gray-100 shadow-sm flex-shrink-0">
                                <Image src="/channel-icons/meta-ads.png" alt="Meta" fill className="object-contain p-1" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-900">Meta Ads</span>
                                <span className={`text-[10px] ${isFacebookConnected ? (needsSelection ? 'text-amber-600 font-bold' : 'text-green-600 font-medium') : 'text-gray-500'}`}>
                                    {isLoadingFacebook ? 'Verificando...' :
                                        isFacebookConnected ? (needsSelection ? 'Configurar Conta' : 'Conectado') :
                                            'Clique para conectar'}
                                </span>
                            </div>
                        </div>
                        {isLoadingFacebook || facebookDisconnectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : isFacebookConnected ? (
                            needsSelection ? (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )
                        ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* SELECTION MODAL (META) */}
            <Dialog open={isSelectionOpen} onOpenChange={setSelectionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Selecione a Conta Meta Ads</DialogTitle>
                        <DialogDescription>
                            Escolha qual conta do Meta Ads será monitorada neste dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {isLoadingAccounts ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : accountsData?.accounts?.length > 0 ? (
                            accountsData.accounts.map((acc: any) => (
                                <button
                                    key={acc.id}
                                    onClick={() => selectAccountMutation.mutate(acc.id)}
                                    disabled={selectAccountMutation.isPending}
                                    className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 flex items-center justify-between group"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm text-gray-900">{acc.name}</span>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>ID: {acc.id}</span>
                                            <span>•</span>
                                            <span>{acc.currency}</span>
                                        </div>
                                    </div>
                                    {selectAccountMutation.isPending && (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                Nenhuma conta de anúncio encontrada ou erro ao carregar.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* SELECTION MODAL (GOOGLE ADS) */}
            <Dialog open={isGoogleSelectionOpen} onOpenChange={setGoogleSelectionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Selecione a Conta Google Ads</DialogTitle>
                        <DialogDescription>
                            Escolha qual conta do Google Ads será monitorada neste dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {isLoadingGoogleAccounts ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : googleAccountsError ? (
                            <div className="text-center py-6 px-4 text-red-500 text-sm bg-red-50 rounded-lg">
                                <p className="font-semibold mb-1">Erro ao listar contas:</p>
                                <p>{googleAccountsError}</p>
                                {googleAccountsData?.details && (
                                    <pre className="text-[10px] mt-2 text-left bg-white p-2 rounded border border-red-100 overflow-auto">
                                        {JSON.stringify(googleAccountsData.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ) : googleAccountsData?.customers?.length > 0 ? (
                            googleAccountsData.customers.map((acc: any) => (
                                <button
                                    key={acc.id}
                                    onClick={() => selectGoogleAccountMutation.mutate({
                                        externalAccountId: acc.id,
                                        loginCustomerId: acc.loginCustomerId,
                                        accountName: acc.name
                                    })}
                                    disabled={selectGoogleAccountMutation.isPending}
                                    className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 flex items-center justify-between group"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm text-gray-900">{acc.name}</span>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>ID: {acc.id}</span>
                                            <span className="text-[10px] bg-gray-100 px-1 rounded">{acc.resourceName}</span>
                                        </div>
                                    </div>
                                    {selectGoogleAccountMutation.isPending && (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                Nenhuma conta acessível encontrada.
                                <br />
                                <span className="text-xs text-gray-400 mt-2 block">
                                    Verifique se o usuário logado tem permissão de acesso às contas no Google Ads.
                                </span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
