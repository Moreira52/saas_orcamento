'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
    value: string; // Formato: "2024-08"
    onChange: (value: string) => void;
    className?: string;
    iconOnly?: boolean;
}

export default function MonthYearPicker({ value, onChange, className, iconOnly = false }: MonthYearPickerProps) {
    const [open, setOpen] = useState(false);

    // Parse valor atual do value prop
    const [initialYear, initialMonth] = value.split('-').map(Number);

    // Estados locais para controle da seleção antes de aplicar
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);

    // Sincronizar estado local quando o popover abre ou o valor externo muda
    useEffect(() => {
        if (open) {
            const [y, m] = value.split('-').map(Number);
            setSelectedYear(y);
            setSelectedMonth(m);
        }
    }, [open, value]);

    const months = [
        { value: 1, label: 'Jan' },
        { value: 2, label: 'Fev' },
        { value: 3, label: 'Mar' },
        { value: 4, label: 'Abr' },
        { value: 5, label: 'Mai' },
        { value: 6, label: 'Jun' },
        { value: 7, label: 'Jul' },
        { value: 8, label: 'Ago' },
        { value: 9, label: 'Set' },
        { value: 10, label: 'Out' },
        { value: 11, label: 'Nov' },
        { value: 12, label: 'Dez' },
    ];

    // Formatar mês para exibição no botão (usando value prop para display fechado)
    const getDisplayValue = () => {
        const [y, m] = value.split('-').map(Number);
        const date = new Date(y, m - 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
    };

    const handleSetCurrent = () => {
        const now = new Date();
        setSelectedYear(now.getFullYear());
        setSelectedMonth(now.getMonth() + 1);
    };

    const handleApply = () => {
        const newValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        onChange(newValue);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'justify-start text-left font-normal capitalize',
                        iconOnly ? 'w-11 px-0 justify-center' : 'w-[220px]',
                        className
                    )}
                >
                    <Calendar className={cn("h-4 w-4", !iconOnly && "mr-2")} />
                    {!iconOnly && getDisplayValue()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0 border-border-light bg-card-light rounded-xl shadow-xl overflow-hidden" align="start">
                <div className="bg-card-light p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-text-primary-light">Período</h3>
                        <button
                            onClick={handleSetCurrent}
                            className="text-xs font-bold text-text-muted-light hover:text-accent-primary transition-colors uppercase tracking-wider"
                        >
                            Atual
                        </button>
                    </div>

                    {/* Year Selector Carousel */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-1 hover:text-accent-primary text-text-muted-light transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedYear(y => y - 1)}
                                className="px-4 py-1.5 rounded-lg text-sm text-text-muted-light border border-border-light hover:bg-card-hover-light transition-all"
                            >
                                {selectedYear - 1}
                            </button>
                            <div className="px-5 py-2 rounded-lg text-base font-bold bg-accent-primary text-black shadow-sm">
                                {selectedYear}
                            </div>
                            <button
                                onClick={() => setSelectedYear(y => y + 1)}
                                className="px-4 py-1.5 rounded-lg text-sm text-text-muted-light border border-border-light hover:bg-card-hover-light transition-all"
                            >
                                {selectedYear + 1}
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            className="p-1 hover:text-accent-primary text-text-muted-light transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="h-px bg-border-light w-full mb-6 opacity-50" />

                    {/* Month Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        {months.map((month) => (
                            <button
                                key={month.value}
                                onClick={() => setSelectedMonth(month.value)}
                                className={cn(
                                    'py-2.5 rounded-lg text-sm font-medium transition-all text-center border',
                                    selectedMonth === month.value
                                        ? 'bg-accent-primary text-black border-accent-primary font-bold shadow-sm'
                                        : 'bg-transparent border-border-light text-text-muted-light hover:border-gray-300 hover:text-text-primary-light'
                                )}
                            >
                                {month.label}
                            </button>
                        ))}
                    </div>

                    {/* Apply Button */}
                    <Button
                        className="w-full h-11 bg-accent-primary text-black hover:bg-accent-primary/90 font-bold rounded-xl text-sm"
                        onClick={handleApply}
                    >
                        Aplicar Filtro
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
