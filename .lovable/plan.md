

# Último Login e Tempo Despendido por Utilizador

## Objectivo

Adicionar à tabela de Utilizadores no Super Admin duas novas colunas visíveis: **último login** (baseado em `last_activity_at` dos `session_time_logs`) e **tempo total despendido** (soma de `active_seconds`). Sem necessidade de novas tabelas — os dados já existem em `session_time_logs`.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/UsersSection.tsx` | Adicionar query para `session_time_logs`, agregar por `user_id`, mostrar 2 novas colunas na tabela |

## Detalhe técnico

### Nova query (dentro do `UsersSection`)

```sql
SELECT user_id, 
       MAX(last_activity_at) as last_seen,
       SUM(active_seconds) as total_active_seconds,
       SUM(total_seconds) as total_seconds
FROM session_time_logs 
GROUP BY user_id
```

Será feita via `supabase.rpc` ou query directa com `.select()` + agrupação client-side (dado que a tabela tem poucos registos por utilizador).

### Novas colunas na tabela

1. **Último acesso** — mostra data/hora relativa (ex: "há 2h", "há 3 dias") usando `formatDistanceToNow` do date-fns, com tooltip do timestamp exacto
2. **Tempo ativo** — mostra total de horas activas acumuladas (ex: "14h 33m"), formatado de forma legível

### Integração no `EnrichedUser`

Adicionar ao objecto `EnrichedUser`:
- `lastSeen: string | null` — timestamp do último acesso
- `totalActiveSeconds: number` — total de segundos activos
- `totalSeconds: number` — total geral

### UX

- Colunas adicionadas entre "Roles" e "Registado"
- Utilizadores sem dados de sessão mostram "—"
- Ícone `Clock` para tempo e `LogIn` para último acesso
- Ordenação por último acesso (mais recente primeiro) como opção

