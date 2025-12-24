'use client';

import * as React from 'react';
import { Check, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Client } from '@/types/database';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ClientSwitcherProps {
    clients: Client[];
    activeClientId: string | null;
    onChange: (id: string) => void;
}

interface SortableItemProps {
    client: Client;
    isActive: boolean;
    onSelect: (id: string) => void;
}

function SortableItem({ client, isActive, onSelect }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: client.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                isDragging && 'opacity-50 bg-accent/50'
            )}
            onClick={() => onSelect(client.id)}
        >
            <span className="flex-1 truncate">{client.name}</span>
            {isActive && <Check className="ml-auto h-4 w-4" />}
        </div>
    );
}

export function ClientSwitcher({ clients, activeClientId, onChange }: ClientSwitcherProps) {
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState(clients);
    const queryClient = useQueryClient();

    React.useEffect(() => {
        setItems(clients);
    }, [clients]);

    const activeClient = items.find((c) => c.id === activeClientId);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const reorderMutation = useMutation({
        mutationFn: async (orderedItems: Client[]) => {
            const payload = {
                items: orderedItems.map((item, index) => ({
                    id: item.id,
                    display_order: index,
                })),
            };
            const res = await fetch('/api/clients/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Falha ao salvar ordem');
            return res.json();
        },
        onSuccess: () => {
            // Invalidate to ensure sync, though we updated local state proactively
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
        onError: () => {
            toast.error('Erro ao salvar a ordem dos clientes');
        }
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger save
                reorderMutation.mutate(newItems);

                return newItems;
            });
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] h-[46px] rounded-full border-border-light bg-card-light text-text-primary-light font-medium focus:ring-accent-primary justify-between shadow-sm hover:bg-card-hover-light"
                >
                    {activeClient ? activeClient.name : 'Selecione o Cliente'}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-white" align="start">
                <div className="p-1">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                {items.map((client) => (
                                    <SortableItem
                                        key={client.id}
                                        client={client}
                                        isActive={activeClientId === client.id}
                                        onSelect={(id) => {
                                            onChange(id);
                                            setOpen(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </PopoverContent>
        </Popover>
    );
}
