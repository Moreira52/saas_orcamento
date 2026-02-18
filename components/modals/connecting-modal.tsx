'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConnectingModalProps {
    open: boolean;
    onCancel: () => void;
}

export default function ConnectingModal({
    open,
    onCancel
}: ConnectingModalProps) {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogTitle className="sr-only">Conectando ao Google Ads</DialogTitle>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse"></div>
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">Vinculação em andamento</h2>
                    <p className="text-sm text-gray-500 max-w-[280px] mb-8">
                        Complete o login na janela que se abriu para conectar os serviços.
                    </p>

                    <Button variant="outline" onClick={onCancel} className="w-full rounded-full">
                        Cancelar Operação
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
