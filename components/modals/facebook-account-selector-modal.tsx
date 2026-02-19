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
import { Loader2, CheckCircle2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FacebookAccountSelectorModalProps {
    open: boolean;
    onClose: () => void;
    clientId: string;
}

interface FacebookAdAccount {
    id: string;
    name: string;
    account_status: number;
    currency: string;
}

export default function FacebookAccountSelectorModal({
    open,
    onClose,
    clientId
}: FacebookAccountSelectorModalProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<FacebookAdAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();
    const [errorDetails, setErrorDetails] = useState<any>(null);

    // 1. Buscar contas ao abrir
    useEffect(() => {
        if (open && clientId) {
            setSearchTerm('');
            fetchAccounts();
        }
    }, [open, clientId]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            setErrorDetails(null);

            const res = await fetch(`/api/integrations/facebook/accounts?clientId=${clientId}`);
            const json = await res.json();

            if (!res.ok) {
                console.error('Erro API Facebook:', json);
                setErrorDetails(json);
                throw new Error(json.error || 'Erro ao buscar contas do Meta Ads');
            }

            setAccounts(json.accounts || []);

        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao listar contas do Meta Ads: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedAccountId) return;

        try {
            setSaving(true);

            // A rota de seleção do Facebook espera { clientId, accountId }
            const res = await fetch('/api/integrations/facebook/select-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    accountId: selectedAccountId
                })
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Erro ao salvar seleção');

            toast.success('Conta Meta Ads vinculada com sucesso!');

            // Limpar URL e recarregar dados
            const url = new URL(window.location.href);
            router.replace(url.toString());
            router.refresh();
            onClose();

        } catch (error: any) {
            toast.error(`Erro ao salvar conta: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Selecionar Conta de Anúncios (Meta)</DialogTitle>
                    <DialogDescription>
                        Encontramos as seguintes contas no seu perfil do Facebook. Qual delas pertence a este cliente?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-600" />
                            <p>Buscando contas no Meta Ads...</p>
                        </div>
                    ) : errorDetails ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            <p className="font-bold mb-1">Erro ao comunicar com o Facebook:</p>
                            <p>{errorDetails.error || 'Erro desconhecido'}</p>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            Nenhuma conta de anúncios encontrada.
                            <br />
                            <span className="text-xs">Verifique se você tem permissão de administrador na conta de anúncios.</span>
                        </div>
                    ) : (
                        <>
                            {/* Search Input */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50"
                                />
                            </div>

                            {/* Account List */}
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                {accounts
                                    .filter((account) => {
                                        const term = searchTerm.toLowerCase();
                                        return (
                                            account.name.toLowerCase().includes(term) ||
                                            account.id.toLowerCase().includes(term)
                                        );
                                    })
                                    .map((account) => (
                                        <div
                                            key={account.id}
                                            onClick={() => setSelectedAccountId(account.id)}
                                            className={`
                                                flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                                                ${selectedAccountId === account.id
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                    : 'border-gray-200 hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800">{account.name}</span>
                                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                    <span>ID: {account.id}</span>
                                                    <span>•</span>
                                                    <span>{account.currency}</span>
                                                </div>
                                            </div>
                                            {selectedAccountId === account.id && (
                                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                            )}
                                        </div>
                                    ))}

                                {/* Empty state after filter */}
                                {accounts.filter((a) => {
                                    const term = searchTerm.toLowerCase();
                                    return a.name.toLowerCase().includes(term) || a.id.toLowerCase().includes(term);
                                }).length === 0 && (
                                        <div className="text-center py-6 text-gray-400 text-sm">
                                            Nenhuma conta encontrada para &quot;{searchTerm}&quot;
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!selectedAccountId || saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirmar Integração
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
