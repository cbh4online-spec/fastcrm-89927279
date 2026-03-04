

# Gerar Foto 360° com IA a partir de Fotos Existentes

## Contexto
O utilizador quer que o sistema gere automaticamente uma "foto 360°" (vista panorâmica do produto de vários ângulos) a partir das fotos normais já carregadas ou geradas por IA, em vez de exigir upload manual de imagens 360°.

## Abordagem
Usar o modelo `google/gemini-3-pro-image-preview` para gerar múltiplas vistas do produto (frente, lado, trás, topo, etc.) a partir de uma foto existente, e combinar essas vistas numa experiência de rotação 360°.

## Alterações

### 1. Edge Function — Novo modo `generate-360`
**Ficheiro:** `supabase/functions/ai-c2c-listing-assistant/index.ts`
- Novo modo `generate-360` que recebe uma imagem (URL ou base64) de referência + título/descrição
- Gera 6-8 vistas do mesmo produto de ângulos diferentes (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
- Cada vista é gerada com prompt: "Generate the same product from [angle] view, consistent style and lighting..."
- Faz upload de cada imagem ao bucket `c2c-photos` no path `360-views/{uuid}/`
- Retorna array de URLs ordenadas por ângulo

### 2. Hook — `useGenerate360`
**Ficheiro:** `src/hooks/useC2CListingAI.ts`
- Nova mutation `useGenerate360` que chama o modo `generate-360`
- Recebe `{ image, title, description }` e retorna `string[]` (URLs das vistas)

### 3. UI — Botão "Gerar 360° com IA" no formulário
**Ficheiro:** `src/pages/c2c/C2CCreateListing.tsx`
- Na tab "360°", adicionar botão "Gerar 360° com IA" que:
  - Usa a primeira foto normal como referência
  - Chama `useGenerate360` com essa foto + título
  - Popula o estado `photos360` com as vistas geradas
- Manter upload manual como alternativa
- Mostrar spinner durante geração (pode demorar ~30-60s para 6 imagens)

### 4. Galeria 360° melhorada no detalhe
**Ficheiro:** `src/pages/c2c/C2CListingDetail.tsx`
- Se `photos_360` tem múltiplas imagens, mostrar viewer tipo "spin" (trocar imagem conforme o utilizador arrasta) em vez do pan CSS atual
- Cada posição de drag mapeia para uma imagem diferente do array, criando efeito de rotação real

## Ficheiros a alterar
- `supabase/functions/ai-c2c-listing-assistant/index.ts` — modo `generate-360`
- `src/hooks/useC2CListingAI.ts` — hook `useGenerate360`
- `src/pages/c2c/C2CCreateListing.tsx` — botão gerar 360° com IA
- `src/pages/c2c/C2CListingDetail.tsx` — viewer spin com múltiplas imagens

