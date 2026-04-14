

# Corrigir Ligação ao Google Calendar no Calendário

## Diagnóstico

O erro é claro: quando clica "Ligar ao Google Calendar" na barra lateral do calendário, a edge function retorna:
```
"Google Calendar não está conectado. Configure o Google Meet primeiro."
```

**Causa raiz:** O componente `GoogleCalendarConnect` na sidebar tenta listar calendários Google, mas depende dos tokens OAuth armazenados em `workspace_video_config` — que só são criados quando o utilizador conecta o **Google Meet** em **Definições > Integrações > Vídeo**. São dois conceitos misturados: a sincronização de calendário e a videoconferência partilham os mesmos tokens OAuth, mas a UI não guia o utilizador correctamente.

**Problema actual:**
- Sidebar mostra "Ligar ao Google Calendar" → clica → falha com erro críptico
- O utilizador não sabe que precisa de ir a Definições > Vídeo > Google Meet primeiro
- A UX é confusa: "configurar Google Meet" para poder sincronizar o Google Calendar

## Plano de Implementação

### 1. Iniciar OAuth directamente do sidebar (sem depender do Meet)
**Ficheiro:** `src/components/calendars/GoogleCalendarConnect.tsx`

Quando o utilizador clica "Ligar ao Google Calendar" e não existem tokens Google no workspace:
- Invocar `video-auth-url` com `provider: google_meet` directamente (reutiliza a mesma infra OAuth)
- Abrir popup/redirect OAuth do Google
- Após callback com sucesso, listar os calendários automaticamente
- Elimina a necessidade de o utilizador ir às definições de vídeo primeiro

### 2. Melhorar tratamento de erro no hook
**Ficheiro:** `src/hooks/useGoogleCalendarSync.ts`

- Detectar o erro específico "Google Calendar não está conectado"
- Em vez de mostrar toast genérico, passar um estado `needsOAuth: true` ao componente
- O componente reage mostrando botão de OAuth em vez do selector vazio

### 3. Criar auto-connect no workspace_video_config
**Ficheiro:** `supabase/functions/google-calendar-sync/index.ts`

- Se `workspace_video_config` não existir para o workspace, criar automaticamente o registo (sem tokens) para evitar erro no `video-oauth-callback` que faz `.single()` e falha se não encontrar

### 4. Fluxo visual melhorado

```text
Utilizador clica "Ligar ao Google Calendar"
  ├── Tokens Google existem?
  │   ├── SIM → Listar calendários (fluxo actual)
  │   └── NÃO → Iniciar OAuth Google (popup)
  │             ├── Sucesso → Guardar tokens → Listar calendários
  │             └── Erro → Mostrar mensagem clara
  └── Seleccionar calendário → Confirmar ligação
```

### Ficheiros alterados

| Ficheiro | Acção |
|----------|-------|
| `src/components/calendars/GoogleCalendarConnect.tsx` | OAuth directo + UX melhorada |
| `src/hooks/useGoogleCalendarSync.ts` | Estado `needsOAuth` + tratamento erro |
| `supabase/functions/google-calendar-sync/index.ts` | Auto-create config se necessário |

### Critérios de Aceitação
- Clicar "Ligar ao Google Calendar" na sidebar funciona sem configuração prévia
- OAuth Google é iniciado directamente se não houver tokens
- Após OAuth, calendários são listados automaticamente
- Sem necessidade de ir a Definições > Vídeo primeiro
- Sem regressão no fluxo de Google Meet/Zoom nas definições

