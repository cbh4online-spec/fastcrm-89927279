

## Adicionar aiGate à edge function `compute-conversation-signals`

### O que falta
A função `compute-conversation-signals` é a única das ~69 funções IA que não tem o middleware `aiGate`. Esta função analisa sinais de compra, objecções e risco — classifica-se como tier **medium**.

### Alteração

**Ficheiro**: `supabase/functions/compute-conversation-signals/index.ts`

1. Adicionar `import { aiGate } from '../ai-gate/index.ts';` no topo (linha 1)
2. Após extrair `workspace_id` do body (linha 21), inserir o bloco de gate check:

```typescript
// AI Gate check
const gate = await aiGate(workspace_id, 'medium', 'compute-conversation-signals');
if (!gate.allowed) {
  return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

Padrão idêntico às outras 68 funções já instrumentadas. Nenhuma outra alteração necessária.

