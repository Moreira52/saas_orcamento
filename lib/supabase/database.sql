-- Habilitar extensão UUID (gera IDs únicos automaticamente)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (preparada para sistema de login na Fase 2)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('analyst', 'pm', 'admin')), -- 3 níveis de permissão
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relacionamento Gestor de Projeto <> Analistas
-- Permite GP escolher quais analistas ele quer monitorar
CREATE TABLE pm_analyst_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pm_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analyst_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pm_id, analyst_id) -- Impede duplicar mesma relação
);

-- Tabela de clientes (cada aba = 1 cliente)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT, -- URL da logo (opcional) ou Base64
  analyst_id UUID REFERENCES users(id), -- Quem criou este cliente
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Badge "Atualizado há X horas"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete (não deletar fisicamente)
);

-- Tabela de campanhas (coração do sistema)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Se deletar cliente, deleta campanhas
  channel TEXT NOT NULL CHECK (channel IN ('meta_ads', 'google_ads', 'linkedin_ads', 'tiktok_ads', 'pinterest_ads', 'other')),
  campaign_type TEXT, -- Ex: Conversão, Awareness
  budget DECIMAL(12,2) NOT NULL, -- Plano de Mídia (ex: 10000.50)
  meta_percentage DECIMAL(5,2) DEFAULT 97.00, -- Meta padrão 97%, editável por linha
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_spend DECIMAL(12,2) DEFAULT 0.00, -- Investimento realizado (editável manualmente)
  observations TEXT CHECK (LENGTH(observations) <= 500), -- Máximo 500 caracteres
  parent_campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE, -- Vincula campanhas multi-mês
  is_multi_month BOOLEAN DEFAULT FALSE, -- TRUE se campanha cruza 2+ meses
  month_year TEXT NOT NULL, -- Formato: "2025-11" para filtrar por mês
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date), -- Impede data final < inicial
  CONSTRAINT valid_budget CHECK (budget > 0), -- Orçamento deve ser positivo
  CONSTRAINT valid_spend CHECK (current_spend >= 0) -- Investimento não pode ser negativo
);

-- Índices para acelerar buscas (performance)
CREATE INDEX idx_campaigns_client_month ON campaigns(client_id, month_year); -- Buscar campanhas de 1 cliente em 1 mês
CREATE INDEX idx_campaigns_parent ON campaigns(parent_campaign_id); -- Buscar partes de campanha multi-mês
CREATE INDEX idx_clients_analyst ON clients(analyst_id); -- Buscar clientes de 1 analista
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date); -- Buscar campanhas por período

-- Criar usuário admin padrão (você - MVP sem login)
INSERT INTO users (email, name, role) 
VALUES ('admin@saas.com', 'Administrador', 'admin');

-- Documentação das colunas (aparece no Supabase)
COMMENT ON TABLE campaigns IS 'Armazena campanhas de tráfego pago com cálculos de budget';
COMMENT ON COLUMN campaigns.month_year IS 'Formato: YYYY-MM para filtrar campanhas por mês';
COMMENT ON COLUMN campaigns.parent_campaign_id IS 'NULL para campanhas normais, aponta para campanha "mãe" se for multi-mês';
COMMENT ON COLUMN clients.logo_url IS 'Logo em Base64 (PNG/JPG) ou URL externa';
