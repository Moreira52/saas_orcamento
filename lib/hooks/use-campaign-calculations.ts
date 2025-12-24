import { differenceInDays, isPast, isFuture } from 'date-fns';

interface CampaignCalculations {
    totalDays: number;
    daysPassed: number;
    daysRemaining: number;
    parcial97: number;
    parcial100: number;
    percentMeta: number;
    investDia97: number;
    investDia100: number;
    percentRealSpent: number;
    percentTime: number;
    percentBudget: number;
    status: 'finished' | 'delayed' | 'on_pace' | 'ahead';
    statusColor: string;
    spentBadgeColor: string;
}

export function useCampaignCalculations(
    budget: number,
    metaPercentage: number,
    startDate: string,
    endDate: string,
    currentSpend: number
): CampaignCalculations {
    // Fix timezone: parse as local dates explicitly
    const parseDate = (str: string) => {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Normalize today to midnight for fair comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = differenceInDays(end, start) + 1;

    let daysPassed = 0;
    if (isPast(end)) {
        daysPassed = totalDays;
    } else if (isFuture(start)) {
        daysPassed = 0;
    } else {
        daysPassed = differenceInDays(today, start) + 1;
    }

    const daysRemaining = Math.max(0, totalDays - daysPassed);

    const metaDecimal = metaPercentage / 100;
    const parcial97 = (budget * metaDecimal * daysPassed) / totalDays;
    const parcial100 = (budget * daysPassed) / totalDays;

    const percentMeta = parcial97 > 0 ? (currentSpend / parcial97) * 100 : 0;

    const investDia97 = daysRemaining > 0
        ? ((budget * metaDecimal) - currentSpend) / daysRemaining
        : 0;

    const investDia100 = daysRemaining > 0
        ? (budget - currentSpend) / daysRemaining
        : 0;

    const percentRealSpent = (currentSpend / budget) * 100;
    const percentTime = (daysPassed / totalDays) * 100;
    const percentBudget = percentRealSpent;

    let status: CampaignCalculations['status'];
    let statusColor: string;

    if (isPast(end)) {
        status = 'finished';
        statusColor = 'bg-gray-100 text-gray-600 border-gray-300';
    } else {
        const paceDifference = parcial97 > 0
            ? ((currentSpend - parcial97) / parcial97) * 100
            : 0;

        if (paceDifference < -10) {
            status = 'delayed';
            statusColor = 'bg-red-50 text-red-700 border-red-200';
        } else if (paceDifference > 10) {
            status = 'ahead';
            statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
        } else {
            status = 'on_pace';
            statusColor = 'bg-green-50 text-green-700 border-green-200';
        }
    }

    let spentBadgeColor: string;
    if (percentRealSpent >= 90) {
        spentBadgeColor = 'bg-green-100 text-green-800';
    } else if (percentRealSpent >= 70) {
        spentBadgeColor = 'bg-yellow-100 text-yellow-800';
    } else {
        spentBadgeColor = 'bg-red-100 text-red-800';
    }

    return {
        totalDays,
        daysPassed,
        daysRemaining,
        parcial97: Math.max(0, parcial97),
        parcial100: Math.max(0, parcial100),
        percentMeta,
        investDia97: Math.max(0, investDia97),
        investDia100: Math.max(0, investDia100),
        percentRealSpent,
        percentTime,
        percentBudget,
        status,
        statusColor,
        spentBadgeColor,
    };
}

export function getStatusDisplay(status: CampaignCalculations['status']) {
    const displays = {
        finished: { icon: '⚫', text: 'Finalizada' },
        delayed: { icon: '🔴', text: 'Atrasado' },
        on_pace: { icon: '🟢', text: 'No Pace' },
        ahead: { icon: '🟡', text: 'Avançado' },
    };

    return displays[status];
}

export function getChannelIcon(channel: string) {
    const icons: Record<string, string> = {
        meta_ads: '📘',
        google_ads: '🔴',
        linkedin_ads: '💼',
        tiktok_ads: '🎵',
        pinterest_ads: '📌',
        other: '🌐',
    };

    return icons[channel] || '🌐';
}
