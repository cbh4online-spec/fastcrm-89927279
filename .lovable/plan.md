

# Funcionalidades Inspiradas no Vinted

## Resumo

Implementar 3 funcionalidades inspiradas no Vinted: **Sistema de Ofertas** (negociacao de preco), **Condicao do Produto** (badges visuais de estado) e **Pesquisa Visual por IA** (upload de imagem para encontrar produtos semelhantes).

---

## 1. Condicao do Produto

Adicionar um campo `product_condition` a tabela `products` para classificar o estado dos artigos, com badges visuais na loja.

**Valores possiveis:**
- `new_with_tags` -- Novo com etiqueta
- `new_without_tags` -- Novo sem etiqueta
- `very_good` -- Muito bom
- `good` -- Bom
- `satisfactory` -- Satisfatorio

**UI na loja:**
- Badge colorido no card do produto (similar ao Vinted)
- Indicacao clara na pagina de detalhe do produto
- Filtro por condicao no sidebar de filtros

---

## 2. Sistema de Ofertas / Negociacao

Permitir que clientes facam propostas de preco, que o admin pode aceitar, recusar ou contrapropor.

**Fluxo:**
```text
  Cliente ve produto -> clica "Fazer Oferta"
       |
       v
  Preenche formulario (preco proposto + mensagem opcional)
       |
       v
  Oferta guardada na tabela store_offers (status: pending)
       |
       v
  Admin recebe notificacao e ve oferta no painel de encomendas
       |
       v
  Admin aceita -> gera cupao unico com desconto equivalente
  Admin recusa -> cliente e notificado
  Admin contrapropoe -> cliente ve novo valor e decide
```

**Regras:**
- Oferta minima: 50% do preco do produto (configuravel)
- Oferta expira em 48h se nao houver resposta
- Maximo 3 ofertas ativas por cliente por produto

---

## 3. Pesquisa Visual por IA

O cliente faz upload de uma imagem e a IA identifica produtos semelhantes no catalogo.

**Fluxo:**
```text
  Cliente clica no icone de camera na barra de pesquisa
       |
       v
  Seleciona/tira foto
       |
       v
  Imagem enviada para edge function store-visual-search
       |
       v
  IA (Gemini) analisa a imagem e descreve o que ve
       |
       v
  Descricao usada para pesquisar produtos por texto (nome + descricao + keywords)
       |
       v
  Resultados apresentados como pesquisa normal
```

---

## Seccao Tecnica

### Migracao SQL

**Coluna nova em `products`:**
- `product_condition TEXT DEFAULT NULL` -- condicao do produto

**Tabela `store_offers`:**
- `id`, `workspace_id`, `product_id`, `customer_email`, `customer_name`, `contact_id` (nullable)
- `offered_price`, `original_price`, `currency`
- `counter_price` (nullable, para contrapropostas do admin)
- `status` (pending, accepted, rejected, countered, expired, cancelled)
- `message` (mensagem do cliente)
- `admin_message` (resposta do admin)
- `coupon_code` (gerado ao aceitar)
- `expires_at`, `created_at`, `updated_at`

**RLS:** Leitura publica filtrada por email, escrita publica para insercao, update restrito

### Ficheiros a criar

- `src/hooks/useStoreOffers.ts` -- hooks para ofertas (criar, listar por admin, aceitar/recusar/contrapropor)
- `src/components/store/StoreOfferDialog.tsx` -- modal para o cliente fazer oferta na pagina do produto
- `src/components/store/StoreProductConditionBadge.tsx` -- badge de condicao (Novo, Muito bom, etc.)
- `src/components/store-settings/StoreOffersManager.tsx` -- painel admin para gerir ofertas recebidas
- `src/components/store/StoreVisualSearch.tsx` -- componente de upload de imagem para pesquisa
- `supabase/functions/store-visual-search/index.ts` -- edge function que usa Gemini para analisar a imagem e devolver termos de pesquisa

### Ficheiros a modificar

- `src/pages/store/StoreProductPage.tsx` -- adicionar badge de condicao e botao "Fazer Oferta"
- `src/components/store/StoreProductCard.tsx` -- mostrar badge de condicao no card
- `src/components/store/StoreFilterSidebar.tsx` -- novo filtro por condicao
- `src/components/store/StoreSearchAutocomplete.tsx` -- adicionar icone de camera para pesquisa visual
- `src/hooks/useStoreProducts.ts` -- incluir `product_condition` nos selects e suporte a filtro
- `src/pages/StoreSettingsPage.tsx` -- novo separador "Ofertas" para gerir propostas recebidas

### Edge Function -- `store-visual-search`

- Recebe imagem (base64) via POST
- Usa Lovable AI (Gemini Flash) para descrever o conteudo da imagem
- Retorna lista de termos de pesquisa extraidos
- O frontend usa esses termos para pesquisar no catalogo existente

### Dependencias

- Nenhuma nova -- utiliza Lovable AI (Gemini), componentes UI e hooks existentes

