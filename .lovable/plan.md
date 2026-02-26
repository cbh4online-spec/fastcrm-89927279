

# Link de Confirmação/Recusa no Email de Convite

## Abordagem

Criar uma edge function pública (`event-rsvp-respond`) que recebe `rsvp_id` e `action` (confirm/decline) via query params, actualiza o status na tabela `event_rsvps` e redireciona para uma página de confirmação. Os links são gerados no email de convite com um token simples (o próprio `rsvp_id`). Adicionalmente, criar uma página frontend para mostrar feedback visual ao convidado.

## Alterações

### 1. Nova edge function `supabase/functions/event-rsvp-respond/index.ts`

- Aceita GET com query params `rsvp_id` e `action` (`confirm` ou `decline`)
- Usa service role key para actualizar `event_rsvps` sem autenticação (link público)
- Mapeia `confirm` → status `confirmed`, `decline` → status `declined`, define `responded_at`
- Redireciona (HTTP 302) para página de feedback: `{baseUrl}/event-rsvp?status=confirmed&event=...`
- Adiciona `verify_jwt = false` no config (é um link público de email)

### 2. Editar `supabase/functions/send-event-invite/index.ts`

- Receber `rsvpId` no body da request
- Gerar URLs de confirmação e recusa apontando para a edge function: `{supabaseUrl}/functions/v1/event-rsvp-respond?rsvp_id=X&action=confirm`
- Adicionar dois botões lado a lado no email HTML: "Confirmar Presença" (verde) e "Recusar" (vermelho/cinza), antes do botão "Ver Evento" existente

### 3. Nova página `src/pages/EventRsvpResponse.tsx`

- Página pública (sem auth) que lê `status` e `event` dos query params
- Mostra mensagem de sucesso: "Presença confirmada!" ou "Convite recusado"
- Ícone visual (CheckCircle / XCircle) e link para voltar

### 4. Editar `src/App.tsx`

- Adicionar rota pública `/event-rsvp` para `EventRsvpResponse`

### 5. Editar código de envio de convites (hook)

- Passar `rsvpId` no payload enviado à edge function `send-event-invite`

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/event-rsvp-respond/index.ts` | Nova edge function pública |
| `supabase/functions/send-event-invite/index.ts` | Adicionar botões confirm/decline no email |
| `src/pages/EventRsvpResponse.tsx` | Página de feedback |
| `src/App.tsx` | Rota `/event-rsvp` |
| `src/hooks/useEvents.ts` | Passar rsvpId no envio |

