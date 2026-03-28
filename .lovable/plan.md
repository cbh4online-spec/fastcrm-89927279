

# Fix: Métricas de Performance e Nomes no Leaderboard

## Problemas Identificados

### 1. Leaderboard mostra "Utilizador" em vez de nomes reais
No `usePerformanceScores.ts`, o leaderboard faz lookup de profiles por `p.id` mas procura por `s.user_id`. A tabela `profiles` tem `id` (PK do profile) e `user_id` (referência ao auth user). Como `performance_scores.user_id` guarda o auth user ID, o lookup falha e cai para o fallback "Utilizador".

**Fix**: Alterar a query de profiles para `select("user_id, full_name, avatar_url")` e mapear por `user_id`.

### 2. Métricas atribuem os mesmos valores a todos os membros
O `useRecalculateScores` itera por cada membro do workspace, mas as queries a `leads`, `meetings`, `proposals` e `opportunities` filtram apenas por `workspace_id` — nunca por `assigned_to`. Todos os membros recebem exactamente os mesmos números.

**Fix**: Adicionar `.eq("assigned_to", uid)` em cada query de recalculação para leads, proposals e opportunities. Para meetings, filtrar por `created_by` ou `assigned_to` conforme disponível.

## Ficheiros

| Ficheiro | Mudança |
|---|---|
| `src/hooks/usePerformanceScores.ts` | **useLeaderboard**: mudar select de profiles para `user_id, full_name, avatar_url` e mapear por `user_id` em vez de `id` |
| `src/hooks/usePerformanceScores.ts` | **useRecalculateScores**: adicionar filtro `.eq("assigned_to", uid)` nas queries de leads, proposals, opportunities; adicionar filtro equivalente em meetings |

## Detalhe Técnico

```text
Antes (leaderboard):
  select("id, full_name, avatar_url").in("id", userIds)
  Map: p.id → p
  Lookup: profileMap.get(s.user_id) → ❌ miss → "Utilizador"

Depois:
  select("user_id, full_name, avatar_url").in("user_id", userIds)
  Map: p.user_id → p
  Lookup: profileMap.get(s.user_id) → ✅ nome real

Antes (recalculate - leads):
  .eq("workspace_id", wid).gte("created_at", startISO)...
  → Todos os membros recebem o total do workspace

Depois:
  .eq("workspace_id", wid).eq("assigned_to", uid).gte("created_at", startISO)...
  → Cada membro recebe só os seus leads/deals/propostas
```

