## Diagnóstico

Hoje qualquer membro do workspace que tenha `inbox.read` vê todas as conversas de email do workspace, independentemente de a conta de email pertencer a outro utilizador. Cada conversa de email já está ligada a uma `email_connections` (via `channel_metadata.connection_id`), e essa conexão tem um dono em `connected_by`. Isto dá-nos a fronteira natural para privacidade: **emails recebidos numa caixa pertencem, por omissão, ao dono dessa caixa**.

## Decisões de produto / UX

1. **Privado por omissão**: toda a conversa de email associada a uma `email_connection` é privada — só o dono da conexão, o `owner`/`admin` do workspace e o `super_admin` a vêem.
2. **Partilha granular**: o dono (e owner/admin/super_admin) pode tornar uma conversa visível a membros específicos do workspace, ou a "todos" (público no workspace).
3. **Visível na lista**: cada item da Caixa de Entrada mostra um cadeado ("Privado") ou ícone de partilha quando aplicável. Conversas a que o utilizador não tem acesso simplesmente não aparecem.
4. **Gestão**: no painel de detalhe da conversa, botão "Privacidade" abre popover com:
   - Estado actual (Privado / Partilhada com N / Pública no workspace)
   - Lista de membros com toggle
   - Atalho "Tornar pública no workspace" / "Voltar a privada"
5. **Default por conexão configurável** (fase 2, opcional): o dono da conexão pode marcar a sua caixa como "Sempre pública" se não quiser privacidade — fica fora desta primeira fase.

## Estrutura técnica

### Base de dados (migração)
- Nova coluna `conversations.visibility text not null default 'private'` com check em `('private','shared','workspace')`.
  - Backfill: conversas `channel='email'` → `private`; restantes canais (whatsapp, sms, instagram, …) → `workspace` para não alterar comportamento actual.
- Nova tabela `conversation_shared_with`:
  - `conversation_id uuid` (FK), `user_id uuid` (FK auth.users), `granted_by uuid`, `created_at timestamptz`
  - PK composta (`conversation_id`, `user_id`), index em `user_id`.
  - GRANT a `authenticated` + `service_role`; RLS activa.

### Função helper SECURITY DEFINER
```
public.can_access_conversation(_conv_id uuid, _user_id uuid) returns boolean
```
Regra:
- `super_admin` → true.
- `owner`/`admin` do workspace da conversa → true.
- `visibility='workspace'` e utilizador é membro → true.
- `visibility='private'` ou `'shared'`:
  - É o `connected_by` da `email_connection` referenciada em `channel_metadata.connection_id` → true.
  - É `assigned_to` da conversa → true (mantém compat com fluxos de atribuição).
  - Existe linha em `conversation_shared_with` → true.
- Caso contrário → false.

### RLS
- `conversations`: substituir `USING (workspace_member)` por `USING (can_access_conversation(id, auth.uid()))` em SELECT/UPDATE. INSERT continua restrito a membros.
- `messages`: SELECT passa a depender de `can_access_conversation(conversation_id, auth.uid())`.
- `conversation_shared_with`:
  - SELECT: membros do workspace da conversa que já têm `can_access_conversation` true.
  - INSERT/DELETE: dono da conexão, `assigned_to`, owner/admin do workspace, super_admin.

### Frontend
- `useConversations` e `useUnreadInboxCount`: nenhuma alteração lógica — o filtro fica do lado da RLS. Apenas garantir que invalida queries após alterar partilha.
- Novo hook `useConversationPrivacy(conversationId)`:
  - lê `visibility` + lista de partilhados
  - mutations: `setVisibility`, `addShare`, `removeShare`
- Novo componente `ConversationPrivacyPopover` no header do detalhe da conversa (ao lado dos botões existentes na barra superior do painel direito).
- Badge `Privado` / `Partilhada` na lista (`ConversationListItem`).
- Capability nova `inbox.privacy.manage` na matriz (`src/lib/permissions/capabilities.ts` + espelho backend): owner, admin, agency e super_admin. O dono da conexão recebe override implícito (verificado no hook).

### Auditoria
- Inserir em `inbox_action_logs` os eventos `privacy_changed`, `share_added`, `share_removed` com `actor`, `conversation_id`, `target_user_id`.

## Plano de implementação

1. **Migração SQL**: coluna `visibility`, tabela `conversation_shared_with`, função `can_access_conversation`, novas policies, backfill.
2. **Capability** + espelho em `supabase/functions/_shared/capabilities.ts`.
3. **Hook** `useConversationPrivacy` + invalidations.
4. **UI**: popover de gestão no detalhe, badge na lista, mensagem amigável quando o utilizador tenta abrir conversa sem acesso (caso venha de URL direto).
5. **Auditoria**: registar em `inbox_action_logs`.
6. **QA** com a Ana Sábio (agent — não vê privadas de outros), o Utilizador Demo (alternar roles) e um owner.

## Critérios de aceitação

- Um `agent` só vê emails das suas conexões + os que lhe foram explicitamente partilhados + os marcados `workspace`.
- `owner`/`admin`/`super_admin` vêem tudo.
- Partilhar uma conversa com a Ana Sábio faz aparecê-la imediatamente na inbox dela (realtime).
- Remover a partilha remove-a da inbox.
- Conversas WhatsApp/SMS/Instagram continuam visíveis a todos os membros (sem regressão).
- Tentar `GET /messages?conversation_id=...` via API a uma conversa privada de outro retorna 0 linhas.

## Riscos e pontos por validar

- **Performance da RLS**: a função `can_access_conversation` corre em cada linha. Mitigação: `STABLE`, índices em `email_connections.connected_by`, `conversation_shared_with(user_id)`, e em `conversations(workspace_id, visibility)`.
- **Realtime**: filtros Supabase Realtime não respeitam funções complexas — confirmar que canal de `conversations` ainda entrega eventos só do workspace e que o frontend filtra com o mesmo helper.
- **Backfill**: marcar emails históricos como privados pode "esconder" conversas que toda a equipa via. Confirmar com o utilizador se quer aplicar retroactivamente ou só a novos emails (recomendo retroactivo, é a intenção do pedido).
- **Conexões partilhadas** (ex.: `geral@empresa.pt` usada por vários): se for `connected_by` a uma única pessoa, fica privada. Caminho: o dono marca como `workspace` em massa, ou criamos no futuro um modo "caixa partilhada" na própria `email_connections`.