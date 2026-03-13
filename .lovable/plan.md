

# Otimização do Carregamento de Imagens no Marketplace C2C

## Problema
As imagens são carregadas na resolução original (sem compressão, sem redimensionamento, sem thumbnails). Cada card carrega a imagem full-size, resultando em dezenas de imagens pesadas a carregar simultaneamente.

## Solução (3 frentes)

### 1. Compressão no upload (client-side)
Antes de enviar para o storage, redimensionar e comprimir a imagem usando Canvas API:
- **Thumbnail**: 400x300px, qualidade 0.7 (para cards na listagem)
- **Medium**: 800x600px, qualidade 0.8 (para página de detalhe)
- **Original**: mantida para zoom

Criar um utilitário `src/lib/imageOptimizer.ts` com funções `compressImage(file, maxWidth, quality)`.

No upload (`C2CCreateListing.tsx` e `C2CEditListing.tsx`), gerar e guardar 2 versões adicionais com sufixos (`_thumb`, `_med`) no mesmo bucket.

### 2. Componente OptimizedImage com lazy loading + placeholder
Criar `src/components/ui/optimized-image.tsx`:
- Usa `IntersectionObserver` para só carregar quando visível (true lazy loading)
- Mostra placeholder blur/skeleton enquanto carrega
- Propriedade `sizes` para responsive (`srcSet` pattern)
- Fallback para o URL original se thumbnail não existir

### 3. Usar thumbnails nos cards
Atualizar `ListingCard.tsx` para:
- Derivar URL do thumbnail a partir do URL original (adicionar `_thumb` antes da extensão)
- Usar o componente `OptimizedImage` em vez de `<img>` direto
- Adicionar `decoding="async"` e `fetchPriority="low"`

### 4. Corrigir os erros de build (tipos)
Os erros de build em `FunnelAutomationsTab`, `FunnelRoutingTab`, `VisionBoardCanvas`, etc. são causados por tabelas que não estão nos tipos gerados. Adicionar casts `as any` nos ficheiros afetados para desbloquear o build.

## Ficheiros a criar/editar
- **Criar**: `src/lib/imageOptimizer.ts` — compressão client-side
- **Criar**: `src/components/ui/optimized-image.tsx` — lazy loading + placeholder
- **Editar**: `src/components/c2c/ListingCard.tsx` — usar OptimizedImage + thumbnail URL
- **Editar**: `src/pages/c2c/C2CCreateListing.tsx` — gerar thumbnails no upload
- **Editar**: `src/pages/c2c/C2CEditListing.tsx` — gerar thumbnails no upload
- **Editar**: ficheiros com erros de build — fix de tipos

## Impacto esperado
- Redução de ~70-80% no peso das imagens nos cards
- Carregamento progressivo com skeleton placeholders
- Imagens só carregam quando o utilizador faz scroll até elas

