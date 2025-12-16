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
        { value: 2, label: 'Feb' },
        { value: 3, label: 'Mar' },
        { value: 4, label: 'Apr' },
        { value: 5, label: 'May' },
        { value: 6, label: 'Jun' },
        { value: 7, label: 'Jul' },
        { value: 8, label: 'Aug' },
        { value: 9, label: 'Sep' },
        { value: 10, label: 'Oct' },
        { value: 11, label: 'Nov' },
        { value: 12, label: 'Dec' },
    ];

    // Formatar mês para exibição no botão
    const getDisplayValue = () => {
        const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', {
            month: 'long',
        });
        return `${monthName} ${selectedYear}`;
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
                        'w-[220px] justify-start text-left font-normal',
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
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <h3 className="font-semibold text-sm text-gray-900">Start date</h3>
                        <button
                            onClick={handleReset}
                            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Reset
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
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                        'hover:bg-gray-100',
                                        selectedMonth === month.value
                                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
                                            : 'bg-white border-2 border-gray-200 text-gray-700'
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
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                        'hover:bg-gray-100',
                                        selectedYear === year
                                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
                                            : 'bg-white border-2 border-gray-200 text-gray-700'
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
