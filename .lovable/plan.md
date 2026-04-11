

## Correção: Pesquisa visual falha no marketplace (mobile e desktop)

### Causa raiz

No ficheiro `supabase/functions/store-visual-search/index.ts`, linha 18, é referenciada a variável `workspace_id` que **nunca foi declarada**. A linha 15 só extrai `image` do body:

```typescript
const { image } = await req.json();  // ← workspace_id não é extraído
if (workspace_id) {                   // ← ReferenceError: workspace_id is not defined
```

Isto causa um crash imediato na Edge Function, devolvendo erro 500 em todas as chamadas de pesquisa visual.

### Correção

**Ficheiro: `supabase/functions/store-visual-search/index.ts`**

1. Alterar a linha 15 para extrair também `workspace_id`:
   ```typescript
   const { image, workspace_id } = await req.json();
   ```

2. Redeployar a edge function.

### Impacto
- Corrige pesquisa visual no marketplace (mobile e desktop)
- Zero alterações no frontend — o componente `MarketplaceSearchOverlay` já envia correctamente a imagem
- A edge function passa a funcionar sem crash

