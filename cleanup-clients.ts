
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis de ambiente Supabase não encontradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicateClients() {
    console.log('--- Iniciando Limpeza de Clientes Duplicados ---');

    // 1. Buscar todos os clientes com nome "Cliente Multi Mes"
    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', '%Multi Mes%');

    if (error) {
        console.error('❌ Erro ao buscar clientes:', error);
        return;
    }

    if (!clients || clients.length <= 1) {
        console.log('✅ Nenhum cliente duplicado encontrado ou apenas um existe.');
        return;
    }

    console.log(`⚠️ Encontrados ${clients.length} clientes duplicados.`);

    // 2. Verificar qual cliente TEM campanhas e qual NÃO TEM
    for (const client of clients) {
        const { count, error: countError } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

        if (countError) {
            console.error(`Erro ao verificar campanhas do cliente ${client.id}:`, countError);
            continue;
        }

        if (count === 0) {
            console.log(`🗑️ Deletando cliente VAZIO (ID: ${client.id})...`);

            const { error: delError } = await supabase
                .from('clients')
                .delete()
                .eq('id', client.id);

            if (delError) {
                console.error('❌ Erro ao deletar:', delError.message);
            } else {
                console.log('✅ Cliente deletado com sucesso.');
            }
        } else {
            console.log(`🛡️ Mantendo cliente COM DADOS (ID: ${client.id}) - Campanhas: ${count}`);
        }
    }

    console.log('--- Limpeza Concluída ---');
}

cleanupDuplicateClients();
