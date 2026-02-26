

# Envio Automático de Email ao Convidar para Evento

## Contexto

Actualmente, `useInviteToEvent` apenas insere um registo na tabela `event_rsvps` sem enviar email. Já existe a edge function `send-community-invite` para convites de comunidade que pode servir de modelo.

## Alterações

### 1. Nova Edge Function `supabase/functions/send-event-invite/index.ts`

Baseada na `send-community-invite`, recebe:
- `email`, `name`, `eventTitle`, `eventDate`, `eventLocation`, `eventLink`, `workspaceId`, `eventId`

Gera email HTML com:
- Nome do evento, data/hora, local, link do evento
- Botão "Confirmar Presença" que aponta para URL de confirmação
- Template visual alinhado com o da comunidade

Usa Resend (já configurado com `RESEND_API_KEY`) para enviar.

### 2. Editar `src/hooks/useEvents.ts` — `useInviteToEvent`

Após inserir o RSVP com sucesso, chamar `supabase.functions.invoke("send-event-invite")` se o email estiver presente. Não bloquear o insert se o email falhar (log + toast warning).

### 3. Editar `src/components/events/EventDetailPage.tsx`

Passar dados do evento ao `useInviteToEvent` para que a mutation tenha contexto suficiente para enviar o email (título, data, local, link).

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/send-event-invite/index.ts` | Edge function que envia email de convite para evento |
| `src/hooks/useEvents.ts` | Chamar edge function após insert do RSVP |
| `src/components/events/EventDetailPage.tsx` | Passar dados do evento à mutation |

