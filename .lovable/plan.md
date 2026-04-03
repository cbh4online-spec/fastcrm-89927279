

# Adicionar Assistência IA à Gestão de Planos

## Diagnóstico

A secção **Planos** (`PlansSection.tsx`) permite editar limites e funcionalidades manualmente, mas não tem qualquer assistência IA. A secção vizinha **Pricing & Módulos** já usa um padrão funcional com `useAIAssistant()` + edge function `pricing-ai-assistant`.

## Solução

Reutilizar a edge function `pricing-ai-assistant` existente, adicionando duas novas actions, e integrar botões IA na `PlansSection`.

## Alterações

| Ficheiro | Acção |
|---|---|
| `supabase/functions/pricing-ai-assistant/index.ts` | Adicionar 2 novas actions: `suggest_plan_limits` e `optimize_plan_balance` |
| `src/components/super-admin/PlansSection.tsx` | Adicionar `useAIAssistant()`, botão "Sugerir Limites IA" no header, e botão "Optimizar com IA" no diálogo de edição |

### Novas actions na edge function

1. **`suggest_plan_limits`** — recebe os 4 planos actuais e sugere limites competitivos baseados em benchmarks SaaS CRM (HubSpot, Pipedrive, etc). Devolve JSON com sugestões por plano.

2. **`optimize_plan_balance`** — recebe um plano específico e sugere ajustes de limites e features para equilibrar valor vs custo. Útil ao editar um plano individual.

### Integração no PlansSection

1. **Header**: botão "Sugerir Limites IA" com ícone `Sparkles` — chama `suggest_plan_limits` com os 4 planos, mostra resultado num diálogo com sugestões lado a lado.

2. **Diálogo de edição**: botão "Optimizar com IA" — chama `optimize_plan_balance` com o plano em edição, pré-preenche os campos com as sugestões (o admin pode aceitar ou rejeitar cada valor antes de guardar).

### UX

- Loading state com `Loader2` durante chamada IA
- Sugestões apresentadas como diff visual (valor actual → sugerido) com badge "IA"
- Botão "Aplicar Sugestões" para aceitar em batch, ou edição individual
- Utilizadores sem créditos vêem mensagem de upgrade

