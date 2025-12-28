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
    FileText,
    LogOut,
    Sun,
    Moon,
    GripVertical
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { ClientSwitcher } from './client-switcher';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
    onDeleteClient: (client: Client) => void;
    onEditClient: (client: Client) => void;
    userRole: 'admin' | 'analyst' | 'pm' | null;
    analysts: any[];
    selectedAnalystId: string;
    onSelectAnalyst: (id: string) => void;
    onLogout: () => void;
    currentUser: {
        name: string;
        email: string;
        role: 'admin' | 'analyst' | 'pm';
        avatar_url?: string | null;
    } | null;
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
    onDeleteCampaign,
    onDeleteClient,
    onEditClient,
    userRole,
    analysts,
    selectedAnalystId,
    onSelectAnalyst,
    onLogout,
    currentUser
}: StitchDashboardProps) {
    const { setTheme, theme } = useTheme();
    const activeClient = clients.find(c => c.id === activeClientId);

    // Editing State
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string | number>('');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [showObservationsModal, setShowObservationsModal] = useState(false);

    // Local state for DnD
    const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>(campaigns);
    const [isDragging, setIsDragging] = useState(false);

    // Sync local state with props when props change (and not dragging)
    useEffect(() => {
        if (!isDragging) {
            // Sort by position before setting local state to ensure consistency
            const sorted = [...campaigns].sort((a, b) => (a.position || 0) - (b.position || 0));
            setLocalCampaigns(sorted);
        }
        // Removing localCampaigns/isDragging from deps to prevent snap-back on drag end
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaigns]);

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

    // Derived filtered list from localCampaigns
    const filteredCampaigns = localCampaigns.filter(campaign => {
        const matchesSearch = campaign.campaign_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            campaign.channel.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Disable DnD if filtering
    const isDragEnabled = searchTerm === '';

    const handleDragEnd = async (result: DropResult) => {
        setIsDragging(false);
        if (!result.destination) return;

        const items = Array.from(localCampaigns);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Optimistic update of positions in local object to avoid flicker if props update comes slow
        const fastUpdate = items.map((item, index) => ({ ...item, position: index }));
        setLocalCampaigns(fastUpdate);

        // Update Backend
        const orderedIds = fastUpdate.map(c => c.id);

        try {
            await fetch('/api/campaigns/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds }),
            });
            // The parent `onUpdateCampaign` might eventually trigger a refresh,
            // which will re-sync `localCampaigns` from the `campaigns` prop.
        } catch (error) {
            console.error('Failed to save order', error);
            // Optionally, revert local state on error: setLocalCampaigns(campaigns);
        }
    };

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
            <header className="sticky top-0 z-30 py-4 px-6 bg-card-light/90 backdrop-blur-sm border-b border-border-light shadow-sm">
                <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">

                    {/* LEFT: Identity & Context Controls */}
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => setActiveClientId('')}>
                            <div className="w-10 h-10 bg-text-primary-light rounded-xl flex items-center justify-center text-white shadow-md">
                                <LayoutDashboard className="h-6 w-6" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-text-primary-light uppercase hidden xl:block">Budget Box</h1>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-border-light hidden md:block"></div>

                        {/* Global Filters */}
                        <div className="flex items-center gap-3">
                            {/* ADMIN FILTER */}
                            {(userRole === 'admin' || userRole === 'pm') && (
                                <Select value={selectedAnalystId} onValueChange={onSelectAnalyst}>
                                    <SelectTrigger className="w-[180px] h-11 rounded-full border-border-light bg-card-light text-text-primary-light font-medium hover:bg-card-hover-light focus:ring-accent-primary shadow-sm transition-all">
                                        <SelectValue placeholder="Filtrar por Responsável" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Analistas</SelectItem>
                                        {analysts.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <MonthYearPicker
                                className="w-11 h-11 rounded-full border-border-light bg-card-light text-text-primary-light font-medium hover:bg-card-hover-light focus:ring-accent-primary transition-all shadow-sm cursor-pointer"
                                value={selectedMonth}
                                onChange={onMonthChange}
                                iconOnly
                            />

                            {currentUser?.role === 'admin' && (
                                <a
                                    href="/admin/overview"
                                    className="w-11 h-11 rounded-full border border-border-light bg-white dark:bg-card-light text-text-muted-light hover:text-orange-500 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 flex items-center justify-center transition-all shadow-sm"
                                    title="Visão Geral Admin"
                                >
                                    <LayoutDashboard className="h-5 w-5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Actions & User */}
                    <div className="flex items-center gap-4 sm:gap-6">

                        {/* Client Context - Highly Visible */}
                        <div className="hidden sm:block">
                            <ClientSwitcher
                                clients={clients}
                                activeClientId={activeClientId}
                                onChange={setActiveClientId}
                            />
                        </div>

                        {/* Divider - Separate Context from Actions */}
                        <div className="h-8 w-px bg-border-light hidden sm:block"></div>

                        {/* Primary Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onNewCampaign}
                                className="flex-shrink-0 flex items-center gap-2 px-6 h-11 bg-accent-primary text-black rounded-full font-bold hover:bg-[#B2E030] hover:scale-105 active:scale-95 transition-all shadow-[0_4px_14px_rgba(195,245,59,0.3)] whitespace-nowrap">
                                <Plus className="h-5 w-5" />
                                <span className="hidden lg:inline">Nova Campanha</span>
                            </button>

                            {(userRole === 'admin' || userRole === 'pm' || userRole === 'analyst') && (
                                <button
                                    onClick={onNewClient}
                                    className="flex-shrink-0 w-11 h-11 rounded-full bg-card-light border border-border-light flex items-center justify-center text-text-muted-light hover:text-accent-primary hover:border-accent-primary hover:bg-card-hover-light transition-all shadow-sm"
                                    title="Novo Cliente"
                                >
                                    <UserPlus className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-border-light hidden sm:block"></div>

                        {/* System & Profile */}
                        <div className="flex items-center gap-4">
                            <button className="w-11 h-11 rounded-full bg-card-light border border-border-light flex items-center justify-center text-text-muted-light hover:text-text-primary-light hover:bg-card-hover-light transition-colors shadow-sm relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-3 right-3 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full hover:bg-card-hover-light transition-colors outline-none group">
                                        <div className="text-right hidden md:block pr-3">
                                            <p className="text-sm font-bold text-text-primary-light group-hover:text-text-primary-light transition-colors leading-tight whitespace-nowrap">
                                                {currentUser?.name || 'Usuário'}
                                            </p>
                                            <p className="text-xs text-text-muted-light group-hover:text-text-primary-light transition-colors font-medium whitespace-nowrap">
                                                {currentUser?.role === 'admin' ? 'Admin' :
                                                    currentUser?.role === 'pm' ? 'Gestor' : 'Analista'}
                                            </p>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-0.5 shadow-sm group-hover:shadow-md transition-all">
                                            <div className="w-full h-full rounded-full overflow-hidden relative bg-card-light">
                                                {currentUser?.avatar_url ? (
                                                    <Image src={currentUser.avatar_url} alt="Profile" fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-card-hover-light">
                                                        {currentUser?.name
                                                            ? currentUser.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                                            : 'U'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-card-light border border-border-light shadow-xl rounded-2xl p-2 mt-2">
                                    <DropdownMenuLabel className="font-normal px-2 py-2">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-bold leading-none text-text-primary-light">{currentUser?.name}</p>
                                            <p className="text-xs leading-none text-text-muted-light">{currentUser?.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-100 my-1" />

                                    {currentUser?.role === 'admin' && (
                                        <>
                                            <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 hover:bg-card-hover-light focus:bg-card-hover-light transition-colors text-text-primary-light" asChild>
                                                <a href="/admin/overview" className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                                                        <LayoutDashboard className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium">Visão Admin</span>
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border-light my-1" />
                                        </>
                                    )}
                                    <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 hover:bg-card-hover-light focus:bg-card-hover-light transition-colors text-text-primary-light" asChild>
                                        <a href="/profile" className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                <UserPlus className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">Meu Perfil</span>
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border-light my-1" />
                                    <DropdownMenuItem
                                        className="cursor-pointer rounded-xl px-3 py-2.5 hover:bg-card-hover-light focus:bg-card-hover-light transition-colors text-text-primary-light flex items-center gap-2"
                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                        </div>
                                        <span className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border-light my-1" />
                                    <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer rounded-xl px-3 py-2.5 flex items-center gap-2 font-medium" onClick={onLogout}>
                                        <div className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                                            <LogOut className="h-4 w-4" />
                                        </div>
                                        <span>Sair da conta</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1920px] mx-auto px-6 py-8">
                {!activeClient ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-4">Nenhum cliente encontrado</h2>
                            <p className="text-gray-600 mb-6">Cadastre seu primeiro cliente para começar</p>
                            <Button onClick={onNewClient}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Cliente
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-6">
                            {/* Top Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-bold uppercase tracking-wide text-text-primary-light">Budget Overview</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    {activeClient && (
                                        <>
                                            <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-card-light border border-border-light rounded-lg shadow-sm">
                                                <Calendar className="h-4 w-4 text-text-muted-light" />
                                                <span className="text-sm font-bold text-text-primary-light capitalize">
                                                    {(() => {
                                                        const [y, m] = selectedMonth.split('-').map(Number);
                                                        const date = new Date(y, m - 1);
                                                        const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
                                                        return `${monthName} ${y}`;
                                                    })()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => onEditClient(activeClient)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-muted-light hover:text-text-primary-light hover:bg-card-hover-light rounded-lg transition-colors"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Editar Cliente
                                            </button>
                                            <button
                                                onClick={() => onDeleteClient(activeClient)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Excluir Cliente
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Card 1: Plano Total */}
                                <div className="bg-card-light rounded-3xl p-6 border border-border-light relative overflow-hidden group hover:border-border-dark-hover transition-all">
                                    <div className="flex justify-between items-start mb-6 z-10 relative">
                                        <span className="text-text-muted-light font-medium tracking-wider text-xs uppercase">Plano Total</span>
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
                                    </div>
                                    <div className="flex flex-col items-center justify-center h-24 relative">
                                        <svg className="w-20 h-20 transform -rotate-90">
                                            <circle cx="40" cy="40" fill="none" r="36" stroke="var(--element-light)" strokeWidth="8"></circle>
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
                                    </div>
                                    <h3 className="text-3xl font-bold text-text-primary-light mb-2">{monthProgress.toFixed(1)}%</h3>
                                    <div className="w-full bg-element-light rounded-full h-2 mb-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-accent-orange to-yellow-400 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${monthProgress}%` }}>
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-muted-light">
                                        {Math.round((monthProgress / 100) * new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate())} dias percorridos
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
                                    <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)}>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left border-b border-border-light">
                                                    <th className="w-8 pb-4 pl-6"></th>
                                                    <th className="pb-4 pl-2 text-xs font-semibold text-text-muted-light uppercase tracking-wider min-w-[220px] align-bottom">Canal / Campanha</th>
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

                                                    <th className="pb-4 pr-6 text-xs font-semibold text-text-muted-light uppercase tracking-wider text-right align-bottom">Ações</th>
                                                </tr>
                                            </thead>
                                            <Droppable droppableId="campaigns-table" isDropDisabled={!isDragEnabled}>
                                                {(provided) => (
                                                    <tbody
                                                        className="space-y-4"
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                    >
                                                        {filteredCampaigns.map((campaign, index) => {
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
                                                            // Logic for status label
                                                            let statusLabel = 'Running';
                                                            if (calculation.daysRemaining === 0) statusLabel = 'Finalizado';
                                                            else if (new Date(campaign.start_date) > new Date()) statusLabel = 'Agendado';

                                                            // Logic for styling
                                                            const mockupStatusStyle = {
                                                                'Running': 'text-red-600 bg-red-500/10 border-red-500/20',
                                                                'Finalizado': 'text-gray-700 bg-gray-200 border-gray-300',
                                                                'Agendado': 'text-green-600 bg-green-500/10 border-green-500/20'
                                                            };
                                                            const statusClass = mockupStatusStyle[statusLabel as keyof typeof mockupStatusStyle] || mockupStatusStyle['Running'];

                                                            return (
                                                                <Draggable
                                                                    key={campaign.id}
                                                                    draggableId={campaign.id}
                                                                    index={index}
                                                                    isDragDisabled={!isDragEnabled}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <tr
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            className={cn(
                                                                                "group hover:bg-card-hover-light transition-colors rounded-xl border-b border-element-light/50 last:border-0",
                                                                                snapshot.isDragging && "bg-card-hover-light shadow-lg opacity-90"
                                                                            )}
                                                                        >
                                                                            <td className="py-4 pl-6 align-middle w-8 rounded-l-xl">
                                                                                {isDragEnabled && (
                                                                                    <div
                                                                                        {...provided.dragHandleProps}
                                                                                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors p-1"
                                                                                    >
                                                                                        <GripVertical className="w-5 h-5" />
                                                                                    </div>
                                                                                )}
                                                                            </td>

                                                                            <td className="py-4 pl-2 align-middle">
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

                                                                            <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                                                <span className="text-sm font-bold text-blue-500">{formatCurrency(campaign.budget)}</span>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle">
                                                                                <span className="text-xs text-text-muted-light whitespace-nowrap">
                                                                                    {(() => {
                                                                                        const formatDate = (dateStr: string) => {
                                                                                            if (!dateStr) return '-';
                                                                                            const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
                                                                                            const localDate = new Date(y, m - 1, d);
                                                                                            return localDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                                                                                                .replace(' de ', ' ').replace('.', '');
                                                                                        };
                                                                                        return `${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`;
                                                                                    })()}
                                                                                </span>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle text-center">
                                                                                {editingCell === `${campaign.id}|meta_percentage` ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        autoFocus
                                                                                        className="w-16 text-center border border-border-light rounded px-1 py-0.5 text-sm bg-card-light text-text-primary-light focus:ring-1 focus:ring-accent-primary outline-none"
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
                                                                                        className="cursor-pointer hover:bg-card-hover-light px-2 py-1 rounded inline-block transition-colors"
                                                                                    >
                                                                                        <span className="text-sm font-medium text-text-primary-light">{campaign.meta_percentage}%</span>
                                                                                    </div>
                                                                                )}
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                                                {editingCell === `${campaign.id}|current_spend` ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        autoFocus
                                                                                        className="w-24 border border-border-light rounded px-1 py-0.5 text-sm font-bold bg-card-light text-text-primary-light focus:ring-1 focus:ring-accent-primary outline-none"
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
                                                                                        className="cursor-pointer hover:bg-card-hover-light px-2 py-1 rounded inline-block transition-colors"
                                                                                    >
                                                                                        <span className="text-sm font-extrabold text-text-primary-light text-lg">{formatCurrency(campaign.current_spend)}</span>
                                                                                    </div>
                                                                                )}
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                                                <div className="flex flex-col text-xs font-medium gap-0.5">
                                                                                    <span className="text-green-600"><span className="opacity-70">{campaign.meta_percentage}%:</span> {formatCurrency(calculation.parcial97)}</span>
                                                                                    <span className="text-blue-500"><span className="opacity-70">100%:</span> {formatCurrency(calculation.parcial100)}</span>
                                                                                </div>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle text-center">
                                                                                <span className="text-sm font-medium text-text-primary-light">{percentMeta.toFixed(1)}%</span>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle whitespace-nowrap">
                                                                                <div className="flex flex-col text-xs font-medium gap-0.5">
                                                                                    <span className="text-green-600"><span className="opacity-70">{campaign.meta_percentage}%:</span> {formatCurrency(calculation.investDia97)}/dia</span>
                                                                                    <span className="text-blue-500"><span className="opacity-70">100%:</span> {formatCurrency(calculation.investDia100)}/dia</span>
                                                                                </div>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle text-center">
                                                                                <div className={cn("inline-flex items-center justify-center text-xs font-bold", calculation.spentBadgeColor)}>
                                                                                    {((campaign.current_spend / campaign.budget) * 100).toFixed(1)}%
                                                                                </div>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle text-center">
                                                                                <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border", statusClass)}>
                                                                                    {statusLabel === 'Running' ? <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" /> : null}
                                                                                    {statusLabel}
                                                                                </span>
                                                                            </td>

                                                                            <td className="py-4 px-3 align-middle">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-full bg-element-light rounded-full h-1.5">
                                                                                        <div className="bg-text-primary-light h-1.5 rounded-full" style={{ width: `${Math.min(calculation.percentTime, 100)}%` }}></div>
                                                                                    </div>
                                                                                    <span className="text-xs font-medium min-w-[30px]">{calculation.percentTime.toFixed(0)}%</span>
                                                                                </div>
                                                                            </td>



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
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        })}
                                                        {provided.placeholder}
                                                    </tbody>
                                                )}
                                            </Droppable>
                                        </table>
                                    </DragDropContext>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <ObservationsModal
                open={showObservationsModal}
                onClose={() => {
                    setShowObservationsModal(false);
                    setSelectedCampaign(null);
                }}
                campaign={selectedCampaign}
                onSave={async (data) => {
                    if (selectedCampaign) {
                        await onUpdateCampaign(selectedCampaign.id, data);
                    }
                }}
            />
        </div>
    );
}
