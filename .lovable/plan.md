

## Plano: Corrigir redimensionamento de imagens para Claude API

### Problema
A edge function `claude-chat` recebe imagens com dimensões superiores a 2000px em pedidos multi-imagem. O `preprocessMessages` actual apenas adiciona `detail: "low"` — que é um conceito OpenAI, ignorado pela API Anthropic. Resultado: erro 400 `At least one of the image dimensions exceed max allowed size for many-image requests: 2000 pixels`.

### Solução (2 camadas)

**1. Cliente — `src/utils/resizeImageForAI.ts`** (sem alteração necessária)
- O default já é 1568px, abaixo do limite de 2000px da Anthropic
- Já é usado nos componentes `StoreVisualSearch`, `MarketplaceSearchOverlay`, `StoreQuickProductDialog`

**2. Servidor — `supabase/functions/claude-chat/index.ts`**
O problema é que `preprocessMessages` não redimensiona — apenas marca com `detail: "low"`. A correção:

- Reescrever `preprocessMessages` para **realmente redimensionar** imagens base64 oversized no servidor usando uma abordagem Deno-compatível:
  - Descodificar base64 → ler dimensões dos headers JPEG/PNG (funções já existem)
  - Se oversized: recalcular dimensões mantendo aspect ratio (max 1568px para multi-image, 2000px para single-image)
  - Re-codificar a imagem usando a API `CanvasRenderingContext2D` do Deno (disponível via `deno_canvas` ou ImageBitmap)
  - Alternativa mais simples e robusta: usar `fetch` para chamar um micro-endpoint de resize, ou usar a biblioteca `imagescript` para Deno
  
- **Abordagem escolhida**: usar a biblioteca [`imagescript`](https://deno.land/x/imagescript) disponível em Deno para resize server-side. Esta é a abordagem mais fiável sem dependências externas pesadas.

- Se `imagescript` não estiver disponível, **fallback**: truncar o número de imagens e/ou rejeitar com erro claro em vez de crash silencioso.

### Alterações concretas

**Ficheiro: `supabase/functions/claude-chat/index.ts`**

1. Importar `imagescript` para resize server-side
2. Substituir a lógica `detail: "low"` por resize real:
   - Para multi-image (>1 imagem): max 1568px
   - Para single-image: max 2000px  
3. A função `preprocessMessages` passa a ser `async` e a devolver imagens redimensionadas
4. Manter `convertToAnthropicFormat` inalterada

### Ficheiros afectados
1. `supabase/functions/claude-chat/index.ts` — resize real server-side (redeploy automático)

### Impacto
- Corrige o erro 400 da Anthropic em pedidos multi-imagem
- Mantém qualidade razoável (JPEG 85%)
- Sem alteração no frontend — o resize é transparente no servidor

