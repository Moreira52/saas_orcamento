-- MIGRAÇÃO DE DADOS PARA ADMIN
-- Objetivo: Transferir todos os clientes antigos para o novo Admin "matheus.moreira@boomer.com.br"

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- 1. Buscar o ID do seu usuário novo pelo email
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'matheus.moreira@boomer.com.br';

    -- Verificação de segurança
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário matheus.moreira@boomer.com.br não encontrado! Verifique se o cadastro foi confirmado.';
    END IF;

    -- 2. Garantir que o perfil público existe e é ADMIN
    UPDATE public.users 
    SET role = 'admin' 
    WHERE id = admin_user_id;

    -- 3. Transferir Clientes "Órfãos" ou do usuário de teste antigo para você
    -- Atualiza todos os clientes que não têm dono OU que pertenciam a algum ID antigo desconhecido
    UPDATE public.clients
    SET analyst_id = admin_user_id
    WHERE analyst_id IS NULL 
       OR analyst_id NOT IN (SELECT id FROM auth.users);

    RAISE NOTICE 'Migração concluída com sucesso para o Admin ID: %', admin_user_id;
END $$;
