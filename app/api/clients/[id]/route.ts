import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';

// PATCH /api/clients/[id] - Atualizar cliente existente
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Next.js 15+ params are async
) {
    try {
        const { id } = await params;
        const body = await request.json();
        let { name, logo_url } = body;

        // VALIDAÇÃO: Nome não pode ser vazio (se fornecido)
        if (name && name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nome não pode ser vazio' },
                { status: 400 }
            );
        }

        // Montar objeto com apenas campos fornecidos (update parcial)
        const updateData: any = {
            // updated_at não existe na tabela clients
        };

        if (name) updateData.name = name.trim();
        if (logo_url !== undefined) updateData.logo_url = logo_url; // Aceita NULL para remover logo

        // Atualizar no banco
        const { data, error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', id) // WHERE id = params.id
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                handleSupabaseError(error),
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('❌ PATCH /api/clients/[id] error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar cliente' },
            { status: 500 }
        );
    }
}

// DELETE /api/clients/[id] - Deletar cliente (com validação)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // VALIDAÇÃO: Verificar se cliente tem campanhas ativas
        const { count } = await supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true }) // Contar sem buscar dados (rápido)
            .eq('client_id', id);

        // Se tem campanhas, BLOQUEAR exclusão
        if (count && count > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Cliente possui ${count} campanha(s). Exclua as campanhas primeiro.`,
                },
                { status: 400 } // Bad Request
            );
        }

        // SOFT DELETE: não deletar fisicamente, apenas marcar data de exclusão
        const { error } = await supabase
            .from('clients')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            return NextResponse.json(
                handleSupabaseError(error),
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ DELETE /api/clients/[id] error:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao deletar cliente' },
            { status: 500 }
        );
    }
}
