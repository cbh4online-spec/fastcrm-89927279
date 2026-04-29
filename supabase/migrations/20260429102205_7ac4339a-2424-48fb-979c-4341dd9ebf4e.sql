
-- ── PRODUTOS · WELCOME ──────────────────────────────────────────────
WITH p AS (
  INSERT INTO public.module_presentations (module_slug, tier, lang, title, description, min_score_percent, xp_reward, allow_live_mode)
  VALUES ('products', 'welcome', 'pt',
    'Bem-vindo ao módulo Produtos',
    'Aprenda a gerir o seu catálogo: criar produtos, organizar categorias e controlar stock.',
    70, 50, true)
  ON CONFLICT (module_slug, tier, lang) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
  RETURNING id
)
INSERT INTO public.module_onboarding_presentations (presentation_id, module_slug, slide_order, lang, heading, body, bullets, min_duration_seconds)
SELECT p.id, 'products', s.ord, 'pt', s.heading, s.body, s.bullets::jsonb, 4 FROM p, (VALUES
  (1, 'O catálogo é o motor do seu negócio',
    'Os Produtos são a base de propostas, faturas, encomendas e da loja. Um catálogo bem organizado acelera vendas e evita erros.',
    '["Centraliza tudo o que vende","Alimenta propostas, faturas e loja","Mantém preços e margens consistentes"]'),
  (2, 'Como criar um produto',
    'Use o botão "Adicionar Produto" para criar uma ficha com nome, SKU, preço e custo. Pode adicionar imagens, descrições e variantes.',
    '["Nome, SKU e categoria são obrigatórios","Defina preço e custo para calcular margem","Adicione imagens para a loja"]'),
  (3, 'Organize por categorias',
    'As categorias estruturam o catálogo e tornam a navegação mais rápida na loja, propostas e procura interna.',
    '["Crie categorias claras e curtas","Evite duplicar categorias semelhantes","Pode aninhar subcategorias"]'),
  (4, 'Controlo de stock',
    'Defina o stock disponível, estado (disponível, limitado, sob encomenda) e quantidades mínimas por encomenda (MOQ).',
    '["Acompanhe stock em tempo real","Alertas automáticos para stock baixo","Defina MOQ para evitar pedidos inviáveis"]'),
  (5, 'Próximos passos',
    'Já tem o essencial. Crie agora o seu primeiro produto e veja-o aparecer no pipeline de propostas e na loja.',
    '["Crie 1 produto de teste","Adicione 2-3 categorias","Veja o produto na loja"]')
) AS s(ord, heading, body, bullets);

WITH p AS (SELECT id FROM public.module_presentations WHERE module_slug='products' AND tier='welcome' AND lang='pt')
INSERT INTO public.module_quizzes (presentation_id, question, options, correct_option_index, explanation, order_index)
SELECT p.id, q.question, q.options::jsonb, q.correct, q.explanation, q.ord FROM p, (VALUES
  (1, 'Qual destes campos é obrigatório ao criar um produto?',
    '["Cor","Nome e SKU","Vídeo promocional","País de origem"]', 1,
    'Nome, SKU e categoria são obrigatórios para criar um produto.'),
  (2, 'Para que serve o MOQ?',
    '["Calcular IVA","Definir a quantidade mínima por encomenda","Gerar etiquetas","Traduzir descrições"]', 1,
    'MOQ (Minimum Order Quantity) impede encomendas abaixo do mínimo definido.'),
  (3, 'Onde aparecem os produtos depois de criados?',
    '["Apenas no admin","Em propostas, faturas, encomendas e loja","Só na loja","Só em relatórios"]', 1,
    'O catálogo alimenta todos os módulos comerciais.')
) AS q(ord, question, options, correct, explanation);

-- ── PRODUTOS · INTERMEDIATE ──────────────────────────────────────────
WITH p AS (
  INSERT INTO public.module_presentations (module_slug, tier, lang, title, description, min_score_percent, xp_reward, allow_live_mode, unlock_after_days)
  VALUES ('products', 'intermediate', 'pt',
    'Produtos · Nível Intermédio',
    'Atributos clínicos/técnicos, variantes, pacotes e gestão avançada de stock.',
    70, 75, true, 3)
  ON CONFLICT (module_slug, tier, lang) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
  RETURNING id
)
INSERT INTO public.module_onboarding_presentations (presentation_id, module_slug, slide_order, lang, heading, body, bullets, min_duration_seconds)
SELECT p.id, 'products', s.ord + 100, 'pt', s.heading, s.body, s.bullets::jsonb, 5 FROM p, (VALUES
  (1, 'Atributos avançados',
    'Adicione atributos como função, patologia, indicação ou protocolo para tornar o catálogo pesquisável e profissional.',
    '["Função: o que o produto faz","Patologia: condições que aborda","Indicação: quando usar","Protocolo: tratamentos associados"]'),
  (2, 'Variantes de produto',
    'Quando um produto tem versões (cor, tamanho, dosagem), use variantes em vez de criar produtos separados.',
    '["Mantém o catálogo limpo","Stock independente por variante","Preços diferenciados se necessário"]'),
  (3, 'Pacotes e bundles',
    'Combine produtos em pacotes para vender soluções completas. Ideal para upsell e propostas comerciais.',
    '["Crie bundles com desconto","Reaproveita produtos existentes","Aparece na loja como item único"]'),
  (4, 'Estados de stock e entregas',
    'Defina estados claros (disponível, limitado, sob encomenda, esgotado) e prazos de entrega para gerir expectativas.',
    '["4 estados de stock visíveis","Prazos de entrega por produto","Notas de stock para casos especiais"]'),
  (5, 'Múltiplos de encomenda',
    'Configure múltiplos (pack_size) para produtos vendidos em embalagens. O sistema valida automaticamente.',
    '["Pack size define a embalagem","Validação automática no carrinho","Evita pedidos partidos"]')
) AS s(ord, heading, body, bullets);

WITH p AS (SELECT id FROM public.module_presentations WHERE module_slug='products' AND tier='intermediate' AND lang='pt')
INSERT INTO public.module_quizzes (presentation_id, question, options, correct_option_index, explanation, order_index)
SELECT p.id, q.question, q.options::jsonb, q.correct, q.explanation, q.ord FROM p, (VALUES
  (1, 'Quando deve usar variantes em vez de criar novos produtos?',
    '["Quando muda apenas a embalagem","Quando o produto tem versões (cor, tamanho, dosagem)","Sempre","Nunca"]', 1,
    'Variantes mantêm o catálogo organizado e o stock independente por versão.'),
  (2, 'O que representa o atributo "Patologia"?',
    '["O preço do produto","As condições clínicas que o produto aborda","O fornecedor","A categoria fiscal"]', 1,
    'Patologia indica as condições clínicas associadas ao produto.'),
  (3, 'Para que serve o pack_size?',
    '["Calcular peso","Definir o múltiplo de venda (embalagem)","Definir cor","Calcular IVA"]', 1,
    'Pack size define o múltiplo da embalagem; o sistema valida automaticamente as quantidades.'),
  (4, 'Quantos estados de stock existem?',
    '["2","3","4","6"]', 2,
    'Disponível, limitado, sob encomenda e esgotado.')
) AS q(ord, question, options, correct, explanation);

-- ── PRODUTOS · ADVANCED ──────────────────────────────────────────────
WITH p AS (
  INSERT INTO public.module_presentations (module_slug, tier, lang, title, description, min_score_percent, xp_reward, allow_live_mode, unlock_after_days)
  VALUES ('products', 'advanced', 'pt',
    'Produtos · Nível Avançado',
    'Margens, preços B2B, automações de catálogo e sugestões com IA.',
    75, 100, true, 7)
  ON CONFLICT (module_slug, tier, lang) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
  RETURNING id
)
INSERT INTO public.module_onboarding_presentations (presentation_id, module_slug, slide_order, lang, heading, body, bullets, min_duration_seconds)
SELECT p.id, 'products', s.ord + 200, 'pt', s.heading, s.body, s.bullets::jsonb, 6 FROM p, (VALUES
  (1, 'Margens e proteção de preço',
    'O sistema monitoriza margens em tempo real e bloqueia preços abaixo do mínimo definido. Alertas automáticos avisam de outliers.',
    '["Margem mínima por produto","Bloqueio de preços abaixo do custo","Alertas de outliers automáticos"]'),
  (2, 'Catálogo B2B e preços por nível',
    'Configure tabelas de preços por parceiro ou volume. O Partner Center aplica automaticamente as regras certas.',
    '["Preços por tier (START/GROW/PRO)","Descontos por volume","Tabelas isoladas por parceiro"]'),
  (3, 'Importação e sincronização',
    'Importe catálogos de fornecedores com staging persistente e matching SKU em 7 níveis para evitar duplicados.',
    '["Staging persistente por fornecedor","Matching SKU em 7 níveis","Atualização incremental"]'),
  (4, 'Sugestões com IA',
    'A IA sugere descrições, layouts de loja e agrupamentos de catálogo com base nos seus dados.',
    '["Descrições geradas por IA","Layouts otimizados","Agrupamentos automáticos por categoria"]'),
  (5, 'Analytics de produto',
    'Veja quais produtos convertem mais em propostas, margens médias, tendências de preço e produtos inativos.',
    '["Top em propostas","Taxas de conversão","Produtos sem movimento (90 dias)"]')
) AS s(ord, heading, body, bullets);

WITH p AS (SELECT id FROM public.module_presentations WHERE module_slug='products' AND tier='advanced' AND lang='pt')
INSERT INTO public.module_quizzes (presentation_id, question, options, correct_option_index, explanation, order_index)
SELECT p.id, q.question, q.options::jsonb, q.correct, q.explanation, q.ord FROM p, (VALUES
  (1, 'O que acontece se tentar definir um preço abaixo do mínimo configurado?',
    '["Nada","O sistema bloqueia e alerta","Aplica desconto","Apaga o produto"]', 1,
    'A proteção de margem bloqueia preços inválidos e gera alertas.'),
  (2, 'Como funciona a importação de catálogos de fornecedores?',
    '["Substitui tudo","Staging persistente com matching SKU em 7 níveis","Apenas manual","Por email"]', 1,
    'O pipeline usa staging persistente e matching em 7 níveis para evitar duplicados.'),
  (3, 'O que a IA do catálogo NÃO faz?',
    '["Sugere descrições","Sugere layouts","Define preço final automaticamente","Agrupa por categoria"]', 2,
    'A IA sugere conteúdos e organização, mas o preço final é sempre decisão humana.'),
  (4, 'Que métrica indica produtos sem movimento?',
    '["Top em propostas","Margem média","Inactive products (90 dias)","Conversion rate"]', 2,
    'Inactive products lista produtos sem movimento no período definido (default 90 dias).')
) AS q(ord, question, options, correct, explanation);
