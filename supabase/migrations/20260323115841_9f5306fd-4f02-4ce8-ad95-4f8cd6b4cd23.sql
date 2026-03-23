
-- Cardápio do dia
CREATE TABLE public.cardapio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proteina TEXT NOT NULL,
  acompanhamento TEXT NOT NULL,
  salada TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(data)
);

ALTER TABLE public.cardapio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cardapio visivel para todos" ON public.cardapio
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir cardapio" ON public.cardapio
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar cardapio" ON public.cardapio
  FOR UPDATE USING (true);

-- Pedidos de almoço
CREATE TABLE public.pedidos_almoco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_colaborador TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  cardapio_id UUID REFERENCES public.cardapio(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nome_colaborador, data)
);

ALTER TABLE public.pedidos_almoco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pedidos visiveis para todos" ON public.pedidos_almoco
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir pedido" ON public.pedidos_almoco
  FOR INSERT WITH CHECK (true);

-- Ramais
CREATE TABLE public.ramais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departamento TEXT NOT NULL,
  ramal TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ramais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ramais visiveis para todos" ON public.ramais
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir ramal" ON public.ramais
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar ramal" ON public.ramais
  FOR UPDATE USING (true);
