'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function IntegrationSuccess() {
    useEffect(() => {
        // Tenta se comunicar com a janela pai para avisar que terminou
        setTimeout(() => {
            window.close();
        }, 3000);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white rounded-lg shadow-sm border text-center max-w-sm mx-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Conectado com Sucesso!</h1>
                <p className="text-gray-500 mb-4">A integração foi realizada. Você pode fechar esta janela agora.</p>
                <button
                    onClick={() => window.close()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Fechar Janela
                </button>
            </div>
        </div>
    );
}
