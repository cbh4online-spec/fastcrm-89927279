

## Corrigir Lógica Entrada/Saída no QR Kiosk

### Diagnóstico

A edge function `hr-clock-qr` tem um bug na detecção do tipo de registo:

```
Sem sessão hoje → clock_in ✓
Sessão aberta (clock_in, sem clock_out) → clock_out ✓
Sessão completa (ambos preenchidos) → clock_in de novo (SOBREPÕE a sessão) ✗
```

Após o primeiro ciclo completo no mesmo dia, todos os scans subsequentes registam "Entrada" porque a condição `!session?.clock_out_at` é falsa quando a sessão já está completa.

### Solução

Reescrever a lógica na edge function `hr-clock-qr` para suportar múltiplos ciclos por dia e determinar correctamente se é entrada ou saída:

**Ficheiro**: `supabase/functions/hr-clock-qr/index.ts`

1. Em vez de procurar a sessão do dia, consultar a **última entrada em `hr_time_entries`** do colaborador hoje
2. Se não existe nenhuma entrada hoje, ou a última foi `clock_out` → registar `clock_in`
3. Se a última foi `clock_in` → registar `clock_out`
4. Manter a lógica de `hr_work_sessions` para o primeiro ciclo, mas permitir actualizar `clock_out_at` múltiplas vezes (última saída do dia)

**Query de decisão:**
```sql
SELECT entry_type FROM hr_time_entries
WHERE employee_id = ? AND recorded_at::date = today
ORDER BY recorded_at DESC LIMIT 1
```

**Regras:**
- Último registo `clock_in` ou `break_start` → próximo é `clock_out` ou `break_end`
- Último registo `clock_out` ou `break_end` ou inexistente → próximo é `clock_in`
- `hr_work_sessions.clock_out_at` actualiza sempre com o último `clock_out` do dia

### Impacto
- Apenas a edge function `hr-clock-qr/index.ts` é alterada
- Frontend (`HRKioskPage.tsx`) já mostra "Entrada"/"Saída" correctamente com base no `action` retornado — sem alterações necessárias

