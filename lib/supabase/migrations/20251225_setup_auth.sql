-- PASSO 1: Criar função e trigger para sincronizar Auth -> Users
-- Isso garante que todo novo usuário criado no Auth do Supabase tenha um registro na tabela public.users

-- 1. Função que será executada quando um novo usuário for criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Sem Nome'), -- Pega o nome dos metadados ou define padrão
    COALESCE(new.raw_user_meta_data->>'role', 'analyst')   -- Role padrão é analista se não especificado
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger que dispara após INSERT na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- PASSO 2: Preparar Script de Migração de Dados (Para ser rodado DEPOIS que você criar sua conta)
-- Este script NÃO deve ser rodado agora, apenas salvo para uso futuro.
-- A lógica será:
-- UPDATE clients SET analyst_id = 'SEU_NOVO_UUID_AQUI' WHERE analyst_id IS NULL OR analyst_id IN (SELECT id FROM users WHERE email = 'admin@saas.com');
