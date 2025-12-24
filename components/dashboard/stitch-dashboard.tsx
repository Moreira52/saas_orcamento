'use client';

import {
    LayoutDashboard,
    LineChart,
    MessageSquare,
    ChevronDown,
    Bell,
    Plus,
    MoreHorizontal,
    ArrowUp,
    Search,
    Filter,
    Check,
    Calendar,
    CircleDollarSign,
    Target,
    UserPlus,
    Trash2,
    FileText
} from 'lucide-react';
import Image from 'next/image';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Campaign, Client } from '@/types/database';
import { useState, useEffect } from 'react';
import ObservationsModal from '@/components/modals/observations-modal';
import { useCampaignCalculations } from '@/lib/hooks/use-campaign-calculations';
import { cn } from '@/lib/utils';
import MonthYearPicker from '@/components/ui/month-year-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface StitchDashboardProps {
    clients: Client[];
    activeClientId: string | null;
    setActiveClientId: (id: string) => void;
    campaigns: Campaign[];
    totals: {
        budget: number;
        parcial97: number;
        currentSpend: number;
        parcial100: number;
        investDia97: number;
        investDia100: number;
    };
    monthProgress: number;
    percentMetaTotal: number;
    onNewCampaign: () => void;
    selectedMonth: string;
    onMonthChange: (date: string) => void;
    onNewClient: () => void;
    onUpdateCampaign: (id: string, data: Partial<Campaign>) => Promise<void>;
    onDeleteCampaign: (id: string) => Promise<void>;
}

export default function StitchDashboard({
    clients,
    activeClientId,
    setActiveClientId,
    campaigns,
    totals,
    monthProgress,
    percentMetaTotal,
    onNewCampaign,
    selectedMonth,
    onMonthChange,
    onNewClient,
    onUpdateCampaign,
    onDeleteCampaign
}: StitchDashboardProps) {
    const activeClient = clients.find(c => c.id === activeClientId);

    // Editing State
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string | number>('');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [showObservationsModal, setShowObservationsModal] = useState(false);

    const handleSave = async (id: string, field: string, value: any) => {
        try {
            let finalValue = value;
            if (field === 'current_spend' || field === 'meta_percentage') {
                const strVal = value.toString().replace(',', '.');
                const numValue = parseFloat(strVal);
                if (isNaN(numValue) || numValue < 0) return;
                finalValue = numValue;
            }
            await onUpdateCampaign(id, { [field]: finalValue });
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleImmediateSave = async (campaignId: string, field: string, value: string | number) => {
        await handleSave(campaignId, field, value);
        setEditingCell(null);
        setEditValue('');
    };

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCampaigns = campaigns.filter(campaign => {
        const matchesSearch = campaign.campaign_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            campaign.channel.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getChannelData = (channel: string) => {
        // Updated to use a uniform gray background for all icons as requested
        const commonBg = 'bg-element-light';
        const map: Record<string, { label: string, iconSrc?: string, iconEmoji?: string, colorBg: string }> = {
            meta_ads: { label: 'Meta Ads', iconSrc: '/channel-icons/meta-ads.png', colorBg: commonBg },
            google_ads: { label: 'Google Ads', iconSrc: '/channel-icons/google-ads.png', colorBg: commonBg },
            linkedin_ads: { label: 'LinkedIn Ads', iconSrc: '/channel-icons/linkedin-ads.png', colorBg: commonBg },
            tiktok_ads: { label: 'TikTok Ads', iconEmoji: '🎵', colorBg: commonBg },
            pinterest_ads: { label: 'Pinterest Ads', iconSrc: '/channel-icons/pinterest-ads.png', colorBg: commonBg },
            other: { label: 'Outro', iconEmoji: '🌐', colorBg: commonBg },
        };
        return map[channel] || map.other;
    };

    // Calculate previous month comparison (mocked for now as we don't have prev month data easily)
    const growthPercentage = 12;

    return (
        <div className="bg-bg-light min-h-screen font-sans text-text-primary-light">
            {/* Header */}
            <header className="sticky top-0 z-30 pt-6 pb-2 px-6 bg-card-light/90 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                <div className="max-w-[1920px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-text-primary-light rounded-full flex items-center justify-center text-white">
                                <LayoutDashboard className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-text-primary-light uppercase">Budget Box</h1>
                        </div>
                    </div>

                    {/* All Right Side Items */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <MonthYearPicker
                                className="w-[200px] h-[46px] rounded-full border-border-light bg-card-light text-text-primary-light font-medium hover:bg-card-hover-light focus:ring-accent-primary transition-all shadow-sm relative z-10 cursor-pointer"
                                value={selectedMonth}
                                onChange={onMonthChange}
                            />
                        </div>

                        <div className="h-8 w-px bg-border-light mx-2"></div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onNewCampaign}
                                className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-black rounded-full font-semibold hover:bg-[#B2E030] transition-colors shadow-[0_0_15px_rgba(195,245,59,0.3)]">
                                <Plus className="h-5 w-5" />
                                Nova Campanha
                            </button>

                            <Select value={activeClientId || ''} onValueChange={setActiveClientId}>
                                <SelectTrigger className="w-[200px] h-[46px] rounded-full border-border-light bg-card-light text-text-primary-light font-medium focus:ring-accent-primary">
                                    <SelectValue placeholder="Selecione o Cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <button
                                onClick={onNewClient}
                                className="w-[46px] h-[46px] rounded-full bg-card-light border border-border-light flex items-center justify-center text-text-muted-light hover:text-black hover:border-black transition-colors"
                                title="Novo Cliente"
                            >
                                <UserPlus className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="h-8 w-px bg-border-light mx-2"></div>

                        <button className="w-10 h-10 rounded-full bg-element-light hover:bg-element-hover-light border border-border-light flex items-center justify-center text-text-primary-light transition-colors">
                            <Bell className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-text-primary-light">João Silva</p>
                                <p className="text-xs text-text-muted-light">@joaosilva</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 overflow-hidden border border-gray-300 relative">
                                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">JS</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1920px] mx-auto px-6 py-8 grid grid-cols-1 gap-8">
                <div className="space-y-6">
                    {/* Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold uppercase tracking-wide text-text-primary-light">Budget Overview</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Actions moved to header as requested */}
                        </div>
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card 1: Plano Total */}
                        <div className="bg-card-light rounded-3xl p-6 border border-border-light relative overflow-hidden group hover:border-border-dark-hover transition-all">
                            <div className="flex justify-between items-start mb-6 z-10 relative">
                                <span className="text-text-muted-light font-medium tracking-wider text-xs uppercase">Plano Total</span>
                                <MoreHorizontal className="text-text-muted-light h-5 w-5" />
                            </div>
                            <div className="flex items-end gap-2 mb-2 z-10 relative">
                                <h3 className="text-3xl font-bold text-text-primary-light">{formatCurrency(totals.budget)}</h3>
                            </div>
                            <p className="text-xs text-text-muted-light mb-6 z-10 relative">Budget {selectedMonth}</p>
                            <div className="h-16 w-full absolute bottom-0 left-0 right-0 opacity-20 group-hover:opacity-40 transition-opacity">
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                                    <path d="M0,35 Q20,10 40,30 T80,20 T100,5" fill="none" stroke="#C3F53B" strokeWidth="2"></path>
                                    <path d="M0,35 Q20,10 40,30 T80,20 T100,5 V40 H0 Z" fill="url(#grad1)" opacity="0.5"></path>
                                    <defs>
                                        <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                                            <stop offset="0%" stopColor="#C3F53B" stopOpacity="1"></stop>
                                            <stop offset="100%" stopColor="#C3F53B" stopOpacity="0"></stop>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        </div>

                        {/* Card 2: Investido */}
                        <div className="bg-card-light rounded-3xl p-6 border border-border-light relative overflow-hidden group hover:border-border-dark-hover transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-text-muted-light font-medium tracking-wider text-xs uppercase">Investido</span>
                                <MoreHorizontal className="text-text-muted-light h-5 w-5" />
                            </div>
                            <div className="flex items-baseline gap-3 mb-1">
                                <h3 className="text-3xl font-bold text-text-primary-light">{formatCurrency(totals.currentSpend)}</h3>
                                <span className="text-accent-primary text-sm font-bold flex items-center">
                                    <ArrowUp className="h-3 w-3 mr-0.5" /> {growthPercentage}%
                                </span>
                            </div>
                            <p className="text-xs text-text-muted-light">Vs. Mês anterior</p>
                            <div className="absolute bottom-6 right-6 flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-accent-primary"></div>
                                <div className="w-2 h-2 rounded-full bg-accent-orange"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            </div>
                        </div>

                        {/* Card 3: % da Meta */}
                        <div className="bg-card-light rounded-3xl p-6 border border-border-light relative overflow-hidden group hover:border-border-dark-hover transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-text-muted-light font-medium tracking-wider text-xs uppercase">% da Meta</span>
                                <MoreHorizontal className="text-text-muted-light h-5 w-5" />
                            </div>
                            <div className="flex flex-col items-center justify-center h-24 relative">
                                <svg className="w-20 h-20 transform -rotate-90">
                                    <circle cx="40" cy="40" fill="none" r="36" stroke="#E2E8F0" strokeWidth="8"></circle>
                                    <circle
                                        cx="40"
                                        cy="40"
                                        fill="none"
                                        r="36"
                                        stroke="#C3F53B"
                                        strokeDasharray="226"
                                        strokeDashoffset={226 - (226 * Math.min(percentMetaTotal, 100)) / 100}
                                        strokeLinecap="round"
                                        strokeWidth="8">
                                    </circle>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-xl font-bold text-text-primary-light">{percentMetaTotal.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 4: Avanço do Mês */}
                        <div className="bg-card-light rounded-3xl p-6 border border-border-light relative overflow-hidden group hover:border-border-dark-hover transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-text-muted-light font-medium tracking-wider text-xs uppercase">Avanço do Mês</span>
                                <MoreHorizontal className="text-text-muted-light h-5 w-5" />
                            </div>
                            <h3 className="text-3xl font-bold text-text-primary-light mb-2">{monthProgress.toFixed(1)}%</h3>
                            <div className="w-full bg-element-light rounded-full h-2 mb-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-accent-orange to-yellow-400 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${monthProgress}%` }}>
                                </div>
                            </div>
                            <p className="text-xs text-text-muted-light">
                                {Math.floor((monthProgress / 100) * 30)} dias percorridos
                            </p>
                        </div>
                    </div>
                </div>

                {/* Campaign Table Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3 bg-card-light rounded-3xl border border-border-light p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-text-primary-light tracking-wide uppercase">Detalhes da Campanha</h3>

                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-border-light">
                                        <th className="pb-4 pl-6 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[220px] align-bottom">Canal / Campanha</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[120px] text-blue-500 align-bottom">Plano de Mídia</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[130px] align-bottom">Período</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-center align-bottom">Meta</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-text-primary-light min-w-[140px] align-bottom">Investimento <br />Utilizado</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[120px] align-bottom">Parciais</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-center align-bottom">% Meta</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[120px] align-bottom">Investimento <br />/ Dia</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-center align-bottom">% Gasto <br />Real</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-center align-bottom">Status</th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[120px] align-bottom"> % Tempo </th>
                                        <th className="pb-4 px-3 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[120px] align-bottom"> % Budget </th>
                                        <th className="pb-4 pr-6 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-right align-bottom">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="space-y-4">
                                    {filteredCampaigns.map((campaign) => {
                                        const channelData = getChannelData(campaign.channel);
                                        const calculation = useCampaignCalculations(
                                            campaign.budget,
                                            campaign.meta_percentage,
                                            campaign.start_date,
                                            campaign.end_date,
                                            campaign.current_spend
                                        );

                                        const percentMeta = calculation.percentMeta;
                                        const statusDisplay = {
                                            running: { label: 'Running', color: 'text-green-600 bg-green-500/10 border-green-500/20' },
                                            paused: { label: 'Paused', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' },
                                            ended: { label: 'Finalizado', color: 'text-gray-700 bg-gray-200 border-gray-300' },
                                            scheduled: { label: 'Agendado', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' }
                                        };
                                        const currentStatus = calculation.daysRemaining === 0 ? statusDisplay.ended : (calculation.totalDays > 0 ? statusDisplay.running : statusDisplay.scheduled);

                                        // Manually matching style of image for 'running' (pink/red in mockup) vs logical status.
                                        // Mockup: "Running" was red/pink. "Agendado" was green. "Finalizado" was gray.
                                        // I will trust the mockup colors for visual fidelity over logic if needed, but for "Running" usually Green is better.
                                        // Let's stick to standard logic colors I defined above for now unless strict adherence requested.
                                        // Wait, mockup: Running = Red/Pink. Agendado = Green.
                                        // I'll adopt the Mockup's unique coloration for "Running" to be distinctive.

                                        const mockupStatusStyle = {
                                            'Running': 'text-red-600 bg-red-500/10 border-red-500/20',
                                            'Finalizado': 'text-gray-700 bg-gray-200 border-gray-300',
                                            'Agendado': 'text-green-600 bg-green-500/10 border-green-500/20'
                                        };

                                        // Mapping my status to mockup labels/styles approximately
                                        let statusLabel = 'Running';
                                        if (calculation.daysRemaining === 0) statusLabel = 'Finalizado';
                                        else if (new Date(campaign.start_date) > new Date()) statusLabel = 'Agendado';

                                        const statusClass = mockupStatusStyle[statusLabel as keyof typeof mockupStatusStyle] || mockupStatusStyle['Running'];

                                        return (
                                            <tr key={campaign.id} className="group hover:bg-card-hover-light transition-colors rounded-xl border-b border-element-light/50 last:border-0">
                                                {/* CANAL / CAMPANHA */}
                                                <td className="py-4 pl-6 align-middle rounded-l-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 relative overflow-hidden", channelData.colorBg)}>
                                                            {channelData.iconSrc ? (
                                                                <Image src={channelData.iconSrc} alt={channelData.label} fill className="object-contain p-1.5" />
                                                            ) : (
                                                                <span className="text-sm">{channelData.iconEmoji}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-text-primary-light text-sm leading-tight">{campaign.campaign_type}</span>
                                                            <span className="text-[10px] text-text-muted-light leading-tight">{channelData.label}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* PLANO DE MÍDIA */}
                                                <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                    <span className="text-sm font-bold text-blue-500">{formatCurrency(campaign.budget)}</span>
                                                </td>

                                                {/* PERÍODO */}
                                                <td className="py-4 px-3 align-middle">
                                                    <span className="text-xs text-text-muted-light whitespace-nowrap">
                                                        {new Date(campaign.start_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace(' de ', ' ').replace('.', '')} - {new Date(campaign.end_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace(' de ', ' ').replace('.', '')}
                                                    </span>
                                                </td>

                                                {/* META */}
                                                <td className="py-4 px-3 align-middle text-center">
                                                    {editingCell === `${campaign.id}|meta_percentage` ? (
                                                        <input
                                                            type="number"
                                                            autoFocus
                                                            className="w-16 text-center border rounded px-1 py-0.5 text-sm"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleImmediateSave(campaign.id, 'meta_percentage', editValue)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleImmediateSave(campaign.id, 'meta_percentage', editValue);
                                                                else if (e.key === 'Escape') setEditingCell(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => {
                                                                setEditingCell(`${campaign.id}|meta_percentage`);
                                                                setEditValue(campaign.meta_percentage);
                                                            }}
                                                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded inline-block"
                                                        >
                                                            <span className="text-sm font-medium text-text-primary-light">{campaign.meta_percentage}%</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* INVESTIMENTO UTILIZADO */}
                                                <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                    {editingCell === `${campaign.id}|current_spend` ? (
                                                        <input
                                                            type="number"
                                                            autoFocus
                                                            className="w-24 border rounded px-1 py-0.5 text-sm font-bold"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleImmediateSave(campaign.id, 'current_spend', editValue)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleImmediateSave(campaign.id, 'current_spend', editValue);
                                                                else if (e.key === 'Escape') setEditingCell(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => {
                                                                setEditingCell(`${campaign.id}|current_spend`);
                                                                setEditValue(campaign.current_spend);
                                                            }}
                                                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded inline-block"
                                                        >
                                                            <span className="text-sm font-extrabold text-text-primary-light text-lg">{formatCurrency(campaign.current_spend)}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* PARCIAIS */}
                                                <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                    <div className="flex flex-col text-xs font-medium gap-0.5">
                                                        <span className="text-green-600"><span className="opacity-70">{campaign.meta_percentage}%:</span> {formatCurrency(calculation.parcial97)}</span>
                                                        <span className="text-blue-500"><span className="opacity-70">100%:</span> {formatCurrency(calculation.parcial100)}</span>
                                                    </div>
                                                </td>

                                                {/* % META */}
                                                <td className="py-4 px-3 align-middle text-center">
                                                    <span className="text-sm font-medium text-text-primary-light">{percentMeta.toFixed(1)}%</span>
                                                </td>

                                                {/* INVESTIMENTO/DIA */}
                                                <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                    <div className="flex flex-col text-xs font-medium gap-0.5">
                                                        <span className="text-green-600"><span className="opacity-70">{campaign.meta_percentage}%:</span> {formatCurrency(calculation.investDia97)}/dia</span>
                                                        <span className="text-blue-500"><span className="opacity-70">100%:</span> {formatCurrency(calculation.investDia100)}/dia</span>
                                                    </div>
                                                </td>

                                                {/* % GASTO REAL */}
                                                <td className="py-4 px-3 align-middle text-center">
                                                    <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                                                        {((campaign.current_spend / campaign.budget) * 100).toFixed(1)}%
                                                    </div>
                                                </td>

                                                {/* STATUS */}
                                                <td className="py-4 px-3 align-middle text-center">
                                                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border", statusClass)}>
                                                        {statusLabel === 'Running' ? <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" /> : null}
                                                        {statusLabel}
                                                    </span>
                                                </td>

                                                {/* % TEMPO */}
                                                <td className="py-4 px-3 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div className="bg-text-primary-light h-1.5 rounded-full" style={{ width: `${Math.min(calculation.percentTime, 100)}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-medium min-w-[30px]">{calculation.percentTime.toFixed(0)}%</span>
                                                    </div>
                                                </td>

                                                {/* % BUDGET */}
                                                <td className="py-4 px-3 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div className={cn("h-1.5 rounded-full transition-all",
                                                                calculation.percentBudget > 100 ? "bg-red-500" : "bg-green-500"
                                                            )} style={{ width: `${Math.min(calculation.percentBudget, 100)}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-medium min-w-[30px]">{calculation.percentBudget.toFixed(0)}%</span>
                                                    </div>
                                                </td>

                                                {/* AÇÕES */}
                                                <td className="py-4 pr-6 align-middle text-right rounded-r-xl">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCampaign(campaign);
                                                                setShowObservationsModal(true);
                                                            }}
                                                            className="text-text-muted-light hover:text-text-primary-light transition-colors p-1"
                                                            title="Editar observações"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Deletar esta campanha?')) {
                                                                    onDeleteCampaign(campaign.id);
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                                                            title="Deletar campanha"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <ObservationsModal
                open={showObservationsModal}
                onClose={() => {
                    setShowObservationsModal(false);
                    setSelectedCampaign(null);
                }}
                campaign={selectedCampaign}
                onSave={async (observations) => {
                    if (selectedCampaign) {
                        await onUpdateCampaign(selectedCampaign.id, { observations });
                    }
                }}
            />
        </div >
    );
}
