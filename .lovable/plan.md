

## Implementar Funcionalidades em Falta -- Inbox 3.0

Confirmacao apos revisao do codigo: todos os 7 pontos identificados estao de facto em falta. Segue o plano de implementacao.

---

### 1. Deploy da Edge Function + Suporte `all_workspaces`

**config.toml**: Adicionar declaracao `[functions.calculate-conversation-priority]` com `verify_jwt = false`.

**Edge Function**: Adicionar modo `all_workspaces` -- quando `batch: true` e `all_workspaces: true`, buscar todos os `workspace_id` distintos com conversas abertas e iterar sobre cada um.

### 2. Cron Job de 15 minutos

Executar SQL (via insert tool, nao migracao) para criar agendamento pg_cron:

```text
SELECT cron.schedule(
  'recalculate-conversation-priorities',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/calculate-conversation-priority',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body := '{"batch": true, "all_workspaces": true}'::jsonb
  ) AS request_id$$
);
```

### 3. Trigger DB na Insercao de Mensagens

Migracao SQL para criar funcao + trigger:

```text
CREATE OR REPLACE FUNCTION notify_new_message_priority()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/calculate-conversation-priority',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ..."}'::jsonb,
    body := json_build_object('conversation_id', NEW.conversation_id)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_priority
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.direction = 'inbound')
EXECUTE FUNCTION notify_new_message_priority();
```

### 4. Renderizar CreateOpportunityFromInboxDialog

No `InboxContextPanel.tsx`, adicionar apos o `ScheduleFollowupDialog` (linha 256):

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

### 5. Implementar Atribuir Utilizador

No `InboxContextPanel.tsx`:
- Importar `useAssignConversation` e `useAgentMembers`
- Adicionar estado `showAssign` e um `DropdownMenu` no botao "Atribuir Utilizador"
- Listar membros do workspace e chamar `assignConversation.mutate({ conversationId, userId })`

### 6. Implementar Adicionar Nota

No `InboxContextPanel.tsx`:
- Adicionar estado `showNote` e `noteText`
- Ao clicar, revelar uma `Textarea` inline com botao "Guardar"
- Gravar na tabela `unified_activity_log` com `entity_type: "conversation"`, `action: "note"`, `details: noteText`

### 7. AI Usage Logging no AISuggestModal

No `AISuggestModal.tsx`:
- Aceitar nova prop `conversationId` e `workspaceId`
- Na funcao `handleSelect`, apos inserir a sugestao, fazer insert na tabela `ai_agent_executions`:

```text
supabase.from('ai_agent_executions').insert({
  workspace_id: workspaceId,
  agent_type: 'inbox_suggest',
  action_type: 'reply_suggestion',
  input_data: { tone: activeTone, conversation_id: conversationId },
  output_data: { suggestion_text: text },
  status: 'completed',
})
```

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| `supabase/config.toml` | Adicionar `[functions.calculate-conversation-priority]` |
| `supabase/functions/calculate-conversation-priority/index.ts` | Modo `all_workspaces` |
| SQL (insert tool) | Cron job pg_cron |
| Migracao SQL | Trigger `trg_message_priority` |
| `src/components/inbox/InboxContextPanel.tsx` | Dialog oportunidade + Atribuir + Nota |
| `src/components/inbox/AISuggestModal.tsx` | AI usage logging |
| `src/components/inbox/ConversationDetail.tsx` | Passar `conversationId`/`workspaceId` ao AISuggestModal |

### Ordem

1. config.toml + edge function update + deploy
2. Cron job SQL + trigger SQL
3. InboxContextPanel (dialog + atribuir + nota)
4. AISuggestModal logging
