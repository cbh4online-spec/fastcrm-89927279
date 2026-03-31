

## Melhorar Edge Function `hr-clock-action` — Cenários Edge

### Diagnóstico

A função actual tem 3 lacunas:

1. **Clock-in duplicado** — Se já existe sessão aberta (sem clock_out), um novo clock_in é silenciosamente ignorado (não cria sessão mas também não avisa o utilizador).
2. **Clock-out sem sessão** — Se não existe sessão aberta, o clock_out insere o time_entry mas não faz nada com a sessão, sem feedback ao utilizador.
3. **Break sem sessão activa** — Não há validação para break_start/break_end sem sessão aberta.

### Solução

Adicionar **validações de estado** antes de inserir o time_entry, retornando erros 400 claros:

| Cenário | Validação | Resposta |
|---|---|---|
| `clock_in` com sessão aberta | Sessão existe e `clock_out_at IS NULL` | 400 — "Já existe uma sessão aberta. Faça clock-out primeiro." |
| `clock_out` sem sessão aberta | Não existe sessão hoje ou `clock_out_at` já preenchido | 400 — "Nenhuma sessão aberta para terminar." |
| `break_start`/`break_end` sem sessão aberta | Mesma verificação | 400 — "Nenhuma sessão aberta para registar pausa." |

### Implementação — 1 ficheiro

**`supabase/functions/hr-clock-action/index.ts`**

1. Mover a query de sessão existente para **antes** da inserção do time_entry
2. Adicionar bloco de validação por `entry_type`:
   - `clock_in`: rejeitar se existe sessão com `clock_out_at IS NULL`
   - `clock_out`: rejeitar se não existe sessão ou já tem `clock_out_at`
   - `break_start`/`break_end`: rejeitar se não existe sessão aberta
3. Só inserir o `hr_time_entries` **após** validação passar
4. Melhorar a query de sessão existente para filtrar `clock_out_at` is null (sessão aberta)

**Frontend `useClockAction`** — Actualizar `onError` para mostrar a mensagem de erro do backend (já existe toast genérico, melhorar para mostrar `error.message` ou o body do response).

### Critérios de aceitação
1. Clock-in com sessão aberta retorna 400 com mensagem clara
2. Clock-out sem sessão aberta retorna 400 com mensagem clara
3. Break sem sessão aberta retorna 400
4. Fluxo normal clock-in → clock-out continua a funcionar
5. Frontend mostra mensagem de erro específica do backend

