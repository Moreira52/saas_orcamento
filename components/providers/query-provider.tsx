'use client'; // Este componente roda no navegador (precisa de interatividade)

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
    // Criar QueryClient apenas 1 vez (useState preserva entre re-renders)
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Cache de 5 minutos (dados mudam manualmente, não precisa buscar toda hora)
                        staleTime: 5 * 60 * 1000,

                        // Tentar 2x em caso de erro de rede
                        retry: 2,

                        // Atualizar dados ao focar janela (detectar mudanças de outros usuários)
                        refetchOnWindowFocus: true,
                    },
                    mutations: {
                        // Mutations (salvar/deletar) tentam apenas 1x
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
