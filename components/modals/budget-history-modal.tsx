import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Campaign } from '@/types/database';

interface Log {
    id: string;
    old_value: number;
    new_value: number;
    changed_at: string; // ISO string
    changed_by?: string;
    users?: {
        name: string;
        email: string;
    };
}

interface BudgetHistoryModalProps {
    open: boolean;
    onClose: () => void;
    campaign: Campaign | null;
}

export default function BudgetHistoryModal({
    open,
    onClose,
    campaign,
}: BudgetHistoryModalProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && campaign) {
            fetchLogs();
        } else {
            setLogs([]);
        }
    }, [open, campaign]);

    const fetchLogs = async () => {
        if (!campaign) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/campaigns/${campaign.id}/logs`);
            const json = await res.json();
            if (json.success) {
                setLogs(json.data);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!campaign) return null;

    const channelMap: Record<string, string> = {
        meta_ads: 'Meta Ads',
        google_ads: 'Google Ads',
        linkedin_ads: 'LinkedIn Ads',
        tiktok_ads: 'TikTok Ads',
        pinterest_ads: 'Pinterest Ads',
        other: 'Outro',
    };

    const channelLabel = channelMap[campaign.channel] || campaign.channel;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        Histórico de Investimento Utilizado
                    </DialogTitle>
                    <div className="text-sm text-gray-500">
                        Campanha: <span className="font-medium text-gray-900">{campaign.campaign_type}</span> ({channelLabel})
                    </div>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Nenhum histórico de alteração encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Valor Anterior</TableHead>
                                    <TableHead>Novo Valor</TableHead>
                                    <TableHead>Alterado por</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-gray-600">
                                            {format(new Date(log.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                                                locale: ptBR,
                                            })}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {formatCurrency(log.old_value)}
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">
                                            {formatCurrency(log.new_value)}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {log.users?.name || 'Sistema/Desconhecido'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
