-- Adiciona coluna de posição para ordenação personalizada
ALTER TABLE campaigns ADD COLUMN position INTEGER DEFAULT 0;

-- Atualiza posições existentes baseadas na data de criação para ter um ponto de partida
WITH ordered_campaigns AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as new_pos
  FROM campaigns
)
UPDATE campaigns
SET position = ordered_campaigns.new_pos
FROM ordered_campaigns
WHERE campaigns.id = ordered_campaigns.id;
