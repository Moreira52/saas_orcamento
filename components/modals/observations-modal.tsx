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
import { Badge } from '@/components/ui/badge';
import { Campaign } from '@/types/database';
import { getChannelIcon } from '@/lib/hooks/use-campaign-calculations';
import { toast } from 'sonner';

interface ObservationsModalProps {
    open: boolean;
    onClose: () => void;
    campaign: Campaign | null;
    onSave: (observations: string) => Promise<void>;
}

export default function ObservationsModal({
    open,
    onClose,
    campaign,
    onSave,
}: ObservationsModalProps) {
    const [observations, setObservations] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const maxChars = 500;

    // Carregar observações quando modal abre
    useEffect(() => {
        if (campaign) {
            setObservations(campaign.observations || '');
        }
    }, [campaign]);

    const handleSave = async () => {
        if (!campaign) return;

        setIsSaving(true);
        try {
            await onSave(observations);
            toast.success('Observações salvas com sucesso!');
            onClose();
        } catch (error) {
            toast.error('Erro ao salvar observações');
        } finally {
            setIsSaving(false);
        }
    };

    if (!campaign) return null;

    const channelNames: Record<string, string> = {
        meta_ads: 'Meta Ads',
        google_ads: 'Google Ads',
        linkedin_ads: 'LinkedIn Ads',
        tiktok_ads: 'TikTok Ads',
        pinterest_ads: 'Pinterest Ads',
        other: 'Outro',
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Observações da Campanha</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-lg">{getChannelIcon(campaign.channel)}</span>
                                <span className="font-medium text-gray-900">
                                    {channelNames[campaign.channel]}
                                </span>
                                {campaign.is_multi_month && (
                                    <Badge variant="outline" className="text-xs">
                                        🔗 Multi-mês
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                                <strong>Tipo:</strong> {campaign.campaign_type || 'Não definido'}
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Período:</strong>{' '}
                                {new Date(campaign.start_date).toLocaleDateString('pt-BR')} até{' '}
                                {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Anotações</label>
                        <span
                            className={`text-xs ${observations.length > maxChars ? 'text-red-600' : 'text-gray-500'
                                }`}
                        >
                            {observations.length}/{maxChars} caracteres
                        </span>
                    </div>
                    <Textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Adicione observações sobre esta campanha..."
                        rows={8}
                        maxLength={maxChars}
                        className={observations.length > maxChars ? 'border-red-500' : ''}
                    />
                    {observations.length > maxChars && (
                        <p className="text-xs text-red-600">
                            Texto excede o limite de {maxChars} caracteres
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || observations.length > maxChars}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
