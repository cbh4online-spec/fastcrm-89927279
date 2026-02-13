

## Fix: Inbox Mostrando Apenas Email (Gap Analysis + Correcao)

### Diagnostico Confirmado

A Inbox ja e omnichannel a nivel de codigo e base de dados. O problema e exclusivamente de UX e classificacao:

- **API retorna todos os canais** — confirmado via network request (instagram, sms, email todos presentes na resposta)
- **Tab "Responder" esconde conversas FOLLOW_UP** — todas as conversas instagram/sms estao classificadas como FOLLOW_UP, enquanto todos os 42 emails estao como REQUIRES_RESPONSE
- **Resultado**: utilizador ve apenas email no tab default

### Correcoes Necessarias

#### 1. Tab "Responder" deve mostrar todas as conversas abertas por defeito

Ficheiro: `src/components/inbox/ConversationList.tsx`

Alterar a logica do filtro `requires_response` (linhas 153-160) para incluir todas as conversas open, nao apenas as REQUIRES_RESPONSE:

- Antes: mostra apenas `conversation_status_simplified === "REQUIRES_RESPONSE"` ou `unread_count > 0`
- Depois: mostra todas as conversas com `status === "open"` independentemente do `conversation_status_simplified`
- A distincao REQUIRES_RESPONSE vs FOLLOW_UP deve ser apenas visual (badge), nao um filtro excludente

#### 2. Adicionar contadores de canal no header dos tabs

Ficheiro: `src/components/inbox/ConversationList.tsx`

Adicionar contadores visuais junto aos channel filter pills mostrando quantas conversas existem por canal (ex: "Email (42)" | "Instagram (4)" | "SMS (2)").

#### 3. Renomear tab "Responder" para "Abertas"

Para evitar confusao semântica — o tab deve mostrar todas as conversas abertas, com badges de prioridade para as que precisam de resposta.

### Detalhes Tecnicos

**Ficheiro unico afetado**: `src/components/inbox/ConversationList.tsx`

**Alteracao no filtro (linhas 151-173)**:

```text
case "requires_response":
  // ANTES: apenas REQUIRES_RESPONSE ou unread
  // DEPOIS: todas as conversas abertas (o status=open ja filtra na query)
  return true;  // Mostrar todas - ja filtrado por status=open na query
```

**Alteracao nos pills de canal**: adicionar contagem derivada das conversas filtradas por tab.

**Renomear tab**: "Responder" -> "Abertas" na TabsTrigger (linha 236).

### Validacao

Apos a alteracao:
- Tab "Abertas" mostra 48 conversas (42 email + 4 instagram + 2 sms)
- Filtro "Instagram" mostra 4 conversas
- Filtro "SMS" mostra 2 conversas
- Filtro "Email" mostra 42 conversas
- Conversas com REQUIRES_RESPONSE mostram badge visual de prioridade

### Nota sobre WhatsApp e GHL

Nao existem conversas WhatsApp ou GHL neste workspace porque:
- Nao ha `whatsapp_connections` ativas para este workspace
- As conversas GHL existentes ja entram como instagram/sms/messenger (canal correto do GHL)
- Quando uma conexao WhatsApp for configurada, as conversas aparecerao automaticamente na Inbox

