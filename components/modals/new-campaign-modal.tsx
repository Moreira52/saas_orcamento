'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const campaignSchema = z.object({
    channel: z.enum(['meta_ads', 'google_ads', 'linkedin_ads', 'tiktok_ads', 'pinterest_ads', 'other']),
    campaign_type: z.string().min(1, 'Tipo de campanha é obrigatório').max(100),
    budget: z.number().min(0.01, 'Orçamento deve ser maior que R$ 0,00'),
    meta_percentage: z.number().min(0).max(100),
    start_date: z.date(),
    end_date: z.date(),
    observations: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface NewCampaignModalProps {
    open: boolean;
    onClose: () => void;
    clientId: string;
}

export default function NewCampaignModal({ open, onClose, clientId }: NewCampaignModalProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMultiMonth, setIsMultiMonth] = useState(false);
    const [monthsCount, setMonthsCount] = useState(0);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
    } = useForm<CampaignFormData>({
        resolver: zodResolver(campaignSchema),
        defaultValues: {
            meta_percentage: 97,
        },
    });

    const startDate = watch('start_date');
    const endDate = watch('end_date');

    // Detectar se campanha cruza meses
    useEffect(() => {
        if (startDate && endDate) {
            const monthsDiff = differenceInMonths(endDate, startDate);
            const crossesMonths = monthsDiff > 0;
            setIsMultiMonth(crossesMonths);
            setMonthsCount(monthsDiff + 1);
        } else {
            setIsMultiMonth(false);
        }
    }, [startDate, endDate]);

    const createCampaign = useMutation({
        mutationFn: async (data: CampaignFormData) => {
            const payload = {
                client_id: clientId,
                channel: data.channel,
                campaign_type: data.campaign_type,
                budget: data.budget,
                meta_percentage: data.meta_percentage,
                start_date: format(data.start_date, 'yyyy-MM-dd'),
                end_date: format(data.end_date, 'yyyy-MM-dd'),
                observations: data.observations || null,
            };

            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao criar campanha');
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });

            if (data.message) {
                toast.success(data.message); // Mensagem de campanha multi-mês
            } else {
                toast.success('Campanha criada com sucesso!');
            }

            reset();
            onClose();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const onSubmit = async (data: CampaignFormData) => {
        // Validação adicional: data final >= data inicial
        if (data.end_date < data.start_date) {
            toast.error('Data final deve ser maior ou igual à data inicial');
            return;
        }

        setIsSubmitting(true);
        try {
            await createCampaign.mutateAsync(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    const channelOptions = [
        { value: 'meta_ads', label: 'Meta Ads', iconSrc: '/channel-icons/meta-ads.png' },
        { value: 'google_ads', label: 'Google Ads', iconSrc: '/channel-icons/google-ads.png' },
        { value: 'linkedin_ads', label: 'LinkedIn Ads', iconSrc: '/channel-icons/linkedin-ads.png' },
        { value: 'tiktok_ads', label: 'TikTok Ads', iconSrc: '/channel-icons/tiktok-ads.png' },
        { value: 'pinterest_ads', label: 'Pinterest Ads', iconSrc: '/channel-icons/pinterest-ads.png' },
        { value: 'other', label: 'Outro Canal', iconEmoji: '🌐' },
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nova Campanha</DialogTitle>
                    <DialogDescription>
                        Adicione uma nova campanha de tráfego pago
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Canal */}
                    <div>
                        <Label htmlFor="channel">Canal *</Label>
                        <Controller
                            name="channel"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className={errors.channel ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Selecione o canal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {channelOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                <div className="flex items-center gap-2">
                                                    {option.iconSrc ? (
                                                        <div className="relative w-4 h-4">
                                                            <Image
                                                                src={option.iconSrc}
                                                                alt={option.label}
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="w-4 h-4 flex items-center justify-center text-sm">
                                                            {option.iconEmoji}
                                                        </span>
                                                    )}
                                                    <span>{option.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.channel && (
                            <p className="text-sm text-red-600 mt-1">{errors.channel.message}</p>
                        )}
                    </div>

                    {/* Tipo de Campanha */}
                    <div>
                        <Label htmlFor="campaign_type">Tipo de Campanha *</Label>
                        <Input
                            id="campaign_type"
                            placeholder="Ex: Conversão, Awareness, Remarketing"
                            {...register('campaign_type')}
                            className={errors.campaign_type ? 'border-red-500' : ''}
                        />
                        {errors.campaign_type && (
                            <p className="text-sm text-red-600 mt-1">{errors.campaign_type.message}</p>
                        )}
                    </div>

                    {/* Orçamento */}
                    <div>
                        <Label htmlFor="budget">Plano de Mídia (R$) *</Label>
                        <Input
                            id="budget"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="10000.00"
                            {...register('budget', { valueAsNumber: true })}
                            className={errors.budget ? 'border-red-500' : ''}
                        />
                        {errors.budget && (
                            <p className="text-sm text-red-600 mt-1">{errors.budget.message}</p>
                        )}
                    </div>

                    {/* Meta % */}
                    <div>
                        <Label htmlFor="meta_percentage">Meta (%) *</Label>
                        <Input
                            id="meta_percentage"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="97"
                            {...register('meta_percentage', { valueAsNumber: true })}
                            className={errors.meta_percentage ? 'border-red-500' : ''}
                        />
                        {errors.meta_percentage && (
                            <p className="text-sm text-red-600 mt-1">{errors.meta_percentage.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Meta padrão: 97% do orçamento total
                        </p>
                    </div>

                    {/* Período (Date Range) */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Data Inicial */}
                        <div>
                            <Label>Data Inicial *</Label>
                            <Controller
                                name="start_date"
                                control={control}
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !field.value && 'text-muted-foreground',
                                                    errors.start_date && 'border-red-500'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? (
                                                    format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                                ) : (
                                                    'Selecione'
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                locale={ptBR}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {errors.start_date && (
                                <p className="text-sm text-red-600 mt-1">{errors.start_date.message}</p>
                            )}
                        </div>

                        {/* Data Final */}
                        <div>
                            <Label>Data Final *</Label>
                            <Controller
                                name="end_date"
                                control={control}
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !field.value && 'text-muted-foreground',
                                                    errors.end_date && 'border-red-500'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? (
                                                    format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                                ) : (
                                                    'Selecione'
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                locale={ptBR}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {errors.end_date && (
                                <p className="text-sm text-red-600 mt-1">{errors.end_date.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Alerta de Campanha Multi-Mês */}
                    {isMultiMonth && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-blue-900">Campanha Multi-Mês Detectada</p>
                                <p className="text-blue-700 mt-1">
                                    Esta campanha cruza {monthsCount} {monthsCount === 2 ? 'mês' : 'meses'}.
                                    O orçamento será dividido automaticamente de forma proporcional aos dias de cada mês.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Observações */}
                    <div>
                        <Label htmlFor="observations">Observações (opcional)</Label>
                        <Textarea
                            id="observations"
                            placeholder="Anotações sobre esta campanha..."
                            rows={3}
                            maxLength={500}
                            {...register('observations')}
                            className={errors.observations ? 'border-red-500' : ''}
                        />
                        {errors.observations && (
                            <p className="text-sm text-red-600 mt-1">{errors.observations.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Máximo 500 caracteres
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                reset();
                                onClose();
                            }}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Criando...' : 'Criar Campanha'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
