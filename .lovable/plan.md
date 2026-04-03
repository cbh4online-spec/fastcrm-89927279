

# Adicionar Controlo de Créditos IA ao Pricing & Módulos

## Diagnóstico

A secção **Pricing & Módulos** já tem assistência IA funcional (botões "IA: Sugerir Preços", "Gerar Features IA", etc.), mas **não controla créditos**:

1. O `useAIAssistant()` local não passa `workspace_id` ao edge function → o `aiGate` no backend é ignorado
2. Não há verificação frontend de créditos (`useAIGate`) antes de chamar a IA
3. Não há `triggerNoCreditsDialog` para utilizadores sem créditos
4. Erros 402 (sem créditos) do edge function não são tratados

## Solução

Integrar o padrão de créditos já usado noutros módulos (Funnels, eBooks, etc.) no `PricingManagementSection`.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/PricingManagementSection.tsx` | Actualizar `useAIAssistant()` para passar `workspace_id`, adicionar `useAIGate` + `triggerNoCreditsDialog`, tratar erro 402 |

### Detalhe

1. **`useAIAssistant()` — passar workspace_id**: Obter o workspace_id do contexto (ou usar um valor global para super-admin) e incluí-lo no body da chamada ao edge function

2. **Verificação frontend com `useAIGate("medium")`**: Antes de cada chamada IA, verificar `canRun` / `showUpgrade`. Se `showUpgrade`, chamar `triggerNoCreditsDialog({ actionLabel: "..." })` e abortar

3. **Tratamento de erro 402**: No `useAIAssistant`, detectar resposta com `quota_exceeded` e disparar `triggerNoCreditsDialog`

4. **Aplicar em todos os pontos de chamada IA**:
   - Botão "IA: Sugerir Preços" no header (action `suggest_prices`)
   - Botão "Gerar Features IA" no `PlanEditor` (action `generate_features`)
   - Qualquer outra chamada IA existente na secção

5. **UX**: Mostrar `overageLabel` junto aos botões IA quando aplicável (ex: "Esta acção custa €0.05")

