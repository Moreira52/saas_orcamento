import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google'; // Google Font
import './globals.css';
import QueryProvider from '@/components/providers/query-provider';

// Configurar fonte Inter (mesma do Vercel/Linear)
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Budget Tracker - Gerenciamento de Tráfego Pago',
  description: 'Sistema de monitoramento de orçamento de campanhas de mídia digital',
};

import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${montserrat.className} ${montserrat.variable} font-thin antialiased`} suppressHydrationWarning>
        {/* QueryProvider envolve todo app = React Query disponível em qualquer componente */}
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
