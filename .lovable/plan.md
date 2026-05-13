## Diagnóstico

O LeadChef já tem motor de sequências (`leadchef_sequences`, `leadchef_sequence_steps`, `leadchef_lead_sequence_runs`) e dispatcher (`leadchef-followup-dispatcher`) que corre via cron, com pausa automática se o lead responde ou muda de stage. Falta:

1. Um **trigger** que enrole o lead na sequência quando uma demo é concluída (`useCompleteLeadChefAppointment`).
2. Um **action_type novo** `send_whatsapp` que envie via Z-API (`whatsapp-zapi-send`) com janela de cancelamento.
3. Uma **fila de envios pendentes** com estado `scheduled → cancellable → sent/cancelled` para o agente poder cancelar a partir do detalhe do lead.

## Decisões de produto / UX

- **Híbrido**: ao concluir uma demo, é criado um envio agendado para 24h depois. O agente recebe notificação e vê um cartão "Envios agendados" no lead com botão **Cancelar envio**. Se nada fizer, é enviado automaticamente.
- **Âmbito**: todas as demos (qualquer outcome `done | proposal_sent | won | no_interest`).
- **Pausa automática**: cancelado se o lead responder OU mudar de stage entre o agendamento e o envio.
- **Template**: usa o template existente "Poupança Demo Bebé" (categoria `post_demo_follow_up`). O agente pode trocar o template por defeito nas Definições LeadChef.

## Estrutura técnica

### Nova tabela
```text
leadchef_scheduled_messages
  id, workspace_id, lead_id, profile_id, agent_id (assigned_to)
  template_id (FK leadchef_message_templates), rendered_body text
  scheduled_for timestamptz   -- demo.completed_at + 24h
  status text                 -- 'scheduled' | 'sent' | 'cancelled' | 'failed' | 'paused'
  cancel_reason text          -- 'manual' | 'lead_replied' | 'stage_changed'
  source_appointment_id uuid  -- FK leadchef_appointments
  sent_at, cancelled_at, error
  created_at, updated_at
  UNIQUE (source_appointment_id, template_id)  -- evita duplicados
```
RLS: SELECT/UPDATE para membros do workspace (agente vê os seus); INSERT/dispatch via service_role.

### Trigger no complete da demo
Em `useCompleteLeadChefAppointment`, após gravar `completed_at`, inserir uma linha em `leadchef_scheduled_messages` com:
- `scheduled_for = completed_at + interval '24 hours'`
- `template_id` = template "Poupança Demo Bebé" (ID por defeito guardado em `leadchef_workspace_settings.post_demo_template_id`, com fallback para o template seed por `name`)

### Edge function nova: `leadchef-scheduled-whatsapp-dispatcher`
Cron de 5 em 5 minutos (pg_cron). Para cada `scheduled_messages.status='scheduled'` com `scheduled_for <= now()`:
1. Re-verificar pausa: lead respondeu (`crm_activities` inbound após `created_at`) ou mudou de stage → marcar `cancelled` com `cancel_reason`.
2. Renderizar template com `firstName/agentName/...` (reutilizar `messageTemplates.ts`).
3. Chamar `whatsapp-zapi-send` com o número do lead.
4. Marcar `sent` ou `failed` (com retry máx. 3).
5. Logar em `crm_activities` (`activity_type='whatsapp_auto_sent'`).

### UI (frontend)
- **Detalhe do lead** (`LeadChefLeadDetailPage`): novo cartão "📩 Envio agendado" mostrando template + countdown + botão **Cancelar envio**.
- **Hoje** (`LeadChefTodayPage`): secção "Envios pendentes (24h)" com contador.
- **Definições LeadChef**: campo "Template pós-demo automático" (select dos templates da categoria `post_demo_follow_up`) + toggle global on/off.
- **Notificação push**: aproveitar `leadchef_push_queue` para avisar o agente 1h antes do envio: "📩 Vou enviar a mensagem de poupança ao {nome} daqui a 1h. Cancelar?"

### Cron
```sql
select cron.schedule(
  'leadchef-scheduled-whatsapp',
  '*/5 * * * *',
  $$ select net.http_post(url:='…/leadchef-scheduled-whatsapp-dispatcher', …) $$
);
```

## Plano de implementação

1. **Migração DB**: criar `leadchef_scheduled_messages`, RLS, índices (`workspace_id`, `status`, `scheduled_for`), `post_demo_template_id` em `leadchef_workspace_settings`, toggle `auto_post_demo_enabled`.
2. **Edge function `leadchef-scheduled-whatsapp-dispatcher`**: implementar com pausa por reply/stage, render de template, chamada a `whatsapp-zapi-send`, logging.
3. **Cron pg_cron**: agendar de 5/5 min via `supabase--insert`.
4. **Hook `useCompleteLeadChefAppointment`**: ao completar demo, se `auto_post_demo_enabled=true` e `post_demo_template_id` definido, inserir scheduled_message.
5. **Frontend**:
   - `useScheduledMessages(leadId)` + `useCancelScheduledMessage`.
   - `ScheduledMessageCard` no detalhe do lead.
   - Bloco no Today.
   - Configuração nas Settings.
6. **Push 1h antes**: estender `leadchef-push-scheduler` para enfileirar aviso quando `scheduled_for - now() <= 1h`.
7. **Backfill**: NÃO aplicar a demos passadas (apenas novas).

## Critérios de aceitação

- Concluir uma demo cria 1 registo `scheduled_messages` com `scheduled_for = completed_at + 24h`.
- Aos 23h, agente recebe push "Vou enviar daqui a 1h" com link para cancelar.
- Botão **Cancelar** muda status para `cancelled (manual)` e nenhum WhatsApp é enviado.
- Se o lead responder antes da hora, status passa a `cancelled (lead_replied)`.
- Se o lead mudar de stage (ex.: won, lost), status passa a `cancelled (stage_changed)`.
- À hora marcada, mensagem é entregue via Z-API e regista-se em `crm_activities`.
- Falhas Z-API ficam em `failed` com retry até 3x.
- Nenhum duplicado por demo (UNIQUE em `source_appointment_id + template_id`).
- Toggle global desativa toda a automação sem perda de configuração.

## Riscos e pontos por validar

- **Template hardcoded**: o template "Poupança Demo Bebé" deve estar instalado em todos os workspaces — usar fallback por nome ou criar seed.
- **Número do lead**: validar que `leads.phone` está em formato E.164 antes de enviar; se não, marcar `failed` com motivo "phone_invalid".
- **Quiet hours**: confirmar se respeitamos quiet hours globais ou enviamos exatamente às 24h. Recomendação: empurrar para a próxima janela útil (ex.: 9h-21h).
- **Z-API ligado**: se a sessão WhatsApp do agente estiver desligada, falhar elegantemente e notificar o agente.
- **Privacidade**: o template inclui dados financeiros (poupança) — validar consentimento prévio do lead.
