

# Corrigir Motor Conversacional

## Problemas Encontrados

### 1. Tab Autopilot desaparecida (BUG PRINCIPAL)
O `AutopilotConfigTab` é importado mas **nunca renderizado**. Não existe nenhum `TabsContent` para "autopilot" no módulo. A `TabsList` tem `grid-cols-4` com vibe, rules, objectives, simulator -- mas o Autopilot foi removido quando se adicionou Objectives e Simulator.

### 2. Type casts desnecessários
Os hooks `useVibeProfiles` e `useConversationObjectives` usam `as any` nas chamadas RPC (`set_default_vibe_profile`, `batch_reorder_objectives`) apesar de ambas as funções existirem no `types.ts`.

### 3. Edge Functions OK
As 3 edge functions do Simulador existem e estão deployadas: `classify-conversation`, `conversation-summary`, `conversation-intelligence`.

## Solução

### Restaurar layout de 5 tabs

Alterar `ConversationalEngineModule.tsx`:
- `TabsList` de `grid-cols-4` para `grid-cols-5`
- Adicionar tab trigger "Autopilot" com ícone Bot
- Adicionar `TabsContent value="autopilot"` que renderiza `<AutopilotConfigTab />`

### Corrigir type safety nos hooks

- `useVibeProfiles.ts`: remover `as any` no `supabase.rpc("set_default_vibe_profile", ...)`
- `useConversationObjectives.ts`: remover `as any` no `supabase.rpc("batch_reorder_objectives", ...)`

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/conversational-engine/ConversationalEngineModule.tsx` | Adicionar 5a tab Autopilot, alterar grid-cols-5 |
| `src/hooks/useVibeProfiles.ts` | Remover `as any` |
| `src/hooks/useConversationObjectives.ts` | Remover `as any` |

