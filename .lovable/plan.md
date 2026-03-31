

## Detecção de Anomalias de Assiduidade

### Diagnóstico

O sistema actual tem:
- `hr_work_sessions` com clock_in/clock_out e status complete/incomplete
- `hr_schedules` com employee_id + shift_id + schedule_date (turno atribuído)
- `hr_shifts` com start_time/end_time (hora do turno)
- `hr_absences` com tipo, datas e status de aprovação
- `hr_country_labor_rules` com regras laborais (max horas, etc.)
- `admin_notifications` para alertas ao gestor

Não existe nenhuma lógica de detecção de anomalias. A página de Time Tracking mostra apenas overtime inline por sessão.

### Arquitectura

Criar uma **Edge Function agendada** (`hr-attendance-anomalies`) que corre 1x/dia (via pg_cron) e detecta 3 tipos de anomalia:

| Tipo | Lógica |
|------|--------|
| `open_session` | `hr_work_sessions` com status=incomplete e clock_in_at < now() - 12h |
| `late_arrival` | `hr_work_sessions.clock_in_at` > `hr_shifts.start_time` + tolerância (15min) para o schedule_date desse employee |
| `unjustified_absence` | Dia com schedule atribuído, sem work_session E sem hr_absences aprovada |

Resultados gravados numa nova tabela `hr_attendance_anomalies` e notificações criadas em `admin_notifications`.

Frontend: painel de anomalias na página de Time Tracking com badges de severidade e acções.

---

### Plano de Implementação

#### 1. Migração DB — tabela `hr_attendance_anomalies`

```sql
CREATE TABLE hr_attendance_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  anomaly_date date NOT NULL,
  anomaly_type text NOT NULL, -- 'open_session', 'late_arrival', 'unjustified_absence'
  severity text NOT NULL DEFAULT 'warning', -- 'warning', 'critical'
  description text,
  session_id uuid REFERENCES hr_work_sessions(id),
  schedule_id uuid REFERENCES hr_schedules(id),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, anomaly_date, anomaly_type)
);

ALTER TABLE hr_attendance_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view anomalies"
  ON hr_attendance_anomalies FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members can update anomalies"
  ON hr_attendance_anomalies FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
```

#### 2. Edge Function `hr-attendance-anomalies`

Para cada workspace activo:

1. **Sessões abertas >12h**: Query `hr_work_sessions` onde `status = 'incomplete'` e `clock_in_at < now() - interval '12 hours'`. Severidade: `critical`.

2. **Atrasos**: Para cada sessão de hoje/ontem, cruzar `hr_schedules` (com join a `hr_shifts`) para obter `start_time`. Se `clock_in_at::time > start_time + 15min` → anomalia `late_arrival`. Severidade: `warning`.

3. **Faltas não justificadas**: Para dias passados (ontem), verificar employees com `hr_schedules` atribuído mas sem `hr_work_sessions` nem `hr_absences` aprovada. Severidade: `critical`.

Upsert em `hr_attendance_anomalies` (unique por employee+date+type). Criar `admin_notifications` para novas anomalias.

#### 3. Hook `useHRAttendanceAnomalies`

```typescript
// src/hooks/hr/useHRAttendanceAnomalies.ts
// - Query hr_attendance_anomalies com join a hr_employees
// - Mutation resolveAnomaly (marcar como resolvida com notas)
// - Filtros por tipo, severidade, estado (resolvida/pendente)
```

#### 4. UI — Painel de Anomalias no `HRTimeTrackingPage`

Novo card acima da tabela de sessões:
- **KPI cards**: contagem por tipo (sessões abertas, atrasos, faltas)
- **Lista/tabela de anomalias** pendentes com: nome, data, tipo, severidade, acção "Resolver"
- **Dialog de resolução**: textarea para notas + botão confirmar
- Badges coloridos: critical=vermelho, warning=amarelo
- Filtro por tipo e estado

#### 5. Agendamento pg_cron

Executar a edge function diariamente às 07:00 UTC.

---

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Criar tabela `hr_attendance_anomalies` + RLS |
| `supabase/functions/hr-attendance-anomalies/index.ts` | Edge function de detecção |
| `src/hooks/hr/useHRAttendanceAnomalies.ts` | Hook CRUD + resolução |
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Adicionar painel de anomalias |

### Critérios de Aceitação

1. Sessões incompletas há >12h aparecem como anomalia crítica
2. Atrasos >15min face ao turno atribuído detectados
3. Dias com turno mas sem ponto e sem ausência justificada marcados como falta
4. Anomalias podem ser resolvidas com justificação
5. Notificações admin criadas para novas anomalias
6. Deduplicação via UNIQUE constraint (não duplica a mesma anomalia)

