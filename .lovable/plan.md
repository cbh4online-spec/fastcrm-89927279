

# Internacionalizar todos os componentes restantes do Ask FastCRM

## Problema
Os resultados, painel de automacao, e nudges proactivos continuam com strings hardcoded em ingles: "Risk", "Watch", "View all", "Nothing found", "Confirm", "Cancel", "When/If/Then", "Confirm & Activate", etc.

## Componentes a corrigir

### 1. AskFastCRMResultPanel.tsx
Strings hardcoded:
- Health labels: "Risk", "Watch", "Ok"
- Empty state: "Nothing found for that query.", "Try:"
- EMPTY_CHIPS: "No activity 7d/14d/30d"
- Did you mean: "Try one of these:"
- Bulk confirm: "This will affect X items", "...and X more", "confirm to proceed.", "Confirm", "Cancel"
- "View all (X)"
- "More..."

### 2. AskAutomationPreview.tsx
Strings hardcoded:
- Object types: "Deal", "Contact", "Invoice"
- Section labels: "When", "If", "Then"
- "New automation rule"
- Trigger edits: "No activity for", "days", "Deal enters stage", "Stage name", "Overdue by more than", "Due date in", "Status changes to"
- Status values: "Paid", "Overdue", "Cancelled", "Draft"
- Action edits: "Create task:", "Task title", "Due in", "High/Medium/Low", "Alert:", "Notify:", "Message", "Move to stage:", "Assign:", "Assignment rule", "Mark as at risk"
- Quota: "X of Y automations used", "Upgrade for unlimited"
- Buttons: "Done editing", "Edit", "Confirm & Activate", "Activating...", "Limit reached - Upgrade", "Cancel"

### 3. AskProactiveNudge.tsx
- Button: "Ask FastCRM"

## Solucao

### Passo 1: Expandir ficheiros de traducao ask.json (4 linguas)

Adicionar ~50 novas chaves ao namespace `ask` para cobrir todas as strings dos 3 componentes acima. Chaves organizadas por prefixo:
- `result_` para ResultPanel
- `auto_` para AutomationPreview  
- `nudge_` para ProactiveNudge

Exemplo de chaves novas (PT):
```json
{
  "resultHealthRisk": "Risco",
  "resultHealthWatch": "Atenção",
  "resultHealthOk": "Ok",
  "resultEmpty": "Nada encontrado para essa consulta.",
  "resultTry": "Tente:",
  "resultTryOneOf": "Tente uma destas:",
  "resultViewAll": "Ver todos ({{count}})",
  "resultMore": "Mais...",
  "resultAffect": "Isto afectará {{count}} itens",
  "resultAndMore": "...e mais {{count}}",
  "resultConfirmProceed": "{{label}} — confirme para continuar.",
  "resultConfirm": "Confirmar",
  "resultCancel": "Cancelar",
  "emptyChip7d": "Sem actividade 7d",
  "emptyChip14d": "Sem actividade 14d",
  "emptyChip30d": "Sem actividade 30d",
  "emptyChipQuery7d": "Negócios sem actividade em 7 dias",
  "emptyChipQuery14d": "Negócios sem actividade em 14 dias",
  "emptyChipQuery30d": "Negócios sem actividade em 30 dias",
  "autoNewRule": "Nova regra de automação",
  "autoWhen": "Quando",
  "autoIf": "Se",
  "autoThen": "Então",
  "autoNoActivityFor": "Sem actividade há",
  "autoDays": "dias",
  "autoDealEntersStage": "Negócio entra na fase",
  "autoStageName": "Nome da fase",
  "autoOverdueBy": "Vencida há mais de",
  "autoDueDateIn": "Data de vencimento em",
  "autoStatusChangesTo": "Estado muda para",
  "autoStatusPaid": "Pago",
  "autoStatusOverdue": "Vencida",
  "autoStatusCancelled": "Cancelada",
  "autoStatusDraft": "Rascunho",
  "autoCreateTask": "Criar tarefa:",
  "autoTaskTitle": "Título da tarefa",
  "autoDueIn": "Vence em",
  "autoPriorityHigh": "Alta",
  "autoPriorityMedium": "Média",
  "autoPriorityLow": "Baixa",
  "autoAlertLabel": "Alerta:",
  "autoNotifyLabel": "Notificar:",
  "autoMessage": "Mensagem",
  "autoMoveToStage": "Mover para fase:",
  "autoAssign": "Atribuir:",
  "autoAssignRule": "Regra de atribuição",
  "autoMarkAtRisk": "Marcar como em risco",
  "autoQuota": "{{count}} de {{max}} automações usadas",
  "autoUpgradeUnlimited": "Upgrade para ilimitado",
  "autoDoneEditing": "Concluir edição",
  "autoEdit": "Editar",
  "autoConfirmActivate": "Confirmar e Activar",
  "autoActivating": "A activar...",
  "autoLimitReached": "Limite atingido — Upgrade",
  "autoObjDeal": "Negócio",
  "autoObjContact": "Contacto",
  "autoObjInvoice": "Fatura",
  "nudgeAskButton": "Ask FastCRM"
}
```

### Passo 2: Actualizar AskFastCRMResultPanel.tsx
- Importar `useTranslation` 
- Substituir todas as strings hardcoded por `t('ask:chave')`
- Tornar EMPTY_CHIPS dinamico com `useMemo`
- Usar interpolacao do i18next para contagens (ex: `t('resultViewAll', { count: 42 })`)

### Passo 3: Actualizar AskAutomationPreview.tsx
- Importar `useTranslation`
- Substituir todas as strings hardcoded
- Traduzir OBJECT_TYPE_CONFIG labels dinamicamente

### Passo 4: Actualizar AskProactiveNudge.tsx
- Importar `useTranslation`
- Substituir "Ask FastCRM" por `t('ask:nudgeAskButton')`

## Ficheiros a alterar

| Ficheiro | Accao |
|---|---|
| `src/i18n/locales/pt/ask.json` | Adicionar ~50 chaves |
| `src/i18n/locales/en/ask.json` | Adicionar ~50 chaves |
| `src/i18n/locales/es/ask.json` | Adicionar ~50 chaves |
| `src/i18n/locales/fr/ask.json` | Adicionar ~50 chaves |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | Usar i18n |
| `src/components/ask-fastcrm/AskAutomationPreview.tsx` | Usar i18n |
| `src/components/ask-fastcrm/AskProactiveNudge.tsx` | Usar i18n |

## Nota sobre respostas do backend
As strings retornadas pelo backend (headline, subtext, action labels, suggestion text) continuam em ingles porque vem da edge function `ask-fastcrm`. Isso requer uma alteracao separada no backend para aceitar o locale do utilizador e devolver respostas traduzidas.

