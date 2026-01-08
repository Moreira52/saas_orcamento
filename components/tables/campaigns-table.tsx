'use client';

import Image from 'next/image';

import { useMemo, useState, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import { Campaign } from '@/types/database';
import { useCampaignCalculations, getStatusDisplay, getChannelIcon } from '@/lib/hooks/use-campaign-calculations';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, History as HistoryIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/lib/hooks/use-debounce';
import ObservationsModal from '@/components/modals/observations-modal';
import BudgetHistoryModal from '@/components/modals/budget-history-modal';

interface CampaignsTableProps {
    campaigns: Campaign[];
    onUpdate: (id: string, data: Partial<Campaign>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export default function CampaignsTable({
    campaigns,
    onUpdate,
    onDelete,
}: CampaignsTableProps) {
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [showObservationsModal, setShowObservationsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const queryClient = useQueryClient();
    const debouncedValue = useDebounce(editValue, 1000);

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Campaign> }) =>
            onUpdate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
    });

    useEffect(() => {
        if (editingCell && debouncedValue !== null && debouncedValue !== '') {
            const [campaignId, field] = editingCell.split('|');
            handleSave(campaignId, field, editValue);
        }
    }, [debouncedValue]);

    const handleSave = async (id: string, field: string, value: any) => {
        try {
            // Converter para número se for campo numérico
            let finalValue = value;

            if (field === 'current_spend' || field === 'meta_percentage') {
                const numValue = parseFloat(value.toString().replace(',', '.'));

                // Validar número
                if (isNaN(numValue)) {
                    console.error('Valor inválido:', value);
                    return;
                }

                // Validar negativo
                if (numValue < 0) {
                    console.error('Valor não pode ser negativo');
                    return;
                }

                finalValue = numValue;
            }

            await updateMutation.mutateAsync({
                id,
                data: { [field]: finalValue },
            });

            console.log('✅ Salvo:', field, finalValue);
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
        }
    };

    // Função para salvar imediatamente (ao pressionar Enter)
    const handleImmediateSave = async (campaignId: string, field: string, value: string) => {
        await handleSave(campaignId, field, value);
        setEditingCell(null);
        setEditValue('');
    };

    const columns = useMemo<ColumnDef<Campaign>[]>(
        () => [
            // COLUNA 1: Canal
            {
                accessorKey: 'channel',
                header: 'Canal',
                cell: ({ row }) => {
                    const channel = row.original.channel;
                    const channelData: Record<string, { label: string; iconSrc?: string; iconEmoji?: string }> = {
                        meta_ads: { label: 'Meta Ads', iconSrc: '/channel-icons/meta-ads.png' },
                        google_ads: { label: 'Google Ads', iconSrc: '/channel-icons/google-ads.png' },
                        linkedin_ads: { label: 'LinkedIn Ads', iconSrc: '/channel-icons/linkedin-ads.png' },
                        tiktok_ads: { label: 'TikTok Ads', iconSrc: '/channel-icons/tiktok-ads.png' },
                        pinterest_ads: { label: 'Pinterest Ads', iconSrc: '/channel-icons/pinterest-ads.png' },
                        other: { label: 'Outro', iconEmoji: '🌐' },
                    };

                    const data = channelData[channel] || channelData.other;
                    // Split label for better vertical layout like in the mockup (Name on top, Ads details below if needed, or just side by side)
                    // The user mockup showed "Meta" on one line and "Ads" on another probably, but user just asked to change icons.
                    // Let's keep it simple side-by-side or stacked if the mockup strongly suggests it. 
                    // Looking at the mockup: "Meta" (bold) "Ads". It seems to be two lines.

                    const [cName, ...cRest] = data.label.split(' ');
                    const cSuffix = cRest.join(' ');

                    return (
                        <div className="flex items-center gap-2">
                            {data.iconSrc ? (
                                <div className="relative w-8 h-8 flex-shrink-0">
                                    <Image
                                        src={data.iconSrc}
                                        alt={data.label}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <span className="text-2xl w-8 h-8 flex items-center justify-center">
                                    {data.iconEmoji}
                                </span>
                            )}
                            <div className="flex flex-col leading-tight">
                                <span className="font-bold text-gray-900">{cName}</span>
                                {cSuffix && <span className="text-gray-500 font-medium">{cSuffix}</span>}
                            </div>

                            {row.original.is_multi_month && (
                                <Badge variant="outline" className="text-xs ml-2">
                                    Multi-mês
                                </Badge>
                            )}
                        </div>
                    );
                },
            },

            // COLUNA 2: Tipo de Campanha
            {
                accessorKey: 'campaign_type',
                header: 'Tipo de Campanha',
                cell: ({ row }) => {
                    const campaignId = row.original.id;
                    const isEditing = editingCell === `${campaignId}|campaign_type`;

                    if (isEditing) {
                        return (
                            <input
                                type="text"
                                autoFocus
                                className="w-full border rounded px-2 py-1 text-sm"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => {
                                    if (editValue !== row.original.campaign_type) {
                                        handleImmediateSave(campaignId, 'campaign_type', editValue);
                                    } else {
                                        setEditingCell(null);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleImmediateSave(campaignId, 'campaign_type', editValue);
                                    } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                        setEditValue('');
                                    }
                                }}
                            />
                        );
                    }

                    return (
                        <div
                            onClick={() => {
                                setEditingCell(`${campaignId}|campaign_type`);
                                setEditValue(row.original.campaign_type || '');
                            }}
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        >
                            {row.original.campaign_type || 'Clique para editar'}
                        </div>
                    );
                },
            },

            // COLUNA 3: Plano de Mídia
            {
                accessorKey: 'budget',
                header: 'Plano de Mídia',
                cell: ({ row }) => (
                    <span className="font-semibold text-blue-600">
                        {formatCurrency(row.original.budget)}
                    </span>
                ),
            },

            // COLUNA 4: Período
            {
                accessorKey: 'period',
                header: 'Período',
                cell: ({ row }) => {
                    // Fix timezone offset: manually parse YYYY-MM-DD to local midnight
                    const formatDate = (dateString: string) => {
                        if (!dateString) return '-';
                        const [year, month, day] = dateString.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('pt-BR');
                    };

                    const start = formatDate(row.original.start_date);
                    const end = formatDate(row.original.end_date);

                    return (
                        <div className="text-sm">
                            <div>{start}</div>
                            <div className="text-gray-500">até {end}</div>
                        </div>
                    );
                },
            },



            // COLUNA 6: Parcial 97%
            {
                id: 'parcial_97',
                header: 'Parcial 97%',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    return (
                        <span className="text-green-600">
                            {formatCurrency(calc.parcial97)}
                        </span>
                    );
                },
            },

            // COLUNA 7: Investimento Utilizado (CAMPO PRINCIPAL EDITÁVEL)
            {
                accessorKey: 'current_spend',
                header: 'Investimento Utilizado',
                cell: ({ row }) => {
                    const campaignId = row.original.id;
                    const isEditing = editingCell === `${campaignId}|current_spend`;

                    if (isEditing) {
                        return (
                            <input
                                type="text"
                                inputMode="decimal"
                                autoFocus
                                step="0.01"
                                min="0"
                                className="w-32 border-2 border-blue-500 rounded px-2 py-1 text-sm font-semibold"
                                value={editValue}
                                onFocus={() => (editValue === '0' || editValue === '0.00') && setEditValue('')}
                                onChange={(e) => setEditValue(e.target.value.replace(/\./g, ''))}
                                onBlur={() => {
                                    if (parseFloat(editValue) !== row.original.current_spend) {
                                        handleImmediateSave(campaignId, 'current_spend', editValue);
                                    } else {
                                        setEditingCell(null);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleImmediateSave(campaignId, 'current_spend', editValue);
                                    } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                        setEditValue('');
                                    }
                                }}
                                placeholder="R$ 0,00"
                            />
                        );
                    }

                    return (
                        <div
                            onClick={() => {
                                setEditingCell(`${campaignId}|current_spend`);
                                setEditValue(String(row.original.current_spend));
                            }}
                            className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border-2 border-transparent hover:border-blue-300 transition-all"
                        >
                            <span className="font-bold text-lg">
                                {formatCurrency(row.original.current_spend)}
                            </span>
                        </div>
                    );
                },
            },

            // NOVA COLUNA: Última Edição (Logo após o campo editável)
            {
                id: 'last_update',
                header: 'Última Edição',
                cell: ({ row }) => {
                    const { last_editor_name, last_budget_updated_at } = row.original;

                    if (!last_budget_updated_at) {
                        return <span className="text-[10px] text-gray-300">-</span>;
                    }

                    const dateObj = new Date(last_budget_updated_at);
                    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div className="flex flex-col text-[10px] leading-tight text-gray-500 min-w-[80px]">
                            <span className="font-semibold text-gray-700 truncate max-w-[80px]" title={last_editor_name || 'Desconhecido'}>
                                {last_editor_name || 'Desconhecido'}
                            </span>
                            <span>
                                {dateStr} {timeStr}
                            </span>
                        </div>
                    );
                },
            },

            // COLUNA 8: Parcial 100%
            {
                id: 'parcial_100',
                header: 'Parcial 100%',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    return (
                        <span className="text-blue-600">
                            {formatCurrency(calc.parcial100)}
                        </span>
                    );
                },
            },

            // COLUNA 9: % Meta
            {
                id: 'percent_meta',
                header: '% Meta',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    return (
                        <span className="font-semibold">
                            {formatPercentage(calc.percentMeta)}
                        </span>
                    );
                },
            },

            // COLUNA 10: Invest./dia 97%
            {
                id: 'invest_dia_97',
                header: 'Invest./dia 97%',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    if (calc.daysRemaining === 0) {
                        return <span className="text-gray-400 text-xs">Finalizado</span>;
                    }

                    return (
                        <span className="text-sm text-green-700">
                            {formatCurrency(calc.investDia97)}/dia
                        </span>
                    );
                },
            },

            // COLUNA 11: Invest./dia 100%
            {
                id: 'invest_dia_100',
                header: 'Invest./dia 100%',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    if (calc.daysRemaining === 0) {
                        return <span className="text-gray-400 text-xs">Finalizado</span>;
                    }

                    return (
                        <span className="text-sm text-blue-700">
                            {formatCurrency(calc.investDia100)}/dia
                        </span>
                    );
                },
            },

            // COLUNA 12: % Gasto Real
            {
                id: 'percent_real_spent',
                header: '% Gasto Real',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    return (
                        <Badge className={calc.spentBadgeColor}>
                            {formatPercentage(calc.percentRealSpent)}
                        </Badge>
                    );
                },
            },

            // COLUNA 13: Status
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    const display = getStatusDisplay(calc.status);

                    return (
                        <Badge className={calc.statusColor}>
                            {display.icon} {display.text}
                        </Badge>
                    );
                },
            },

            // COLUNA 14: % Tempo
            {
                id: 'percent_time',
                header: '% Tempo',
                cell: ({ row }) => {
                    const calc = useCampaignCalculations(
                        row.original.budget,
                        row.original.meta_percentage,
                        row.original.start_date,
                        row.original.end_date,
                        row.original.current_spend
                    );

                    return (
                        <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress
                                value={Math.min(calc.percentTime, 100)}
                                className="h-2 flex-1"
                            />
                            <span className="text-xs font-medium min-w-[40px]">
                                {calc.percentTime.toFixed(0)}%
                            </span>
                        </div>
                    );
                },
            },



            // COLUNA 16: Ações
            {
                id: 'actions',
                header: 'Ações',
                cell: ({ row }) => {
                    return (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedCampaign(row.original);
                                    setShowHistoryModal(true);
                                }}
                                title="Histórico de alterações"
                                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                                <HistoryIcon className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedCampaign(row.original);
                                    setShowObservationsModal(true);
                                }}
                                title="Editar Campanha"
                            >
                                <FileText className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (confirm('Deletar esta campanha?')) {
                                        onDelete(row.original.id);
                                    }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Deletar campanha"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [editingCell, editValue]
    );

    // Debug logging
    console.log('Rendering CampaignsTable. Columns count:', columns.length);

    const table = useReactTable({
        data: campaigns,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            {/* Tabela Limpa sem bordas externas (container pai já tem estilo de card) */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-gray-100">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="px-4 py-3 text-sm text-gray-700">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ObservationsModal
                open={showObservationsModal}
                onClose={() => {
                    setShowObservationsModal(false);
                    setSelectedCampaign(null);
                }}
                campaign={selectedCampaign}
                relatedCampaigns={selectedCampaign ? campaigns.filter(c => {
                    const parentId = selectedCampaign.parent_campaign_id || selectedCampaign.id;
                    return c.id !== selectedCampaign.id && (c.id === parentId || c.parent_campaign_id === parentId);
                }) : []}
                onSave={async (data) => {
                    if (selectedCampaign) {
                        await onUpdate(selectedCampaign.id, data);
                    }
                }}
            />

            <BudgetHistoryModal
                open={showHistoryModal}
                onClose={() => {
                    setShowHistoryModal(false);
                    setSelectedCampaign(null);
                }}
                campaign={selectedCampaign}
            />
        </>
    );
}
