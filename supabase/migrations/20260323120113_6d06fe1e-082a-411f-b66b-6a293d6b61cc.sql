
-- Drop old columns from cardapio and add new ones for multiple options
ALTER TABLE public.cardapio 
  DROP COLUMN proteina,
  DROP COLUMN salada,
  DROP COLUMN acompanhamento;

ALTER TABLE public.cardapio
  ADD COLUMN misturas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN acompanhamentos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN tamanhos jsonb NOT NULL DEFAULT '[]';

-- tamanhos stores: [{"nome": "Mini", "preco": "14.00"}, {"nome": "Normal", "preco": "15.00"}]

-- Update pedidos_almoco to store selections
ALTER TABLE public.pedidos_almoco
  ADD COLUMN mistura text,
  ADD COLUMN tamanho text,
  ADD COLUMN acompanhamento text,
  ADD COLUMN observacoes text;
