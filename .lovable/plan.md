

## Melhorar `hr-clock-action` — calcular minutos no clock-out

### Problema
Ao fazer clock-out, o edge function actualiza `clock_out_at` e `status` mas **não calcula `worked_minutes` nem `total_minutes`**, deixando estes campos a `null`. Consequência: dashboards, tabelas de sessões e KPIs mostram "—" em vez de horas trabalhadas.

### Solução

Alterar **1 ficheiro**: `supabase/functions/hr-clock-action/index.ts`

No bloco de clock-out (linhas 51-57), após obter a sessão existente com `clock_in_at`, calcular:

```
total_minutes = diferença em minutos entre clock_in_at e now
worked_minutes = total_minutes - break_minutes (da sessão existente, default 0)
```

E incluir ambos os campos no `.update()`.

### Alteração concreta

```typescript
// No select, adicionar break_minutes
.select("id, clock_in_at, break_minutes")

// No update de clock_out
const clockInTime = new Date(existing.clock_in_at).getTime();
const totalMin = Math.round((now.getTime() - clockInTime) / 60000);
const breakMin = existing.break_minutes || 0;
const workedMin = Math.max(0, totalMin - breakMin);

await supabase.from("hr_work_sessions").update({
  clock_out_at: now.toISOString(),
  total_minutes: totalMin,
  worked_minutes: workedMin,
  status: "complete",
  updated_at: now.toISOString()
}).eq("id", existing.id);
```

### Critérios de aceitação
1. Após clock-out, `worked_minutes` e `total_minutes` ficam preenchidos na sessão
2. Dashboard e tabelas mostram horas correctas
3. `break_minutes` é descontado se existir

