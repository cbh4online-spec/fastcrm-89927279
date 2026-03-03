

# Notificações Automáticas para Data Limite de RFQ

## Abordagem

Integrar a deteção de RFQs com data limite próxima no sistema de alertas já existente (`useAlertDetection` + `detectAlerts`), criando notificações automáticas na admin_notifications e smart_alerts.

## Alterações

### 1. `src/hooks/useSmartAlerts.ts`
- Adicionar novo `AlertType`: `"rfq_deadline_approaching"`
- Expandir `detectAlerts` para aceitar um array de RFQs com `id`, `title`, `rfq_number`, `due_date`, `status`, `project_id`
- Lógica: para RFQs em estado `draft` ou `sent` ou `receiving_quotes`, se `due_date` está a ≤3 dias → severity `high`, a ≤7 dias → severity `medium`. Se já expirou → severity `critical`

### 2. `src/hooks/useAlertDetection.ts`
- Importar `useRFQs` e passar os dados de RFQ ao `detectAlerts`
- Mapear os campos do RFQ para o formato esperado pela nova deteção

### 3. `src/hooks/useAdminNotifications.ts` (sem alteração de código)
- As notificações serão criadas via `admin_notifications` table — o hook já suporta qualquer `type`

### 4. Notificação admin complementar
- No `useAlertDetection`, além de criar smart alerts, criar também uma entrada em `admin_notifications` com `type: 'rfq_deadline'` para aparecer no sino de notificações

### 5. Ícone no NotificationsDropdown
- Adicionar `rfq_deadline` ao mapa de ícones em `NotificationsDropdown.tsx` e `NotificationBell.tsx`

### Ficheiros alterados
- `src/hooks/useSmartAlerts.ts` — novo tipo + lógica de deteção
- `src/hooks/useAlertDetection.ts` — integrar RFQs
- `src/components/layout/NotificationsDropdown.tsx` — ícone rfq_deadline
- `src/components/notifications/NotificationBell.tsx` — ícone rfq_deadline

