'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Campaign } from '@/types/database';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { Link2, CalendarIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ObservationsModalProps {
    open: boolean;
    onClose: () => void;
    campaign: Campaign | null;
    relatedCampaigns?: Campaign[];
    onSave: (data: { observations: string; campaign_type: string; budget: number }) => Promise<void>;
}

export default function ObservationsModal({
    open,
    onClose,
    campaign,
    relatedCampaigns,
    onSave,
}: ObservationsModalProps) {
    const [observations, setObservations] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [budget, setBudget] = useState<string>('');
    const [localRelatedCampaigns, setLocalRelatedCampaigns] = useState<Campaign[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [distributeBudget, setDistributeBudget] = useState(false);
    const [totalBudgetInput, setTotalBudgetInput] = useState('');
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [pendingDateChange, setPendingDateChange] = useState<{ id: string, type: 'start' | 'end', date: Date } | null>(null);
    const [currentDates, setCurrentDates] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const maxChars = 500;

    // Carregar dados quando modal abre
    useEffect(() => {
        if (campaign) {
            setObservations(campaign.observations || '');
            setCampaignName(campaign.campaign_type || '');
            setBudget(campaign.budget?.toString() || '');
            setCurrentDates({ start: campaign.start_date, end: campaign.end_date });
            // Initialize local related campaigns from props if available, else empty (to be fetched)
            setLocalRelatedCampaigns(relatedCampaigns || []);
        }
    }, [campaign, relatedCampaigns]);

    // Fetch related if needed (only if no props provided and empty local)
    useEffect(() => {
        const fetchRelated = async () => {
            if (campaign?.is_multi_month && (!relatedCampaigns || relatedCampaigns.length === 0)) {
                try {
                    let query = supabase.from('campaigns').select('*');

                    const parentId = campaign.parent_campaign_id || campaign.id;
                    // Buscar todos vinculados a esse parent ID
                    query = query.or(`id.eq.${parentId},parent_campaign_id.eq.${parentId}`);

                    const { data, error } = await query;
                    if (data && !error) {
                        // Filtrar para não incluir o próprio
                        setLocalRelatedCampaigns(data.filter(c => c.id !== campaign.id));
                    }
                } catch (err) {
                    console.error("Error fetching related campaigns", err);
                }
            }
        };

        if (open && campaign?.is_multi_month && localRelatedCampaigns.length === 0 && (!relatedCampaigns || relatedCampaigns.length === 0)) {
            fetchRelated();
        }
    }, [campaign, relatedCampaigns, open, localRelatedCampaigns.length]);

    // Render always uses localRelatedCampaigns which is now the source of truth
    const displayRelatedList = localRelatedCampaigns;

    const handleSave = async () => {
        if (!campaign) return;

        setIsSaving(true);
        try {
            const numericBudget = parseFloat(budget.toString().replace(',', '.'));

            if (isNaN(numericBudget) || numericBudget < 0) {
                toast.error('O valor do investimento deve ser um número válido e positivo');
                setIsSaving(false);
                return;
            }

            if (!campaignName.trim()) {
                toast.error('O nome da campanha não pode estar vazio');
                setIsSaving(false);
                return;
            }

            // Update related campaigns if they exist (were loaded/distributed/dates changed)
            if (localRelatedCampaigns.length > 0) {
                const updates = localRelatedCampaigns.map(c =>
                    supabase.from('campaigns').update({
                        budget: c.budget,
                        start_date: c.start_date,
                        end_date: c.end_date
                    }).eq('id', c.id)
                );
                await Promise.all(updates);
            }

            // Update Current Campaign Dates directly if changed
            if (currentDates.start !== campaign.start_date || currentDates.end !== campaign.end_date) {
                await supabase.from('campaigns').update({
                    start_date: currentDates.start,
                    end_date: currentDates.end
                }).eq('id', campaign.id);
            }

            await onSave({
                observations,
                campaign_type: campaignName,
                budget: numericBudget
            });
            toast.success('Alterações salvas com sucesso!');
            onClose();
        } catch (error) {
            toast.error('Erro ao salvar alterações');
        } finally {
            setIsSaving(false);
        }
    };

    if (!campaign) return null;

    const channelConfig: Record<string, { label: string, iconSrc?: string, iconEmoji?: string, colorBg: string }> = {
        meta_ads: { label: 'Meta Ads', iconSrc: '/channel-icons/meta-ads.png', colorBg: 'bg-element-light' },
        google_ads: { label: 'Google Ads', iconSrc: '/channel-icons/google-ads.png', colorBg: 'bg-element-light' },
        linkedin_ads: { label: 'LinkedIn Ads', iconSrc: '/channel-icons/linkedin-ads.png', colorBg: 'bg-element-light' },
        tiktok_ads: { label: 'TikTok Ads', iconSrc: '/channel-icons/tiktok.png', colorBg: 'bg-element-light' },
        tiktok: { label: 'TikTok Ads', iconSrc: '/channel-icons/tiktok.png', colorBg: 'bg-element-light' },
        pinterest_ads: { label: 'Pinterest Ads', iconSrc: '/channel-icons/pinterest-ads.png', colorBg: 'bg-element-light' },
        other: { label: 'Outro', iconEmoji: '🌐', colorBg: 'bg-element-light' },
    };

    const channelData = channelConfig[campaign.channel] || channelConfig.other;

    const getMonthName = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m] = dateStr.split('-').map(Number);
        // Se for YYYY-MM
        if (y && m) {
            const date = new Date(y, m - 1);
            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }
        // Se for ISO string
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col bg-card-light border-border-light shadow-2xl rounded-3xl p-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border-light scrollbar-track-transparent">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl font-bold text-text-primary-light">Editar Campanha</DialogTitle>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                            {/* Platform Icon with styling */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 relative overflow-hidden bg-element-light border border-border-light`}>
                                {channelData.iconSrc ? (
                                    <Image src={channelData.iconSrc} alt={channelData.label} fill className="object-contain p-1.5" />
                                ) : (
                                    <span className="text-lg">{channelData.iconEmoji}</span>
                                )}
                            </div>

                            <span className="font-bold text-lg text-text-primary-light">
                                {channelData.label}
                            </span>

                            {campaign.is_multi_month && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border-light bg-card-hover-light">
                                    <Link2 className="h-3.5 w-3.5 text-text-muted-light" />
                                    <span className="text-xs font-semibold text-text-primary-light">Multi-mês</span>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Wrapper for fields */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="campaign-name" className="text-xs font-semibold uppercase tracking-wider text-text-muted-light ml-1">Nome da Campanha</Label>
                                <Input
                                    id="campaign-name"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="Nome da campanha"
                                    className="h-12 rounded-xl border-border-light bg-bg-light focus:ring-accent-primary font-bold text-text-primary-light text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="budget" className="text-xs font-semibold uppercase tracking-wider text-text-muted-light ml-1">Investimento (R$)</Label>
                                <Input
                                    id="budget"
                                    type="text"
                                    inputMode="decimal"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value.replace(/\./g, ''))}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="h-12 rounded-xl border-border-light bg-bg-light focus:ring-accent-primary font-bold text-text-primary-light text-base"
                                    onFocus={(e) => (budget === '0' || budget === '0.00') && setBudget('')}
                                />
                            </div>
                        </div>

                        {/* Multi-month Visualization Section */}
                        {campaign.is_multi_month && (
                            <div className="bg-bg-light/50 border border-border-light rounded-xl p-4">
                                <h4 className="text-xs font-bold text-text-muted-light uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span>
                                    Planejamento Multi-mês
                                </h4>

                                {(() => {
                                    // Calculate logic
                                    const allItems = [
                                        {
                                            label: 'Mês Atual',
                                            data: campaign,
                                            amount: parseFloat(budget || '0'),
                                            isEditing: true
                                        },
                                        ...displayRelatedList.map(rel => ({
                                            label: 'Conectado',
                                            data: rel,
                                            amount: rel.budget,
                                            isEditing: false
                                        }))
                                    ];
                                    const uniqueItems = Array.from(new Map(allItems.map(item => [item.data.id, item])).values());

                                    // Sort
                                    uniqueItems.sort((a, b) => new Date(a.data.start_date).getTime() - new Date(b.data.start_date).getTime());

                                    const totalInvested = uniqueItems.reduce((acc, item) => acc + item.amount, 0);

                                    // Handler to redistribute
                                    const handleTotalBudgetChange = (newTotalStr: string) => {
                                        const cleanStr = newTotalStr.replace(/\./g, '');
                                        setTotalBudgetInput(cleanStr);
                                        const newTotal = parseFloat(cleanStr.replace(',', '.'));
                                        if (isNaN(newTotal) || newTotal < 0) return;
                                        if (totalInvested === 0) return;

                                        const ratio = newTotal / totalInvested;

                                        // Update current budget
                                        const currentAmount = parseFloat(budget || '0');
                                        setBudget((currentAmount * ratio).toFixed(2));

                                        // Update related campaigns locally
                                        setLocalRelatedCampaigns(prev => prev.map(c => ({
                                            ...c,
                                            budget: c.budget * ratio
                                        })));
                                    };

                                    // NEW: Handler for individual card editing
                                    const handleCardBudgetChange = (id: string, newValStr: string) => {
                                        const cleanStr = newValStr.replace(/\./g, '');
                                        setDistributeBudget(false); // Uncheck distribution automatically

                                        // Update Current Campaign
                                        if (id === campaign.id) {
                                            setBudget(cleanStr);
                                            return;
                                        }

                                        // Update Related Campaigns
                                        const newVal = parseFloat(cleanStr.replace(',', '.'));
                                        if (!isNaN(newVal) && newVal >= 0) {
                                            setLocalRelatedCampaigns(prev => prev.map(c =>
                                                c.id === id ? { ...c, budget: newVal } : c
                                            ));
                                        }
                                    };

                                    const confirmDateChange = () => {
                                        if (!pendingDateChange) return;
                                        const { id, type, date } = pendingDateChange;
                                        const newDateStr = format(date, 'yyyy-MM-dd');

                                        // Pre-flight: Get current total budget to preserve it
                                        const currentMainBudget = parseFloat(budget && !isNaN(parseFloat(budget.toString().replace(',', '.'))) ? budget.toString().replace(',', '.') : '0');

                                        // Create a unified list of campaigns (Main + Related) to process
                                        let allItems = [
                                            {
                                                id: campaign.id,
                                                start_date: currentDates.start,
                                                end_date: currentDates.end,
                                                budget: currentMainBudget,
                                                isMain: true,
                                                original: null as any
                                            },
                                            ...localRelatedCampaigns.map(c => ({
                                                id: c.id,
                                                start_date: c.start_date,
                                                end_date: c.end_date,
                                                budget: c.budget,
                                                isMain: false,
                                                original: c
                                            }))
                                        ];

                                        // 1. Apply the DATE change to the specific item
                                        allItems = allItems.map(item => {
                                            if (item.id === id) {
                                                return {
                                                    ...item,
                                                    start_date: type === 'start' ? newDateStr : item.start_date,
                                                    end_date: type === 'end' ? newDateStr : item.end_date
                                                };
                                            }
                                            return item;
                                        });

                                        // 2. Recalculate Distribution (Weighted by Days)
                                        const totalBudget = allItems.reduce((acc, item) => acc + item.budget, 0);

                                        // Calculate days for each
                                        const itemsWithDays = allItems.map(item => {
                                            // adding T12:00:00Z avoids timezone rolling the date back
                                            const s = new Date(item.start_date + 'T12:00:00Z');
                                            const e = new Date(item.end_date + 'T12:00:00Z');
                                            const diffTime = e.getTime() - s.getTime();
                                            // Inclusive days
                                            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                            return { ...item, days: days > 0 ? days : 1 };
                                        });

                                        const totalDays = itemsWithDays.reduce((acc, item) => acc + item.days, 0);

                                        if (totalDays > 0) {
                                            const dailyRate = totalBudget / totalDays;

                                            // 3. Update State
                                            // Update Main
                                            const newMain = itemsWithDays.find(i => i.isMain);
                                            if (newMain) {
                                                setCurrentDates({ start: newMain.start_date, end: newMain.end_date });
                                                // Update budget string, rounded to 2 decimals
                                                const newBg = parseFloat((newMain.days * dailyRate).toFixed(2));
                                                setBudget(newBg.toFixed(2));
                                            }

                                            // Update Related
                                            const newRelated = itemsWithDays
                                                .filter(i => !i.isMain)
                                                .map(i => ({
                                                    ...i.original,
                                                    start_date: i.start_date,
                                                    end_date: i.end_date,
                                                    // Round to 2 decimals
                                                    budget: parseFloat((i.days * dailyRate).toFixed(2))
                                                }));

                                            setLocalRelatedCampaigns(newRelated);
                                        }

                                        setPendingDateChange(null);
                                    };

                                    return (
                                        <>
                                            <div className="flex items-center justify-between mb-4 bg-card-light p-3 rounded-lg border border-border-light">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-text-primary-light">Investimento Total:</span>
                                                    {distributeBudget ? (
                                                        <Input
                                                            value={totalBudgetInput}
                                                            onChange={(e) => handleTotalBudgetChange(e.target.value)}
                                                            onBlur={() => {
                                                                const num = parseFloat(totalBudgetInput.replace(',', '.'));
                                                                if (!isNaN(num)) setTotalBudgetInput(num.toFixed(2).replace('.', ','));
                                                            }}
                                                            className="h-8 w-32 font-bold"
                                                            type="text"
                                                            inputMode="decimal"
                                                            onFocus={(e) => (totalBudgetInput === '0' || totalBudgetInput === '0,00' || totalBudgetInput === '0.00') && setTotalBudgetInput('')}
                                                        />
                                                    ) : (
                                                        <span className="text-lg font-bold text-accent-primary">{formatCurrency(totalInvested)}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="distribute"
                                                        checked={distributeBudget}
                                                        onCheckedChange={(checked) => {
                                                            setDistributeBudget(checked as boolean);
                                                            if (checked) {
                                                                setTotalBudgetInput(totalInvested.toFixed(2).replace('.', ','));
                                                            } else {
                                                                setTotalBudgetInput('');
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor="distribute"
                                                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-text-muted-light"
                                                    >
                                                        Redistribuir Orçamento
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 overflow-x-auto pb-4 px-1 -mx-1 pt-1">
                                                {uniqueItems.map((item, index) => {
                                                    const isCardEditing = editingCardId === item.data.id;
                                                    // Use raw string 'budget' for current campaign to avoid jumping, else number
                                                    const inputValue = (item.data.id === campaign.id) ? budget : item.amount;

                                                    const isFirst = index === 0;
                                                    const isLast = index === uniqueItems.length - 1;

                                                    // Determine the date to show/edit
                                                    let dateDisplay = null;
                                                    let dateType: 'start' | 'end' | null = null;
                                                    let currentDateValue: Date | undefined;

                                                    if (isFirst) {
                                                        dateType = 'start';
                                                        const dStr = (item.data.id === campaign.id) ? currentDates.start : item.data.start_date;
                                                        if (dStr) {
                                                            // Safer to parse YYYY-MM-DD as UTC to avoid timezone issues shifting the day
                                                            currentDateValue = new Date(dStr + 'T12:00:00Z');
                                                            dateDisplay = `Início: ${format(currentDateValue, 'dd/MM')}`;
                                                        }
                                                    } else if (isLast) {
                                                        dateType = 'end';
                                                        const dStr = (item.data.id === campaign.id) ? currentDates.end : item.data.end_date;
                                                        if (dStr) {
                                                            currentDateValue = new Date(dStr + 'T12:00:00Z');
                                                            dateDisplay = `Fim: ${format(currentDateValue, 'dd/MM')}`;
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={item.data.id}
                                                            onClick={(e) => {
                                                                // Prevent edit if clicking on popover trigger
                                                                if ((e.target as HTMLElement).closest('button')) return;
                                                                !isCardEditing && setEditingCardId(item.data.id);
                                                            }}
                                                            className={`bg-card-light rounded-lg p-3 shadow-sm relative overflow-visible flex-1 min-w-[140px] transition-all cursor-pointer ${item.isEditing ? 'ring-1 ring-accent-primary/20' : ''} ${isCardEditing ? 'border-2 border-accent-primary' : 'border border-border-light opacity-90 hover:border-accent-primary/50'}`}
                                                        >
                                                            {item.isEditing && <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary"></div>}
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-[10px] font-bold uppercase text-text-muted-light">
                                                                    {item.isEditing ? 'Editando' : getMonthName(item.data.start_date).split(' de ')[0]}
                                                                </span>
                                                            </div>
                                                            <p className="font-bold text-sm text-text-primary-light capitlize mb-1 truncate">
                                                                {getMonthName(item.data.start_date)}
                                                            </p>

                                                            {isCardEditing ? (
                                                                <Input
                                                                    autoFocus
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    className="h-7 text-lg font-bold p-0 border-0 border-b border-accent-primary rounded-none bg-transparent focus-visible:ring-0 px-1"
                                                                    value={inputValue}
                                                                    onChange={(e) => handleCardBudgetChange(item.data.id, e.target.value)}
                                                                    onBlur={() => setEditingCardId(null)}
                                                                    onFocus={(e) => (inputValue === 0 || inputValue === '0' || inputValue === '0.00') && handleCardBudgetChange(item.data.id, '')}
                                                                />
                                                            ) : (
                                                                <p className={`text-lg font-bold ${item.isEditing ? 'text-text-primary-light' : 'text-text-muted-light'}`}>
                                                                    {formatCurrency(item.amount)}
                                                                </p>
                                                            )}

                                                            {/* Date Picker Trigger (Only First/Last) */}
                                                            {dateType && currentDateValue && (
                                                                <div className="mt-3 pt-2 border-t border-border-light/50" onClick={(e) => e.stopPropagation()}>
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border-light bg-card-hover-light/50 hover:bg-card-hover-light hover:border-accent-primary/30 transition-all text-xs font-bold text-text-muted-light hover:text-text-primary-light group">
                                                                                <CalendarIcon className="h-3.5 w-3.5 text-text-muted-light group-hover:text-accent-primary transition-colors" />
                                                                                <span className="uppercase tracking-wider text-[10px]">{dateDisplay}</span>
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0" align="center">
                                                                            <Calendar
                                                                                mode="single"
                                                                                selected={currentDateValue}
                                                                                defaultMonth={currentDateValue}
                                                                                onSelect={(date) => {
                                                                                    if (date) setPendingDateChange({ id: item.data.id, type: dateType!, date });
                                                                                }}
                                                                                disabled={(date) => {
                                                                                    // Ensure we check against the card's original assigned month
                                                                                    // Use T12:00:00Z to ensure we land on the correct day/month regardless of timezone
                                                                                    const cardDate = new Date(item.data.start_date + 'T12:00:00Z');
                                                                                    // Reset to start of month
                                                                                    const minDate = new Date(cardDate.getFullYear(), cardDate.getMonth(), 1);
                                                                                    // End of month
                                                                                    const maxDate = new Date(cardDate.getFullYear(), cardDate.getMonth() + 1, 0);

                                                                                    // Normalize compare date to midnight to match calendar behavior
                                                                                    const compareDate = new Date(date);
                                                                                    compareDate.setHours(0, 0, 0, 0);

                                                                                    return compareDate < minDate || compareDate > maxDate;
                                                                                }}
                                                                                initialFocus
                                                                                locale={ptBR}
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {uniqueItems.length === 1 && (
                                                    <div className="bg-card-light rounded-lg p-3 border border-dashed border-border-light flex items-center justify-center text-center flex-1">
                                                        <p className="text-xs text-text-muted-light">Nenhum outro mês vinculado encontrado.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <AlertDialog open={!!pendingDateChange} onOpenChange={(open) => !open && setPendingDateChange(null)}>
                                                <AlertDialogContent className="bg-card-light border-border-light">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-text-primary-light">Confirmar alteração de data</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-text-muted-light">
                                                            Você tem certeza que deseja alterar a data de {pendingDateChange?.type === 'start' ? 'início' : 'término'} desta campanha para {pendingDateChange?.date && format(pendingDateChange.date, 'dd/MM/yyyy')}?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="border-border-light text-text-muted-light">Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={confirmDateChange} className="bg-accent-primary text-white hover:bg-accent-primary/90">Confirmar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="pt-1">
                            <p className="text-sm font-bold text-text-primary-light flex items-center gap-2">
                                <span className="text-text-muted-light font-normal">Período:</span>{' '}
                                {new Date(campaign.start_date).toLocaleDateString('pt-BR')} até{' '}
                                {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 mt-6">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted-light ml-1">Anotações</Label>
                            <span
                                className={`text-xs ${observations.length > maxChars ? 'text-red-500' : 'text-text-muted-light'
                                    }`}
                            >
                                {observations.length}/{maxChars}
                            </span>
                        </div>
                        <Textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Adicione observações sobre esta campanha..."
                            rows={5}
                            maxLength={maxChars}
                            className={`rounded-xl border-border-light bg-bg-light focus:ring-accent-primary resize-none ${observations.length > maxChars ? 'border-red-500' : ''}`}
                        />
                        {observations.length > maxChars && (
                            <p className="text-xs text-red-500 mt-1">
                                Texto excede o limite de {maxChars} caracteres
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-card-hover-light/50 border-t border-border-light flex-shrink-0 z-10">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-11 px-6 rounded-xl border-border-light font-bold text-text-muted-light hover:text-text-primary-light hover:bg-card-hover-light"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || observations.length > maxChars}
                        className="h-11 px-8 rounded-xl bg-text-primary-light text-bg-light hover:bg-text-primary-light/90 font-bold"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
