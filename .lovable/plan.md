

## Integrar Regras de Legislação nos Módulos HR

### Contexto
As regras laborais estão armazenadas em `hr_country_labor_rules` mas não são consumidas pelos módulos de ponto e ausências. Precisamos de duas integrações concretas.

### Integração 1 — Alerta de horas diárias máximas no clock-out

**Edge function `hr-clock-action`** — No clock-out, após calcular `workedMin`, consultar `hr_country_labor_rules` do workspace activo e comparar com `max_daily_hours`. Retornar um campo `overtime_alert` na resposta com os minutos excedidos.

**Frontend `useClockAction`** — Ler o campo `overtime_alert` do response e mostrar um toast de aviso amarelo quando excedido (ex: "⚠️ Jorge Cardoso excedeu o limite diário em 45 min").

**Frontend `HRTimeTrackingPage`** — Na tabela de sessões, mostrar badge "Overtime" a vermelho quando `worked_minutes > max_daily_hours * 60`. Usar o hook `useActiveLaborRules()` para obter o limite.

### Integração 2 — Saldo base de férias dinâmico

**Edge function `hr-leave-request-create`** — Quando não existe `hr_leave_balances` para o funcionário/tipo/ano (linha 143-154), em vez de criar com `total_days: 0`, consultar `hr_country_labor_rules` activa e usar `annual_vacation_days` como `total_days` (se o tipo de ausência for de férias, i.e. código "ferias" ou "FER").

**Frontend** — No hook `useHRLeaveBalances`, o saldo já virá correcto do backend. Sem alterações necessárias no frontend para esta parte.

### Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/hr-clock-action/index.ts` | Consultar regras activas no clock-out, calcular overtime, incluir `overtime_alert` no response |
| `supabase/functions/hr-leave-request-create/index.ts` | Usar `annual_vacation_days` das regras activas como saldo base quando se cria balance novo |
| `src/hooks/hr/useHRTimeEntries.ts` | No `onSuccess` de `useClockAction`, mostrar toast de alerta se `overtime_alert` |
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Consumir `useActiveLaborRules()`, mostrar badge Overtime nas sessões que excedem limite |

### Detalhes técnicos

**hr-clock-action** — bloco a adicionar após o update da sessão (linha ~64):
```typescript
// Fetch active labor rules
const { data: laborRule } = await supabase
  .from("hr_country_labor_rules")
  .select("rules")
  .eq("workspace_id", workspace_id)
  .eq("is_active", true)
  .maybeSingle();

const maxDailyMin = (laborRule?.rules?.max_daily_hours || 8) * 60;
const overtimeMin = Math.max(0, workedMin - maxDailyMin);
// Include in response
```

**hr-leave-request-create** — no bloco `else` (linha 143):
```typescript
// Fetch active labor rules for vacation days
const { data: laborRule } = await adminClient
  .from("hr_country_labor_rules")
  .select("rules")
  .eq("workspace_id", workspace_id)
  .eq("is_active", true)
  .maybeSingle();

const absType = await adminClient.from("hr_absence_types")
  .select("code").eq("id", absence_type_id).single();

const isVacation = ["FER","ferias","VAC"].includes(absType?.data?.code || "");
const baseDays = isVacation ? (laborRule?.rules?.annual_vacation_days || 22) : 0;
```

### Critérios de aceitação
1. Clock-out retorna `overtime_alert` com minutos excedidos quando aplicável
2. Toast amarelo aparece no frontend ao fazer clock-out com overtime
3. Tabela de sessões mostra badge "Overtime" nas sessões que excedem limite
4. Novo pedido de férias cria saldo com `total_days` = dias de férias do país activo (22 para PT)
5. Regras são lidas da tabela `hr_country_labor_rules` — não hardcoded

