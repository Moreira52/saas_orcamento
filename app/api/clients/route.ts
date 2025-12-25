import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/clients - Listar todos os clientes (com filtro de permissão)
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // 1. Verificar Autenticação
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Usuário não autenticado' },
                { status: 401 }
            );
        }

        // 2. Verificar Role do Usuário
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error('Erro ao buscar role do usuário:', userError);
            // Fallback seguro: trata como analista se der erro
        }

        const role = userData?.role || 'analyst';

        // 3. Montar Query Base
        let query = supabase
            .from('clients')
            .select('*')
            .is('deleted_at', null)
            .order('display_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        // 4. Aplicar Filtros de Permissão
        const searchParams = request.nextUrl.searchParams;
        const filterAnalystId = searchParams.get('analyst_id');

        if (role === 'admin') {
            // Admin vê tudo, mas pode filtrar se quiser
            if (filterAnalystId && filterAnalystId !== 'all') {
                query = query.eq('analyst_id', filterAnalystId);
            }
        } else {
            // Analista/PM vê APENAS seus clientes
            query = query.eq('analyst_id', user.id);
        }

        // 5. Executar Query
        const { data, error } = await query;

        if (error) {
            console.error('❌ Erro Supabase:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('❌ GET /api/clients error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno ao buscar clientes' },
            { status: 500 }
        );
    }
}

// POST /api/clients - Criar novo cliente
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Você precisa estar logado para criar clientes.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, logo_url } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nome do cliente é obrigatório' },
                { status: 400 }
            );
        }

        // Inserir novo cliente no banco vinculado ao usuário logado
        const { data, error } = await supabase
            .from('clients')
            .insert([
                {
                    name: name.trim(),
                    logo_url: logo_url || null,
                    analyst_id: user.id, // VINCULA AO USUÁRIO LOGADO
                    last_updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro Supabase:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

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
