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
import { Campaign } from '@/types/database';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ObservationsModalProps {
    open: boolean;
    onClose: () => void;
    campaign: Campaign | null;
    relatedCampaign?: Campaign | null;
    onSave: (data: { observations: string; campaign_type: string; budget: number }) => Promise<void>;
}

export default function ObservationsModal({
    open,
    onClose,
    campaign,
    relatedCampaign,
    onSave,
}: ObservationsModalProps) {
    const [observations, setObservations] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [budget, setBudget] = useState<string>('');
    const [localRelatedCampaign, setLocalRelatedCampaign] = useState<Campaign | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const maxChars = 500;

    // Carregar dados quando modal abre
    useEffect(() => {
        if (campaign) {
            setObservations(campaign.observations || '');
            setCampaignName(campaign.campaign_type || '');
            setBudget(campaign.budget?.toString() || '');
            setLocalRelatedCampaign(null); // Reset local fetch on open
        }
    }, [campaign]);

    // Fetch related if needed
    useEffect(() => {
        const fetchRelated = async () => {
            if (campaign?.is_multi_month && !relatedCampaign) {
                try {
                    let query = supabase.from('campaigns').select('*');

                    if (campaign.parent_campaign_id) {
                        // Eu sou filho, buscar pai
                        query = query.eq('id', campaign.parent_campaign_id);
                    } else {
                        // Eu sou pai (ou único), buscar filhos (ou outra parte)
                        query = query.eq('parent_campaign_id', campaign.id).neq('id', campaign.id);
                    }

                    const { data, error } = await query.single();
                    if (data && !error) {
                        setLocalRelatedCampaign(data as Campaign);
                    }
                } catch (err) {
                    console.error("Error fetching related campaign", err);
                }
            }
        };

        if (open && campaign?.is_multi_month && !relatedCampaign) {
            fetchRelated();
        }
    }, [campaign, relatedCampaign, open]);

    // Combine prop or fetched
    const displayRelated = relatedCampaign || localRelatedCampaign;

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
            <DialogContent className="sm:max-w-[600px] bg-card-light border-border-light shadow-2xl rounded-3xl p-0 overflow-hidden">
                <div className="p-6 pb-0">
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
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="h-12 rounded-xl border-border-light bg-bg-light focus:ring-accent-primary font-bold text-text-primary-light text-base"
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
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Mês Atual (Campanha em edição) */}
                                    <div className="bg-card-light rounded-lg p-3 border border-border-light shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary"></div>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold uppercase text-text-muted-light">Mês Atual</span>
                                            <Badge variant="secondary" className="text-[10px] h-5 bg-accent-primary/20 text-text-primary-light hover:bg-accent-primary/30 border-0">Editando</Badge>
                                        </div>
                                        <p className="font-bold text-sm text-text-primary-light capitlize mb-1">
                                            {getMonthName(campaign.start_date)}
                                        </p>
                                        <p className="text-lg font-bold text-text-primary-light">
                                            {formatCurrency(parseFloat(budget || '0'))}
                                        </p>
                                    </div>

                                    {/* Outro Mês (Related) */}
                                    {displayRelated ? (
                                        <div className="bg-card-light rounded-lg p-3 border border-border-light shadow-sm relative overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold uppercase text-text-muted-light">Próximo/Anterior</span>
                                            </div>
                                            <p className="font-bold text-sm text-text-primary-light capitlize mb-1">
                                                {getMonthName(displayRelated.start_date)}
                                            </p>
                                            <p className="text-lg font-bold text-text-muted-light">
                                                {formatCurrency(displayRelated.budget)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-card-light rounded-lg p-3 border border-dashed border-border-light flex items-center justify-center text-center">
                                            <p className="text-xs text-text-muted-light">Outra parte não encontrada neste mês/filtro.</p>
                                        </div>
                                    )}
                                </div>
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

                <DialogFooter className="p-6 bg-card-hover-light/50 border-t border-border-light mt-6">
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
