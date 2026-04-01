

# Ativar Funcionalidade de Quem Está Online

## Abordagem

Usar **Supabase Realtime Presence** para rastrear utilizadores online no workspace em tempo real, sem necessidade de novas tabelas.

## Implementação

### 1. Hook `useOnlinePresence` (Novo)
**Ficheiro:** `src/hooks/useOnlinePresence.ts`

- Subscrever canal Realtime Presence com `workspace:{id}` como channel name
- Fazer `track()` com `user_id`, `full_name`, `avatar_url` ao montar
- Escutar `sync` events para manter lista de utilizadores online
- Retornar `{ onlineUsers, onlineCount }`
- Cleanup: `untrack()` + `unsubscribe()` ao desmontar

### 2. Componente `OnlineUsersIndicator` (Novo)
**Ficheiro:** `src/components/layout/OnlineUsersIndicator.tsx`

- Mostrar ícone `Users` + count de utilizadores online (estilo similar ao `ContextScoreIndicator`)
- Tooltip ou dropdown com avatares dos utilizadores online
- Dot verde animado para indicar "live"
- Click abre popover com lista completa (nome + avatar + role)

### 3. Integrar no TopBar
**Ficheiro:** `src/components/layout/TopBar.tsx`

- Adicionar `<OnlineUsersIndicator />` entre `LanguageSelector` e `TopBarCreditsBadge`

### Ficheiros a criar/alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useOnlinePresence.ts` | **Novo** — hook Realtime Presence |
| `src/components/layout/OnlineUsersIndicator.tsx` | **Novo** — indicador visual com popover |
| `src/components/layout/TopBar.tsx` | Adicionar `OnlineUsersIndicator` |

### Notas técnicas
- Realtime Presence não requer tabelas nem migrações — funciona via canais WebSocket
- Sem RLS concerns — Presence usa channels, não tabelas
- Presença é automaticamente removida quando o utilizador fecha o browser

