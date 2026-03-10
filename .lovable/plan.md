

## Plan: Criar funil real a partir da recomendação da IA

### Problema
Quando o utilizador gera um funil com IA e clica "Gerar Funil", o `onApply` apenas mostra um toast e fecha o AI Builder — nunca cria o funil na base de dados. O funil "desaparece".

### Solução
Alterar o `onApply` no `FunnelsList.tsx` para:
1. Criar o funil na tabela `funnels` usando `useCreateFunnel` (com nome baseado no `headline` e slug da recomendação)
2. Substituir os steps default pelos steps da recomendação — eliminar os 3 default e inserir os `funnelSteps` do AI
3. Navegar automaticamente para o editor do funil recém-criado (`setEditingFunnelId`)

### Alterações

**`src/components/funnels/FunnelsList.tsx`**
- No `onApply` callback do `AIFunnelBuilder`:
  - Chamar `createFunnel.mutateAsync({ name: rec.headline || rec.vertical, slug: rec.slug })` 
  - Após criação, eliminar os steps default e inserir os `rec.funnelSteps` com `supabase.from("funnel_steps").insert(...)`
  - Fechar o AI Builder e abrir o editor com `setEditingFunnelId(result.id)`
- Tornar o callback `async` e adicionar tratamento de erro

### Resultado
Após gerar o funil com IA, o utilizador é levado directamente para o editor com o funil criado e os steps configurados pela IA.

