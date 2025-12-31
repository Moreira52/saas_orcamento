// Tipos de usuário
export type UserRole = 'analyst' | 'pm' | 'admin';

// Canais de mídia disponíveis
export type CampaignChannel =
    | 'meta_ads'      // Meta (Facebook/Instagram) Ads
    | 'google_ads'    // Google Ads
    | 'linkedin_ads'  // LinkedIn Ads
    | 'tiktok_ads'    // TikTok Ads
    | 'pinterest_ads' // Pinterest Ads
    | 'other';        // Outro canal

// Estrutura da tabela users
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
    avatar_url?: string | null;
    birth_date?: string | null;
    squad_id?: string | null;
}

export interface Squad {
    id: string;
    name: string;
    created_at: string;
}

// Estrutura da tabela clients
// Estrutura da tabela clients
export interface Client {
    id: string;
    name: string;
    logo_url: string | null; // Aceita Base64 ou URL externa
    analyst_id: string | null;
    last_updated_at: string;
    created_at: string;
    deleted_at: string | null;
    display_order: number | null;
}

// Estrutura da tabela campaigns
export interface Campaign {
    id: string;
    client_id: string;
    channel: CampaignChannel;
    campaign_type: string;
    budget: number;           // Plano de Mídia
    meta_percentage: number;  // Meta % (default 97)
    start_date: string;       // ISO format: "2025-11-20"
    end_date: string;
    current_spend: number;    // Investimento Utilizado
    observations: string | null;
    parent_campaign_id: string | null; // NULL = campanha normal, aponta para campanha "mãe" se for multi-mês
    is_multi_month: boolean;
    month_year: string;       // Ex: "2025-11"
    created_at: string;
    updated_at: string;
    position: number;
    last_budget_updated_at?: string | null;
    last_budget_updated_by?: string | null;
    last_editor_name?: string; // Virtual field from join
}
