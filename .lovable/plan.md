

## Integração com Google Calendar

### Situação Atual
- O projeto já tem OAuth com Google configurado (credenciais `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` nos secrets)
- O fluxo OAuth já pede scope `calendar.events` e armazena tokens em `workspace_video_config`
- A tabela `calendar_events` já tem campos `metadata` onde podemos guardar `google_event_id`
- A tabela `scheduling_settings` já tem coluna `sync_with_google_calendar`

### O que será implementado

**Sincronização bidirecional**: eventos criados/editados/eliminados no FastCRM são refletidos no Google Calendar e vice-versa.

### Alterações

#### 1. Tabela `google_calendar_sync` (nova migração)
- Mapeia calendários internos a calendários Google (`calendar_id` ↔ `google_calendar_id`)
- Armazena `sync_token` para sincronização incremental via Google API
- Armazena `last_synced_at` e `sync_direction` (push/pull/both)

#### 2. Edge Function `google-calendar-sync` (nova)
- **Push**: Quando chamada com `action: push`, cria/atualiza/elimina eventos no Google Calendar
- **Pull**: Quando chamada com `action: pull`, busca eventos novos/alterados do Google (via `syncToken` incremental) e insere/atualiza na tabela `calendar_events`
- Reutiliza o token refresh já existente em `create-video-meeting`
- Guarda `google_event_id` no campo `metadata` de cada evento

#### 3. Edge Function `google-calendar-webhook` (nova)
- Recebe push notifications do Google Calendar (channel watch)
- Dispara pull automático quando há alterações no Google

#### 4. Hook `useGoogleCalendarSync` (novo)
- Conectar/desconectar calendário do Google
- Disparar sync manual
- Estado de sincronização (último sync, erros)

#### 5. Atualizar `useCalendarEvents.ts`
- Após `createEvent`/`updateEvent`/`deleteEvent`, disparar push para Google se o calendário estiver ligado

#### 6. UI - Painel de sincronização Google
- No `CalendarSidebar` ou nas settings do calendário, botão "Ligar ao Google Calendar"
- Seletor de qual calendário Google usar
- Indicador de estado de sync e botão "Sincronizar agora"

### Fluxo técnico

```text
Criar evento no FastCRM
  → insert calendar_events
  → check google_calendar_sync mapping
  → call google-calendar-sync (push)
  → Google Calendar API creates event
  → store google_event_id in metadata

Google Calendar change
  → webhook → google-calendar-webhook
  → call google-calendar-sync (pull)
  → upsert calendar_events with google data
```

### Ficheiros a criar/alterar
- `supabase/migrations/` — tabela `google_calendar_sync`
- `supabase/functions/google-calendar-sync/index.ts` — push/pull sync
- `supabase/functions/google-calendar-webhook/index.ts` — webhook receiver
- `src/hooks/useGoogleCalendarSync.ts` — hook de sincronização
- `src/hooks/useCalendarEvents.ts` — trigger push após CRUD
- `src/components/calendars/GoogleCalendarConnect.tsx` — UI de ligação
- `src/components/calendars/CalendarSidebar.tsx` — integrar botão Google

