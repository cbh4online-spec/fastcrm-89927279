
# Criar Produtos com Ajuda de IA - Modo Wizard Inteligente

## Objetivo
Criar um novo fluxo alternativo de criacao de produtos onde o utilizador descreve o que quer (em linguagem natural ou com SKU) e a IA preenche automaticamente todos os campos, apresentando um resumo para revisao antes de gravar.

## O que ja existe
O sistema ja tem componentes AI robustos no painel lateral do dialogo de criacao:
- **AIProductAssistant**: sugere categoria, preco, descricao e tipo com base no nome
- **SKUSearchPanel**: pesquisa por SKU via Firecrawl, extrai nome, descricao, imagens, especificacoes, precos
- **ProductImageGenerator**: gera imagens com IA (Gemini image model)
- **ai-product-assistant** edge function: suporta modos suggest, sku-search, generate-description, price-analysis, generate-product-image

Contudo, estes componentes funcionam como auxiliares no formulario manual - o utilizador ainda precisa de interagir campo a campo.

## Plano de Implementacao

### 1. Novo modo "ai-create" na edge function `ai-product-assistant`
Adicionar um modo que recebe um prompt livre (ex: "Camera de vigilancia 4K exterior com visao noturna") e devolve TODOS os campos do produto preenchidos de uma so vez:
- name (tecnico + comercial)
- category
- product_type
- billing_type
- base_price + price range
- short_description (comercial)
- specifications (objeto completo)
- sku sugerido
- beneficios

A IA usa tool calling para garantir output estruturado.

### 2. Novo componente `AIProductWizard.tsx`
Um dialogo alternativo com 3 passos:

**Passo 1 - Descrever**
- Campo de texto grande: "Descreva o produto que quer criar..."
- Opcao alternativa: "Ou insira um SKU/referencia"
- Botao "Gerar com IA"

**Passo 2 - Rever e Ajustar**
- Cards com todos os dados gerados pela IA, organizados por seccao
- Cada campo e editavel inline
- Botao para regenerar campos individuais
- Preview de imagens encontradas/geradas
- Indicador de confianca por campo

**Passo 3 - Confirmar**
- Resumo final estilo ficha de produto
- Botao "Criar Produto" que chama o mesmo `useCreateProduct`

### 3. Integracao na lista de produtos
Adicionar botao "Criar com IA" ao lado do botao "Criar Produto" existente em `ProductsList.tsx`, abrindo o wizard.

### 4. Melhorias na edge function
- Combinar pesquisa Firecrawl + geracao AI num unico fluxo quando SKU e fornecido
- Gerar imagem automaticamente se nenhuma for encontrada via web
- Sugerir beneficios e keywords para SEO da loja

## Detalhes Tecnicos

### Edge Function - novo modo `ai-create`
```text
Request:  { mode: "ai-create", prompt: "...", sku?: "..." }
Response: { success: true, data: { 
  name, commercialName, category, productType, billingType,
  basePrice, priceRange, shortDescription, commercialDescription,
  specifications, suggestedSku, benefits, images 
}}
```

Fluxo interno:
1. Se SKU fornecido -> pesquisa Firecrawl primeiro
2. Combina dados web + prompt do utilizador
3. Chama Gemini com tool calling para output estruturado
4. Se nao encontrou imagens -> gera com modelo de imagem
5. Devolve pacote completo

### Componentes Frontend
- `AIProductWizard.tsx` - dialogo wizard com 3 passos
- Reutiliza `useCreateProduct` para gravar
- Reutiliza `useProductAIAssistant` (com novo metodo `createFromPrompt`)

### Ficheiros a criar/editar
- **Editar**: `supabase/functions/ai-product-assistant/index.ts` (novo modo)
- **Editar**: `src/hooks/useProductAIAssistant.ts` (novo metodo)
- **Criar**: `src/components/products/AIProductWizard.tsx`
- **Editar**: `src/components/products/ProductsList.tsx` (botao novo)
