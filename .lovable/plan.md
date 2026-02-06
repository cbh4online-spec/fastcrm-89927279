
# Plano: Integração de Videoconferencia por Workspace (Google Meet + Zoom)

## Contexto

Cada workspace representa uma empresa diferente que terá as suas proprias credenciais de Zoom e Google Meet. Vamos seguir o mesmo padrao ja usado para Stripe e GoHighLevel -- uma tabela de configuracao por workspace + edge functions para criar as reunioes.

## Arquitectura

### 1. Nova tabela: `workspace_video_config`

Armazenara as credenciais de Zoom e Google Meet por workspace:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| workspace_id | uuid | FK para workspaces (unique) |
| zoom_account_id | text | Zoom Account ID |
| zoom_client_id | text | Zoom Client ID |
| zoom_client_secret_encrypted | text | Zoom Client Secret |
| google_service_account_json | text | JSON da Service Account do Google (encriptado) |
| google_calendar_email | text | Email do calendario Google a usar |
| zoom_enabled | boolean | Se Zoom esta ativo |
| google_meet_enabled | boolean | Se Google Meet esta ativo |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de actualizacao |

RLS: Apenas owners/admins do workspace podem ver e editar (mesmo padrao de `workspace_stripe_config`).

### 2. Edge Function: `create-video-meeting`

Uma unica edge function que recebe o `workspace_id`, o `provider` (zoom ou google_meet) e os dados da reuniao, e:

1. Le as credenciais do workspace da tabela `workspace_video_config`
2. Se `provider = zoom`:
   - Obtem token OAuth via Server-to-Server (Account ID + Client ID + Client Secret)
   - Chama `POST https://api.zoom.us/v2/users/me/meetings` para criar a reuniao
   - Devolve o `join_url`
3. Se `provider = google_meet`:
   - Autentica com a Service Account (JWT)
   - Cria um evento no Google Calendar com `conferenceData` para gerar link do Meet
   - Devolve o `hangoutLink`

### 3. Hook: `useWorkspaceVideoConfig`

Hook React seguindo o padrao de `useWorkspaceStripeConfig` / `useWorkspaceGHLConfig`:
- Ler configuracao do workspace
- Guardar/actualizar credenciais
- Testar conexao

### 4. Componente: `WorkspaceVideoSettings`

Componente de settings seguindo o padrao do `WorkspaceGHLSettings`:
- Secao Zoom: campos para Account ID, Client ID, Client Secret, toggle ativo
- Secao Google Meet: upload/paste do JSON da Service Account, email do calendario, toggle ativo
- Botao de testar cada conexao
- Integrado na pagina de Settings > Integracoes

### 5. Alteracao no `MeetingCreateModal`

Quando o modo e "online":
- Mostrar dropdown com opcao de provider: "Google Meet", "Zoom", "Link manual"
- Se Google Meet ou Zoom selecionado, ao criar a reuniao:
  1. Chama a edge function `create-video-meeting`
  2. Recebe o link gerado
  3. Preenche automaticamente o campo `meeting_url` e `meeting_provider` na tabela `meetings`
- A tabela `meetings` ja tem os campos `meeting_url` e `meeting_provider` -- nao precisa de migracao

### 6. Integracao na pagina de Settings

Adicionar nova seccao "Videoconferencia" em `IntegrationsSettings.tsx` com o componente `WorkspaceVideoSettings`.

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/hooks/useWorkspaceVideoConfig.ts` | Hook para gerir config de video |
| `src/components/settings/sections/WorkspaceVideoSettings.tsx` | UI de settings |
| `supabase/functions/create-video-meeting/index.ts` | Edge function para criar reunioes |

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/meetings/MeetingCreateModal.tsx` | Adicionar selector de provider e logica de criacao automatica |
| `src/components/settings/sections/IntegrationsSettings.tsx` | Adicionar seccao de Videoconferencia |
| `src/hooks/useMeetings.ts` | Integrar chamada a edge function no `createMeeting` |

## Migracao de Base de Dados

Criar tabela `workspace_video_config` com RLS policies para owners/admins.

## Fluxo de Utilizacao

1. Admin do workspace vai a Settings > Integracoes > Videoconferencia
2. Configura credenciais do Zoom e/ou Google Meet
3. Ao criar uma reuniao online, seleciona o provider
4. O sistema cria automaticamente a reuniao na plataforma e preenche o link

## Secao Tecnica

### Zoom Server-to-Server OAuth
- Endpoint de token: `POST https://zoom.us/oauth/token?grant_type=account_credentials&account_id={accountId}`
- Header: `Authorization: Basic base64(clientId:clientSecret)`
- Endpoint de reuniao: `POST https://api.zoom.us/v2/users/me/meetings`

### Google Meet via Calendar API
- Autenticacao via Service Account JWT
- Criar evento com `conferenceDataVersion=1` e `createRequest` para gerar Meet link
- Endpoint: `POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?conferenceDataVersion=1`
