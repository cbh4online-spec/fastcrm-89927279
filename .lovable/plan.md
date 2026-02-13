

## Funcionalidades em Falta — Inbox 3.0

### 1. Deploy da Edge Function `calculate-conversation-priority`

A funcao existe em codigo mas nao esta declarada no `config.toml`, portanto nunca foi deployada. E necessario adicionar a declaracao.

### 2. Cron Job de 15 minutos para Recalcular Prioridades

Criar um agendamento `pg_cron` que invoca a edge function `calculate-conversation-priority` em batch a cada 15 minutos para todos os workspaces com conversas abertas.

Migracao SQL:
```text
SELECT cron.schedule(
  'recalculate-conversation-priorities',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/calculate-conversation-priority',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ..."}'::jsonb,
    body := '{"batch": true, "all_workspaces": true}'::jsonb
  )$$
);
```

### 3. Trigger DB na Insercao de Mensagens

Criar trigger/funcao que, quando uma nova mensagem inbound e inserida, chama a edge function para recalcular a prioridade daquela conversa especifica.

### 4. Fase 4 — Popular `conversation_analytics`

Criar logica (edge function ou trigger) que atualiza a tabela `conversation_analytics` com:
- Tempo medio de resposta (diferenca entre mensagem inbound e proxima outbound)
- Flag `sla_breached` quando `sla_deadline` e ultrapassado
- Contador `ai_suggestions_used` incrementado quando o AI Suggest e usado
- `conversion_status` e `revenue` ligados as oportunidades do lead

### 5. Acoes do Context Panel

Implementar os dois botoes desativados:
- **Atribuir Utilizador**: dropdown com membros do workspace, chama `useAssignConversation`
- **Adicionar Nota**: textarea inline que grava na `unified_activity_log` ou tabela de notas

### 6. Renderizar `CreateOpportunityFromInboxDialog` no Context Panel

O dialog esta importado mas falta o JSX de renderizacao condicional (so aparece o `ScheduleFollowupDialog`). Adicionar:
```text
{showCreateOpp && lead && (
  <CreateOpportunityFromInboxDialog
    open={showCreateOpp}
    onOpenChange={setShowCreateOpp}
    leadId={lead.id}
    leadName={lead.name}
  />
)}
```

### 7. AI Usage Logging no `AISuggestModal`

Apos o utilizador selecionar uma sugestao, registar o uso na tabela `ai_agent_executions` com:
- `action_type`: "inbox_suggest"
- `conversation_id`
- `tone` selecionado
- `workspace_id`

---

### Ficheiros Afetados

- `supabase/functions/calculate-conversation-priority/index.ts` — adicionar suporte a `all_workspaces`
- Nova migracao SQL — cron job de 15 min + trigger em mensagens
- `src/components/inbox/InboxContextPanel.tsx` — render do CreateOpportunityDialog + implementar Atribuir/Nota
- `src/components/inbox/AISuggestModal.tsx` — logging de uso AI
- Nova edge function ou logica para popular `conversation_analytics`

### Ordem de Implementacao

1. Deploy da edge function (config.toml) + cron job + trigger
2. Fix do CreateOpportunityDialog no Context Panel
3. Implementar Atribuir Utilizador e Adicionar Nota
4. AI usage logging
5. Popular conversation_analytics

