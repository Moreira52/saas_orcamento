
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { DollarSign, Target, TrendingUp, CalendarClock } from 'lucide-react';

interface MetricCardsProps {
    totalBudget: number;
    totalSpend: number;
    percentMeta: number;
    monthProgress: number;
}

export function MetricCards({
    totalBudget,
    totalSpend,
    percentMeta,
    monthProgress,
}: MetricCardsProps) {
    const metrics = [
        {
            title: 'Plano Total',
            value: formatCurrency(totalBudget),
            icon: DollarSign,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Investido',
            value: formatCurrency(totalSpend),
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            title: '% da Meta',
            value: formatPercentage(percentMeta),
            icon: Target,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            title: 'Avanço do Mês',
            value: formatPercentage(monthProgress),
            icon: CalendarClock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
                <Card key={metric.title} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            {metric.title}
                        </CardTitle>
                        <div className={`p-2 rounded-full ${metric.bgColor}`}>
                            <metric.icon className={`h-4 w-4 ${metric.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metric.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
