

## FastCRM Unified Omnichannel Inbox

### Estado Atual (Confirmado)

- Tabelas `conversations` e `messages` sao a fonte unica — nao existem tabelas paralelas (instagram_conversations, whatsapp_messages, etc.)
- Todos os 4 webhooks (whatsapp, instagram, email, ghl) ja inserem diretamente nestas tabelas
- RLS ja implementada com workspace isolation
- Realtime ja ativo para ambas as tabelas
- Nao e necessaria migracao de dados

### O Que Falta

---

### 1. Migracao DB — Indexes de Deduplicacao

Adicionar 2 indexes unicos condicionais para prevenir duplicados a nivel de base de dados:

```text
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique
ON messages (workspace_id, external_message_id)
WHERE external_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external_thread_unique
ON conversations (workspace_id, external_thread_id)
WHERE external_thread_id IS NOT NULL;
```

### 2. Normalization Layer — Modulo Partilhado

Criar `supabase/functions/_shared/normalize-message.ts` com funcao reutilizavel:

**Input normalizado:**
- workspace_id, channel, sender_id, sender_name, sender_email, sender_phone
- content, attachments, external_thread_id, external_message_id
- timestamp, channel_metadata

**Logica:**
1. Deduplicacao: verifica `external_message_id` em `messages`
2. Find-or-create conversation por `external_thread_id`, depois por `lead_id + channel`
3. Insere mensagem em `messages`
4. Atualiza `conversations` (last_message_at, last_message_preview, unread_count, status)
5. Retorna `{ conversation_id, message_id, is_new_conversation, is_duplicate }`

### 3. Refatorar Webhooks

Cada webhook mantem a sua logica de autenticacao e parsing especifica do canal, mas delega a persistencia ao modulo partilhado:

| Webhook | Alteracao |
|---|---|
| `whatsapp-webhook` | Mapear `msg.from`, `msg.text.body` para formato padrao, chamar normalize |
| `instagram-webhook` | Mapear `senderId`, `message.text` para formato padrao, chamar normalize |
| `email-webhook` | Mapear `from`, `body`, `subject` para formato padrao, chamar normalize |
| `ghl-webhook-message` | Extrair logica de persistencia para normalize (mais complexo — manter logica GHL-especifica como autopilot trigger, sync log) |

### 4. Frontend — Adicionar Canal GHL

**4.1 `src/hooks/useConversations.ts`:**
- Adicionar `"ghl"` ao tipo `ConversationChannel`
- Alterar order para `conversation_priority_score DESC NULLS LAST, last_message_at DESC NULLS LAST`

**4.2 `src/components/inbox/ConversationList.tsx`:**
- Adicionar `ghl` ao `channelIcons` (usar icone `Zap` do lucide)
- Adicionar `ghl` ao `channelColors` (orange)
- Adicionar dropdown inline de filtro por canal no header (abaixo do search):
  - Opcoes: Todos | Email | WhatsApp | Instagram | GHL | Webchat | SMS
  - Default: "Todos"
  - Quando selecionado, filtrar localmente (sem alterar query principal)

**4.3 `src/components/inbox/InboxSidebar.tsx`:**
- Adicionar `{ id: "ghl", label: "GoHighLevel", icon: Zap, color: "text-orange-500" }` ao array `channels[]`
- Adicionar `ghl` ao `channelCounts`

### 5. Deploy

Fazer deploy de todas as edge functions afetadas apos refactoring.

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | 2 indexes unicos condicionais |
| `supabase/functions/_shared/normalize-message.ts` | **Novo** — modulo de normalizacao partilhado |
| `supabase/functions/whatsapp-webhook/index.ts` | Refatorar para usar normalize |
| `supabase/functions/instagram-webhook/index.ts` | Refatorar para usar normalize |
| `supabase/functions/email-webhook/index.ts` | Refatorar para usar normalize |
| `supabase/functions/ghl-webhook-message/index.ts` | Refatorar persistencia para usar normalize |
| `src/hooks/useConversations.ts` | Adicionar `ghl` ao tipo + order por priority |
| `src/components/inbox/ConversationList.tsx` | GHL icons/colors + dropdown filtro canal inline |
| `src/components/inbox/InboxSidebar.tsx` | Adicionar `ghl` ao channels + counts |

### Ordem de Implementacao

1. Migracao DB (indexes deduplicacao)
2. Modulo partilhado `_shared/normalize-message.ts`
3. Refatorar whatsapp-webhook
4. Refatorar instagram-webhook
5. Refatorar email-webhook
6. Atualizar ghl-webhook-message
7. Deploy edge functions
8. Frontend: useConversations (tipo + order)
9. Frontend: ConversationList (GHL + filtro canal)
10. Frontend: InboxSidebar (GHL)
