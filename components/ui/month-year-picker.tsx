'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
    value: string; // Formato: "2024-08"
    onChange: (value: string) => void;
    className?: string;
}

export default function MonthYearPicker({ value, onChange, className }: MonthYearPickerProps) {
    const [open, setOpen] = useState(false);

    // Parse valor atual
    const [selectedYear, selectedMonth] = value.split('-').map(Number);

    // Gerar lista de anos (últimos 4 anos)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

    // Meses do ano
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

    // Formatar mês para exibição no botão
    const getDisplayValue = () => {
        const date = new Date(selectedYear, selectedMonth - 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
        // Capitalize first letter
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${selectedYear}`;
    };

    // Resetar para mês/ano atual
    const handleReset = () => {
        const now = new Date();
        const newValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        onChange(newValue);
        setOpen(false);
    };

    // Selecionar mês
    const handleMonthSelect = (month: number) => {
        const newValue = `${selectedYear}-${String(month).padStart(2, '0')}`;
        onChange(newValue);
        setOpen(false);
    };

    // Selecionar ano
    const handleYearSelect = (year: number) => {
        const newValue = `${year}-${String(selectedMonth).padStart(2, '0')}`;
        onChange(newValue);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-[220px] justify-start text-left font-normal capitalize',
                        className
                    )}
                >
                    <Calendar className="mr-2 h-4 w-4" />
                    {getDisplayValue()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
                <div className="bg-white rounded-lg shadow-lg">
                    {/* Header com título e reset */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <h3 className="font-bold text-sm text-gray-900">Período</h3>
                        <button
                            onClick={handleReset}
                            className="text-xs font-semibold text-gray-500 hover:text-accent-primary transition-colors uppercase tracking-wide"
                        >
                            Atual
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Grid de Meses */}
                        <div className="grid grid-cols-4 gap-2">
                            {months.map((month) => (
                                <button
                                    key={month.value}
                                    onClick={() => handleMonthSelect(month.value)}
                                    className={cn(
                                        'px-2 py-2 rounded-lg text-sm font-medium transition-all text-center',
                                        'hover:bg-gray-50',
                                        selectedMonth === month.value
                                            ? 'bg-accent-primary text-black shadow-sm font-bold scale-105'
                                            : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-300'
                                    )}
                                >
                                    {month.label}
                                </button>
                            ))}
                        </div>

                        {/* Grid de Anos */}
                        <div className="grid grid-cols-4 gap-2">
                            {years.map((year) => (
                                <button
                                    key={year}
                                    onClick={() => handleYearSelect(year)}
                                    className={cn(
                                        'px-2 py-2 rounded-lg text-sm font-medium transition-all text-center',
                                        'hover:bg-gray-50',
                                        selectedYear === year
                                            ? 'bg-accent-primary text-black shadow-sm font-bold scale-105'
                                            : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-300'
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
