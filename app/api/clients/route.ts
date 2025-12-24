import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';

// GET /api/clients - Listar todos os clientes (exceto deletados)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('clients')                        // Tabela clients
            .select('*')                            // Buscar todas as colunas
            .is('deleted_at', null)                 // Apenas clientes ativos (soft delete)
            .order('display_order', { ascending: true, nullsFirst: false }) // Prioriza ordem manual
            .order('created_at', { ascending: false }); // Desempate por mais novos


        // Se Supabase retornou erro
        if (error) {
            return NextResponse.json(
                handleSupabaseError(error),
                { status: 500 } // Internal Server Error
            );
        }

        // Sucesso: retornar dados
        return NextResponse.json({ success: true, data });

    } catch (error) {
        // Erro inesperado (ex: Supabase offline)
        console.error('❌ GET /api/clients error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar clientes' },
            { status: 500 }
        );
    }
}

// POST /api/clients - Criar novo cliente
// POST /api/clients - Criar novo cliente
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, logo_url, analyst_id } = body; // Mudou de logo_base64 para logo_url

        // Validação: Nome é obrigatório
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nome do cliente é obrigatório' },
                { status: 400 }
            );
        }

        // Validação opcional: Se logo_url fornecido e é Base64, verificar formato
        if (logo_url && logo_url.startsWith('data:image/')) {
            // É Base64 válido
            console.log('✅ Logo Base64 recebida');
        } else if (logo_url && !logo_url.startsWith('http')) {
            // Não é Base64 nem URL
            return NextResponse.json(
                { success: false, error: 'Logo deve ser Base64 ou URL válida' },
                { status: 400 }
            );
        }

        // Buscar ID do usuário admin padrão (MVP sem autenticação)
        const { data: adminUser } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .single();

        // Inserir novo cliente no banco
        const { data, error } = await supabase
            .from('clients')
            .insert([
                {
                    name: name.trim(),
                    logo_url: logo_url || null, // Base64 ou URL ou NULL
                    analyst_id: analyst_id || adminUser?.id,
                    last_updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro Supabase:', error);
            return NextResponse.json(
                handleSupabaseError(error),
                { status: 500 }
            );
        }

        console.log('✅ Cliente criado:', data);
        return NextResponse.json(
            { success: true, data },
            { status: 201 }
        );

    } catch (error) {
        console.error('❌ POST /api/clients error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao criar cliente' },
            { status: 500 }
        );
    }
}
