'use client';

import { useState } from 'react';
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
import { Client } from '@/types/database';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteClientModalProps {
    open: boolean;
    onClose: () => void;
    client: Client | null;
    onConfirm: (clientId: string) => Promise<void>;
}

export default function DeleteClientModal({
    open,
    onClose,
    client,
    onConfirm,
}: DeleteClientModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!client) return;

        if (confirmText !== 'DELETAR') {
            toast.error('Digite DELETAR para confirmar');
            return;
        }

        setIsDeleting(true);
        try {
            await onConfirm(client.id);
            toast.success('Cliente deletado com sucesso!');
            setConfirmText('');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao deletar cliente');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        onClose();
    };

    if (!client) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Deletar Cliente
                    </DialogTitle>
                    <DialogDescription>
                        Esta ação não pode ser desfeita
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Informações do Cliente */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-3">
                            {client.logo_url && (
                                <img
                                    src={client.logo_url}
                                    alt={client.name}
                                    className="h-12 w-12 object-contain rounded"
                                />
                            )}
                            <div>
                                <p className="font-semibold text-gray-900">{client.name}</p>
                                <p className="text-sm text-gray-600">
                                    Criado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Aviso */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-red-900 mb-2">
                                    Atenção! Esta ação é irreversível
                                </p>
                                <ul className="list-disc list-inside text-red-700 space-y-1">
                                    <li>Todas as campanhas deste cliente serão deletadas</li>
                                    <li>Histórico de investimentos será perdido</li>
                                    <li>Dados não poderão ser recuperados</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Campo de Confirmação */}
                    <div>
                        <Label htmlFor="confirm" className="text-gray-900">
                            Digite <span className="font-bold text-red-600">DELETAR</span> para confirmar
                        </Label>
                        <Input
                            id="confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETAR"
                            className="mt-2 font-mono"
                            autoComplete="off"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isDeleting || confirmText !== 'DELETAR'}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isDeleting ? 'Deletando...' : 'Deletar Cliente'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
