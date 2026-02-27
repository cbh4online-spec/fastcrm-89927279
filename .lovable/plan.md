

# Traduzir autocomplete e limpar queries recentes em inglês

## Problema

Duas fontes de texto em inglês no módulo Ask FastCRM:

1. **AUTOCOMPLETE_MAP** -- hardcoded em inglês em ambos `AskFastCRMInline.tsx` e `AskFastCRMDialog.tsx`. Quando o utilizador digita, as sugestões aparecem em inglês.
2. **Queries recentes** -- guardadas na base de dados em inglês (antes da tradução ser implementada). Estas aparecem na secção "RECENTES".

## Solução

### Passo 1: Adicionar traduções do autocomplete aos ficheiros i18n

Adicionar novas chaves ao namespace `ask` para as sugestões de autocomplete (ex: `autoRisk`, `autoClose`, `autoStuck`, `autoNoActivity`, `autoNextStep`, `autoHighValue`, `autoPipeline`, `autoForecast`, `autoRemind`, `autoAlert`, `autoFollowUp`, `autoNotify`, `autoInvoice`, `autoOverdue`, `autoAutoAssign`, `autoContactReply`, `autoNewContact`, `autoAssignContact`, `autoDueDate`).

Ficheiros: `src/i18n/locales/{pt,en,es,fr}/ask.json`

### Passo 2: Refactorizar AUTOCOMPLETE_MAP para usar traduções

Em ambos os componentes (`AskFastCRMInline.tsx` e `AskFastCRMDialog.tsx`):

- Mover o `AUTOCOMPLETE_MAP` para dentro do componente como `useMemo`, utilizando `t()` para as sugestões
- Adicionar keywords em múltiplas línguas para cada entrada (ex: "risco" e "risk" ambos mapeiam para a mesma sugestão traduzida)
- Isto garante que o utilizador pode digitar em qualquer língua e receber sugestões na língua seleccionada

### Passo 3: Limpar queries recentes em inglês (opcional via DB)

As queries recentes são históricas e ficaram guardadas em inglês. Opcionalmente, podemos limpar o histórico antigo com uma query SQL para remover as entradas em inglês do workspace, permitindo que o histórico se reconstrua com as novas traduções.

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/i18n/locales/pt/ask.json` | Adicionar ~19 chaves de autocomplete em PT |
| `src/i18n/locales/en/ask.json` | Adicionar ~19 chaves de autocomplete em EN |
| `src/i18n/locales/es/ask.json` | Adicionar ~19 chaves de autocomplete em ES |
| `src/i18n/locales/fr/ask.json` | Adicionar ~19 chaves de autocomplete em FR |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Refactorizar AUTOCOMPLETE_MAP com i18n |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Refactorizar AUTOCOMPLETE_MAP com i18n |

