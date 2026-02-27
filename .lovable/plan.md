

# Corrigir internacionalização do módulo Ask FastCRM

## Problema
O módulo "Ask FastCRM" tem todas as strings hardcoded em inglês (títulos, placeholders, chips sugeridos, labels de secções, autocomplete). Não respeita a língua seleccionada pelo utilizador.

## Strings a traduzir

| String actual (EN) | Contexto |
|---|---|
| "Ask FastCRM" | Título do módulo |
| "Revenue intelligence at your command." | Subtítulo |
| "Ask about your revenue" | Placeholder vazio |
| "Query your pipeline, forecast, and deals -- then act on the results." | Descrição |
| "Ask about your revenue..." | Placeholder do input |
| "Recent" | Label de secção |
| "Suggested" | Label de secção |
| "Deals at risk" | Chip sugerido |
| "No activity in 14 days" | Chip sugerido |
| "No next step" | Chip sugerido |
| "Closing this month" | Chip sugerido |
| "Stuck in stage" | Chip sugerido |
| "High value deals" | Chip sugerido |

## Solução

### Passo 1: Adicionar namespace `ask` aos ficheiros i18n

Criar ficheiros de tradução `ask.json` para as 4 línguas (pt, en, es, fr) com todas as strings do módulo.

**pt/ask.json** (exemplo):
```json
{
  "title": "Ask FastCRM",
  "subtitle": "Inteligência de receita ao seu comando.",
  "emptyTitle": "Pergunte sobre a sua receita",
  "emptyDescription": "Consulte o pipeline, previsões e negócios — e actue sobre os resultados.",
  "placeholder": "Pergunte sobre a sua receita...",
  "recent": "Recentes",
  "suggested": "Sugeridos",
  "chipsDealsAtRisk": "Negócios em risco",
  "chipsNoActivity": "Sem actividade há 14 dias",
  "chipsNoNextStep": "Sem próximo passo",
  "chipsClosingThisMonth": "A fechar este mês",
  "chipsStuckInStage": "Parados na fase",
  "chipsHighValue": "Negócios de alto valor"
}
```

Equivalentes em en, es e fr.

### Passo 2: Registar namespace no i18n/index.ts

Importar os 4 ficheiros `ask.json` e adicioná-los aos resources e ao array `ns`.

### Passo 3: Actualizar AskFastCRMInline.tsx

- Importar `useTranslation` do react-i18next
- Substituir todas as strings hardcoded por chamadas `t('ask:key')`
- Tornar `SUGGESTED_CHIPS` num array derivado das traduções (usando `useMemo`)

### Passo 4: Actualizar AskFastCRMDialog.tsx

- Mesmas alterações que o Inline: usar `useTranslation` e substituir strings hardcoded

## Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| `src/i18n/locales/pt/ask.json` | Criar (traduções PT) |
| `src/i18n/locales/en/ask.json` | Criar (traduções EN) |
| `src/i18n/locales/es/ask.json` | Criar (traduções ES) |
| `src/i18n/locales/fr/ask.json` | Criar (traduções FR) |
| `src/i18n/index.ts` | Adicionar namespace `ask` |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Usar i18n em vez de strings hardcoded |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Usar i18n em vez de strings hardcoded |

