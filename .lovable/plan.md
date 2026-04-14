

# Integração Automática de Videoconferência nas Marcações de Calendário

## Diagnóstico

A infraestrutura de videoconferência já existe e está robusta:
- **Edge functions:** `create-video-meeting`, `video-auth-url`, `video-oauth-callback` -- todas operacionais
- **Tabela:** `workspace_video_config` com suporte a Zoom e Google Meet (tokens OAuth, refresh, etc.)
- **Settings UI:** `WorkspaceVideoSettings` na página de Integrações -- funcional
- **MeetingCreateModal:** Já cria links automáticos quando o utilizador seleciona Zoom/Google Meet

**O que falta (gap identificado):**

1. **Booking público (`public-booking`):** Quando um visitante agenda via página pública, o evento é criado SEM link de videoconferência, mesmo que o `booking_page` tenha `meeting_provider` configurado e o workspace tenha Zoom/Meet conectado.

2. **CalendarEventModal:** O modal de criação de evento no calendário não oferece opção para gerar link automático de Zoom/Meet (ao contrário do MeetingCreateModal que já o faz).

3. **Sem default automático:** Quando o workspace tem um provider conectado, a criação de eventos/reuniões não o pré-seleciona automaticamente.

---

## Plano de Implementação

### 1. Auto-criar link de vídeo no Booking Público
**Ficheiro:** `supabase/functions/public-booking/index.ts`

Na função `handleConfirmBooking`, após criar o `calendar_event`:
- Consultar `booking_pages.meeting_provider` (campo já existe no schema)
- Se o provider estiver definido (zoom/google_meet), consultar `workspace_video_config`
- Invocar internamente a lógica de criação de meeting (reutilizando as funções de token refresh + API call do `create-video-meeting`)
- Actualizar o `calendar_event` com `meeting_url`
- Retornar o `meeting_url` na resposta para mostrar na confirmação ao visitante

### 2. Adicionar selecção de provider no CalendarEventModal
**Ficheiro:** `src/components/calendars/CalendarEventModal.tsx`

- Adicionar campo `video_provider` ao schema (none/zoom/google_meet/manual)
- Mostrar selector quando `meeting_url` está visível
- No submit, se provider != manual/none, invocar `create-video-meeting` (mesma lógica do MeetingCreateModal)
- Preencher `meeting_url` automaticamente

### 3. Hook para detectar providers disponíveis
**Ficheiro:** `src/hooks/useAvailableVideoProviders.ts` (novo)

- Hook leve que consulta `workspace_video_config` e retorna quais providers estão conectados
- Usado no CalendarEventModal e no MeetingCreateModal para mostrar apenas providers disponíveis e pré-seleccionar o default

### 4. Mostrar link de vídeo na confirmação de booking
**Ficheiro:** `src/components/booking/BookingConfirmation.tsx`

- Receber `meeting_url` do resultado do booking
- Mostrar botão "Entrar na reunião" com o link de Zoom/Meet

### 5. Deploy da edge function actualizada
- A edge function `public-booking` precisa de ser re-deployed com a nova lógica de criação de vídeo

---

## Detalhes Técnicos

### public-booking -- lógica de auto-create

```text
handleConfirmBooking()
  ├── Criar calendar_event (existente)
  ├── Verificar page.meeting_provider
  │   ├── Se "zoom" ou "google_meet":
  │   │   ├── Buscar workspace_video_config
  │   │   ├── Refresh token se expirado
  │   │   ├── Criar meeting via API (Zoom/Google)
  │   │   ├── UPDATE calendar_event SET meeting_url = link
  │   │   └── Incluir meeting_url na resposta
  │   └── Se null/none: comportamento actual
  └── Retornar resposta
```

### Ficheiros alterados

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/public-booking/index.ts` | Adicionar auto-create de vídeo |
| `src/components/calendars/CalendarEventModal.tsx` | Adicionar selector de provider |
| `src/hooks/useAvailableVideoProviders.ts` | Novo hook |
| `src/components/booking/BookingConfirmation.tsx` | Mostrar link de meeting |

### Critérios de Aceitação

- Booking público com provider configurado gera link de Zoom/Meet automaticamente
- CalendarEventModal permite criar eventos com link de vídeo automático
- Confirmação de booking mostra link de acesso à reunião
- Sem regressões na criação manual de reuniões (MeetingCreateModal)

