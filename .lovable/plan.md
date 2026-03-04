

# Gerar Imagens IA + Suporte Multi-Media no C2C

## Resumo
Adicionar ao formulário de criação de anúncio C2C a capacidade de gerar imagens com IA a partir do título, suportar múltiplas imagens, imagens 360° e vídeo.

## Alterações

### 1. Nova funcionalidade: Gerar imagem com IA (Edge Function)
**Ficheiro: `supabase/functions/ai-c2c-listing-assistant/index.ts`**
- Adicionar modo `generate-image` que usa o modelo `google/gemini-3-pro-image-preview` 
- Recebe `title`, `description`, `condition` e gera uma imagem do produto
- Retorna imagem em base64 que é depois uploaded ao storage `c2c-photos`
- Possibilidade de gerar múltiplas imagens (ex: ângulos diferentes) num só pedido

### 2. Hook para gerar imagem IA
**Ficheiro: `src/hooks/useC2CListingAI.ts`**
- Adicionar `useGenerateListingImage()` que chama o modo `generate-image`
- Retorna base64, converte para blob e faz upload ao `c2c-photos`

### 3. Expandir tipos de media no formulário
**Ficheiro: `src/pages/c2c/C2CCreateListing.tsx`**
- Separar a secção de fotos em tabs/secções: **Fotos**, **360°**, **Vídeo**
- **Fotos**: manter upload atual + botão "Gerar com IA" que usa título para criar imagens
- **360°**: upload de imagem panorâmica/360° (aceitar ficheiros de imagem panorâmica)
- **Vídeo**: upload de vídeo curto (aceitar `video/*`, limite ~50MB)
- Adicionar estados: `photos360: string[]` e `videos: string[]`
- Botão "Gerar com IA" ao lado do upload de fotos — gera 1-3 imagens com base no título

### 4. Schema: Adicionar campos ao c2c_listings
**Migração SQL:**
```sql
ALTER TABLE c2c_listings 
  ADD COLUMN IF NOT EXISTS photos_360 text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
```

### 5. Galeria multi-media no detalhe do anúncio
**Ficheiro: `src/pages/c2c/C2CListingDetail.tsx`**
- Expandir galeria para mostrar tabs: Fotos | 360° | Vídeo
- Fotos 360°: renderizar com CSS transform pan (drag para rodar)
- Vídeos: renderizar com `<video>` player nativo

### 6. Storage bucket para vídeos
**Migração SQL:**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('c2c-videos', 'c2c-videos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "c2c videos upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'c2c-videos');

CREATE POLICY "c2c videos read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'c2c-videos');
```

## Ficheiros a alterar
- `supabase/functions/ai-c2c-listing-assistant/index.ts` — modo `generate-image`
- `src/hooks/useC2CListingAI.ts` — hook `useGenerateListingImage`
- `src/pages/c2c/C2CCreateListing.tsx` — UI multi-media + botão gerar IA
- `src/pages/c2c/C2CListingDetail.tsx` — galeria multi-media
- `src/hooks/useC2CListings.ts` — atualizar interface C2CListing
- Migração SQL: colunas `photos_360`, `videos` + bucket `c2c-videos`

