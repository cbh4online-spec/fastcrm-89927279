

# Plano: Galeria de Imagens com Geração IA (Gemini Banana)

## Problema Atual
A tab de Imagem só suporta **1 imagem** via URL ou geração IA. Falta suporte para múltiplas imagens e controlo sobre o prompt de geração.

## O Que Vai Ser Feito

### 1. Suporte a Múltiplas Imagens no Editor
- Substituir o campo `image_url` (string) por `images` (array de strings)
- Galeria visual com grid de imagens, drag para reordenar
- Botão para adicionar via URL ou gerar com IA
- Possibilidade de remover imagens individuais
- Manter backward compatibility com `image_url` existente

### 2. Geração de Imagens com Prompt Personalizado
- Input de prompt dedicado na tab de imagem para descrever o que quer gerar
- Selector de estilo: "Fotografia", "Ilustração 3D", "Flat Design", "Minimalista"
- Botão "Gerar com IA" que usa o prompt + contexto do step
- Preview imediato da imagem gerada antes de adicionar à galeria

### 3. Edge Function Atualizada
- Melhorar o prompt de geração usando o modelo `google/gemini-3.1-flash-image-preview`
- Aceitar parâmetro `imageStyle` para variar o estilo visual
- Aceitar `count` para gerar múltiplas imagens numa chamada (sequencial)
- Upload automático ao storage `funnel-assets`

### 4. Página Pública com Galeria
- Renderizar múltiplas imagens como carousel/galeria no `PublicFunnelPage`
- Fallback para `image_url` singular (compatibilidade)

## Ficheiros a Alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/funnels/FunnelStepEditor.tsx` | Tab imagem com galeria, prompt IA, selector de estilo, multi-imagem |
| `supabase/functions/ai-funnel-content/index.ts` | Melhorar prompt de imagem, aceitar estilo e count |
| `src/pages/PublicFunnelPage.tsx` | Renderizar galeria de imagens |

## Detalhes Técnicos

**Estrutura de content expandida:**
```typescript
{
  // ... campos existentes
  image_url: string,         // backward compat
  images: string[],          // NOVO - array de URLs
}
```

**Estilos disponíveis para geração:**
- `photo` — Fotografia profissional realista
- `3d` — Ilustração 3D moderna
- `flat` — Design flat/vector
- `minimal` — Minimalista e clean

**Modelo usado:** `google/gemini-3.1-flash-image-preview` (Nano Banana 2) — rápido com qualidade pro.

