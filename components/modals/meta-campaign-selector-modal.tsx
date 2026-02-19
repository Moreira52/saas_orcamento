'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface MetaCampaign {
    id: string;
    name: string;
    status: string;
    type: string;
}

export interface FilterRule {
    id: string;
    field: 'name' | 'id' | 'status';
    operator: 'contains' | 'equals' | 'not_contains' | 'starts_with';
    value: string;
}

interface MetaCampaignSelectorModalProps {
    open: boolean;
    onClose: () => void;
    integrationId: string | null;
    onSelect: (campaigns: MetaCampaign[], rules?: FilterRule[]) => void;
    initialSelection?: string[];
    initialRules?: FilterRule[];
}

export default function MetaCampaignSelectorModal({
    open,
    onClose,
    integrationId,
    onSelect,
    initialSelection = [],
    initialRules,
}: MetaCampaignSelectorModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelection));
    const [showFilters, setShowFilters] = useState(!!initialRules?.length);
    const [saveAsRule, setSaveAsRule] = useState(!!initialRules?.length);
    const [filters, setFilters] = useState<FilterRule[]>(
        initialRules && initialRules.length > 0
            ? initialRules
            : [{ id: '1', field: 'name', operator: 'contains', value: '' }]
    );

    const { data, isLoading, error } = useQuery({
        queryKey: ['meta-campaigns', integrationId],
        queryFn: async () => {
            if (!integrationId) return { campaigns: [] };
            const res = await fetch(`/api/integrations/facebook/list-campaigns?integrationId=${integrationId}`);
            if (!res.ok) throw new Error('Falha ao carregar campanhas');
            return res.json();
        },
        enabled: open && !!integrationId,
        staleTime: 60000,
    });

    const campaigns: MetaCampaign[] = data?.campaigns || [];

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(campaign => {
            return filters.every(filter => {
                if (!filter.value) return true;
                const normalize = (val: string) => val.toLowerCase();
                const itemValue = normalize(String(campaign[filter.field as keyof MetaCampaign] || ''));
                const filterValue = normalize(filter.value);
                switch (filter.operator) {
                    case 'contains': return itemValue.includes(filterValue);
                    case 'equals': return itemValue === filterValue;
                    case 'not_contains': return !itemValue.includes(filterValue);
                    case 'starts_with': return itemValue.startsWith(filterValue);
                    default: return true;
                }
            });
        });
    }, [campaigns, filters]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const isAllSelected =
        filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedIds.has(c.id));

    const toggleSelectAll = () => {
        const newSet = new Set(selectedIds);
        if (isAllSelected) filteredCampaigns.forEach(c => newSet.delete(c.id));
        else filteredCampaigns.forEach(c => newSet.add(c.id));
        setSelectedIds(newSet);
    };

    const addFilter = () => {
        setFilters([...filters, { id: crypto.randomUUID(), field: 'name', operator: 'contains', value: '' }]);
        setShowFilters(true);
    };

    const removeFilter = (id: string) => {
        if (filters.length === 1) {
            setFilters([{ id: '1', field: 'name', operator: 'contains', value: '' }]);
            return;
        }
        setFilters(filters.filter(f => f.id !== id));
    };

    const updateFilter = (id: string, key: keyof FilterRule, val: string) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [key]: val } : f));
    };

    const hasActiveFilters = filters.some(f => f.value.trim() !== '');

    const handleApply = () => {
        if (saveAsRule && hasActiveFilters) {
            onSelect([], filters.filter(f => f.value));
        } else {
            const selected = campaigns.filter(c => selectedIds.has(c.id));
            onSelect(selected);
        }
        onClose();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
            case 'PAUSED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ARCHIVED':
            case 'DELETED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            ACTIVE: 'ATIVA',
            PAUSED: 'PAUSADA',
            ARCHIVED: 'ARQUIVADA',
            DELETED: 'REMOVIDA',
        };
        return map[status] ?? status;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-md border-gray-100/50 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50">
                    <div>
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            Vincular Campanhas Meta Ads
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            Use filtros avançados para encontrar e agrupar campanhas.
                        </DialogDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn("gap-2 transition-all", showFilters && "bg-accent-primary/10 border-accent-primary text-accent-primary-dark")}
                        >
                            <Filter className="w-4 h-4" />
                            Filtros{' '}
                            {filters.filter(f => f.value).length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent-primary text-[10px] text-white font-bold">
                                    {filters.filter(f => f.value).length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {filters.map(filter => (
                            <div key={filter.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                <Select value={filter.field} onValueChange={val => updateFilter(filter.id, 'field', val as any)}>
                                    <SelectTrigger className="w-[140px] h-9 bg-white">
                                        <SelectValue placeholder="Campo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">Nome</SelectItem>
                                        <SelectItem value="id">ID</SelectItem>
                                        <SelectItem value="status">Status</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filter.operator} onValueChange={val => updateFilter(filter.id, 'operator', val as any)}>
                                    <SelectTrigger className="w-[140px] h-9 bg-white">
                                        <SelectValue placeholder="Operador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="contains">Contém</SelectItem>
                                        <SelectItem value="equals">Igual a</SelectItem>
                                        <SelectItem value="not_contains">Não contém</SelectItem>
                                        <SelectItem value="starts_with">Começa com</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Input
                                    className="flex-1 h-9 bg-white"
                                    placeholder="Valor..."
                                    value={filter.value}
                                    onChange={e => updateFilter(filter.id, 'value', e.target.value)}
                                />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => removeFilter(filter.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="link"
                            size="sm"
                            className="text-accent-primary px-0 h-auto font-medium hover:text-accent-primary/80"
                            onClick={addFilter}
                        >
                            <Plus className="w-3 h-3 mr-1" /> Adicionar regra
                        </Button>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-auto bg-white/50 min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                            <p className="text-sm">Carregando campanhas...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-6">
                            <p className="text-red-500 font-medium">Erro ao carregar dados.</p>
                            <p className="text-sm text-gray-400">Tente desconectar e conectar novamente a integração.</p>
                        </div>
                    ) : filteredCampaigns.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                            Nenhum resultado encontrado para os filtros atuais.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50/50 sticky top-0 backdrop-blur-sm z-10">
                                <TableRow className="hover:bg-transparent border-gray-100">
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Selecionar tudo"
                                        />
                                    </TableHead>
                                    <TableHead>Nome da Campanha</TableHead>
                                    <TableHead className="w-[180px]">ID</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                    <TableHead className="w-[160px]">Objetivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCampaigns.map(campaign => {
                                    const isSelected = selectedIds.has(campaign.id);
                                    return (
                                        <TableRow
                                            key={campaign.id}
                                            className={cn(
                                                "cursor-pointer transition-colors hover:bg-gray-50/80 border-gray-50",
                                                isSelected && "bg-accent-primary/5 hover:bg-accent-primary/10"
                                            )}
                                            onClick={() => toggleSelection(campaign.id)}
                                        >
                                            <TableCell className="py-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelection(campaign.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900 py-3">
                                                {campaign.name}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-gray-500 py-3">
                                                {campaign.id}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge variant="outline" className={cn("text-[10px] font-medium border-0 px-2 py-0.5", getStatusColor(campaign.status))}>
                                                    {getStatusLabel(campaign.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500 capitalize py-3">
                                                {campaign.type.replace(/_/g, ' ').toLowerCase()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                        {hasActiveFilters && (
                            <div className="flex items-center space-x-2 bg-white/50 p-1.5 rounded-md border border-gray-100/50">
                                <Checkbox
                                    id="meta-save-rule"
                                    checked={saveAsRule}
                                    onCheckedChange={checked => setSaveAsRule(checked === true)}
                                    className="border-gray-400 data-[state=checked]:bg-accent-primary data-[state=checked]:border-accent-primary"
                                />
                                <label
                                    htmlFor="meta-save-rule"
                                    className="text-sm font-medium leading-none cursor-pointer text-gray-700 select-none"
                                >
                                    Salvar como regra dinâmica
                                </label>
                            </div>
                        )}

                        <div className="flex flex-col">
                            {!saveAsRule && (
                                <span className="text-sm font-medium text-gray-900">
                                    {selectedIds.size} campanha(s) selecionada(s)
                                </span>
                            )}
                            <span className={cn("text-xs transition-colors", saveAsRule ? "text-accent-primary-dark font-medium" : "text-gray-500")}>
                                {saveAsRule
                                    ? "Monitorará automaticamente novas campanhas que correspondam aos filtros."
                                    : "Serão somadas automaticamente na coluna de Investimento."}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 items-center">
                        <Button variant="ghost" onClick={onClose} className="hover:bg-gray-100 text-gray-600">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={saveAsRule ? !hasActiveFilters : selectedIds.size === 0}
                            className={cn(
                                "bg-accent-primary hover:bg-[#B2E030] text-black font-bold shadow-md transition-all",
                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            )}
                        >
                            {saveAsRule ? 'Aplicar Regra' : 'Aplicar Seleção'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
