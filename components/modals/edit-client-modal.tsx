'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Client } from '@/types/database';

const clientSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface EditClientModalProps {
    open: boolean;
    onClose: () => void;
    client: Client | null;
}

export default function EditClientModal({ open, onClose, client }: EditClientModalProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [logoFileName, setLogoFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<ClientFormData>({
        resolver: zodResolver(clientSchema),
    });

    useEffect(() => {
        if (client) {
            setValue('name', client.name);
            setLogoBase64(client.logo_url || null);
            setLogoFileName(client.logo_url ? 'Logo Existente' : null);
        }
    }, [client, setValue]);

    // Converter arquivo para Base64
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validação de tipo
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error('Formato inválido! Use PNG ou JPG.');
            return;
        }

        // Validação de tamanho (máx 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB em bytes
        if (file.size > maxSize) {
            toast.error('Imagem muito grande! Máximo 2MB.');
            return;
        }

        // Converter para Base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setLogoBase64(base64String);
            setLogoFileName(file.name);
        };
        reader.onerror = () => {
            toast.error('Erro ao carregar imagem');
        };
        reader.readAsDataURL(file);
    };

    // Remover imagem selecionada
    const handleRemoveLogo = () => {
        setLogoBase64(null);
        setLogoFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const updateClient = useMutation({
        mutationFn: async (data: ClientFormData & { logo_url?: string | null }) => {
            if (!client) throw new Error('Cliente inválido');

            // We need to implement PATCH client endpoint logic. 
            // Usually standard REST would be PATCH /api/clients/[id]
            const res = await fetch(`/api/clients/${client.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao atualizar cliente');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast.success('Cliente atualizado com sucesso!');
            reset();
            onClose();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const onSubmit = async (data: ClientFormData) => {
        setIsSubmitting(true);
        try {
            await updateClient.mutateAsync({
                ...data,
                logo_url: logoBase64,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                        Edite as informações do cliente
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Campo Nome */}
                    <div>
                        <Label htmlFor="name">Nome do Cliente *</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Empresa XYZ"
                            {...register('name')}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Upload de Logo */}
                    <div>
                        <Label>Logo do Cliente (opcional)</Label>
                        <div className="mt-2">
                            {!logoBase64 ? (
                                // Área de upload
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 mb-1">
                                        Clique para alterar a logo
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        PNG ou JPG • Máximo 2MB
                                    </p>
                                </div>
                            ) : (
                                // Preview da imagem
                                <div className="relative border-2 border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                            <img
                                                src={logoBase64}
                                                alt="Preview"
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {logoFileName || 'Logo atual'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Imagem selecionada
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveLogo}
                                            className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Input file oculto */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onClose();
                            }}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
