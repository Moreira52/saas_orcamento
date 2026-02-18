'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GoogleAccountSelectorModalProps {
    open: boolean;
    onClose: () => void;
    clientId: string;
    integrationId: string;
}

interface GoogleAdAccount {
    id: string;
    resourceName: string;
    name: string;
}

export default function GoogleAccountSelectorModal({
    open,
    onClose,
    clientId,
    integrationId
}: GoogleAccountSelectorModalProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<GoogleAdAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const [errorDetails, setErrorDetails] = useState<any>(null);

    // 1. Buscar contas ao abrir
    useEffect(() => {
        if (open && integrationId) {
            fetchAccounts();
        }
    }, [open, integrationId]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            setErrorDetails(null);

            // Agora usamos integrationId direto, é mais seguro
            const res = await fetch(`/api/integrations/google/list-accounts?integrationId=${integrationId}`);
            const json = await res.json();

            if (!res.ok) {
                console.error('Erro API:', json);
                setErrorDetails(json); // Guarda o erro completo com detalhes
                throw new Error(json.error || 'Erro ao buscar contas');
            }

            setAccounts(json.customers || []);

            // Se só tiver uma conta, seleciona automaticamente? Talvez não, melhor deixar o user explícito.
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao listar contas do Google Ads: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedAccountId) return;

        try {
            setSaving(true);
            const res = await fetch('/api/integrations/google/save-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integrationId,
                    externalAccountId: selectedAccountId
                })
            });

            if (!res.ok) throw new Error('Erro ao salvar seleção');

            toast.success('Conta Google Ads vinculada com sucesso!');

            // Limpar URL
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            url.searchParams.delete('integration_id');
            // Manter o client na URL para continuar vendo ele

            router.replace(url.toString()); // Remove os params da URL sem refresh
            router.refresh(); // Recarrega os dados da página
            onClose();

        } catch (error) {
            toast.error('Erro ao salvar conta.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Selecionar Conta de Anúncios</DialogTitle>
                    <DialogDescription>
                        Encontramos as seguintes contas no seu Google Ads. Qual delas pertence a este cliente?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-2 text-accent-primary" />
                            <p>Buscando contas no Google...</p>
                        </div>
                    ) : errorDetails ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 overflow-auto max-h-[300px]">
                            <p className="font-bold mb-2">Ops! O Google retornou um erro:</p>
                            <pre className="whitespace-pre-wrap text-xs font-mono ml-2">
                                {JSON.stringify(errorDetails, null, 2)}
                            </pre>
                            <p className="mt-4 text-xs text-red-600">
                                Dica: Verifique se o seu <b>Developer Token</b> está aprovado e se a conta logada tem permissão de acesso.
                            </p>

                            {/* Dica Específica para API Desativada (Erro 501) */}
                            {((errorDetails?.details?.error?.status === 'UNIMPLEMENTED') || (JSON.stringify(errorDetails).includes('UNIMPLEMENTED'))) && (
                                <div className="mt-4 p-3 bg-white border border-red-200 rounded text-center">
                                    <p className="font-bold text-red-700 mb-2">A API do Google Ads não está ativada!</p>
                                    <a
                                        href="https://console.cloud.google.com/apis/library/googleads.googleapis.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition"
                                    >
                                        Clique aqui para Ativar a API no Google Cloud
                                    </a>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        Após ativar, espere 1 minuto e tente novamente.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            Nenhuma conta de anúncios encontrada ou acessível.
                            <br />
                            <span className="text-xs">Verifique se o usuário logado tem acesso às contas.</span>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    onClick={() => setSelectedAccountId(account.id)}
                                    className={`
                                        flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                                        ${selectedAccountId === account.id
                                            ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary'
                                            : 'border-border-light hover:bg-card-hover-light'}
                                    `}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-text-primary-light">{account.name}</span>
                                        <span className="text-xs text-text-muted-light">ID: {account.id}</span>
                                    </div>
                                    {selectedAccountId === account.id && (
                                        <CheckCircle2 className="h-5 w-5 text-accent-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!selectedAccountId || saving}
                        className="bg-accent-primary text-black hover:bg-[#B2E030]"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirmar Integração
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
