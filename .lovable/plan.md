

# Adicionar Assistência IA à Gestão de Planos (Portal Cliente)

## Diagnóstico

As páginas de Planos de Manutenção do portal cliente (`ClientPlansPage`, `ClientPlanCreatePage`, `ClientPlanDetailPage`) não têm qualquer assistência IA. O padrão de créditos (`useAIGate` + `triggerNoCreditsDialog` + `useCreditWallet`) já existe noutros módulos e será reutilizado.

## Alterações

| Ficheiro | Acção |
|---|---|
| `supabase/functions/pricing-ai-assistant/index.ts` | Adicionar 2 novas actions: `suggest_subscription_plan` e `optimize_subscription_plan` |
| `src/pages/client/ClientPlanCreatePage.tsx` | Botão "IA: Sugerir Plano" que preenche nome, cadência e produtos recomendados com base no catálogo disponível |
| `src/pages/client/ClientPlanDetailPage.tsx` | Botão "IA: Optimizar Plano" que sugere ajustes de produtos, quantidades e cadência para melhorar o valor do plano |

### Novas actions na edge function

1. **`suggest_subscription_plan`** — Recebe o catálogo de produtos do workspace e sugere um plano completo (nome, cadência, produtos e quantidades) baseado em padrões de consumo típicos. Devolve JSON estruturado.

2. **`optimize_subscription_plan`** — Recebe o plano actual (produtos, cadência, valor) e sugere melhorias: ajustar quantidades, trocar cadência, adicionar/remover produtos para optimizar custo-benefício.

### Integração no ClientPlanCreatePage

- Botão `Sparkles` "IA: Sugerir Plano" no header, ao lado de "Criar Plano de Manutenção"
- Ao clicar: verifica créditos via `useAIGate("medium")`, chama edge function com lista de produtos disponíveis
- Resposta preenche automaticamente nome, cadência e produtos seleccionados
- `overageLabel` visível quando aplicável
- Tratamento de erro 402 com `triggerNoCreditsDialog`

### Integração no ClientPlanDetailPage

- Botão "IA: Optimizar" na barra de acções (junto a Pausar/Retomar)
- Apenas visível para planos em `draft` ou `active`
- Sugere alterações como: ajustar quantidades, mudar cadência, adicionar produtos complementares
- Resultado apresentado num Card com sugestões descritivas

### Controlo de créditos (em ambas as páginas)

- `useAIGate("medium")` para verificação frontend
- `triggerNoCreditsDialog` quando sem créditos
- `useCreditWallet` → `consumeCredits` após chamada bem-sucedida
- Tratamento de erro 402 do edge function

