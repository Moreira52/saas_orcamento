import { createClient } from '@supabase/supabase-js';

// Buscar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validar se variáveis existem
if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Variáveis do Supabase não configuradas! Verifique .env.local');
}

// Criar cliente Supabase (reutilizado em todo app)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper para converter erros do Supabase em mensagens legíveis
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    success: false,
    error: error.message || 'Erro desconhecido ao acessar banco de dados'
  };
};
