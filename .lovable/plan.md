

# Refazer Sistema de Pica Ponto — Suporte a Múltiplas Sessões e Dinâmica Completa

## Problema Identificado

A tabela `hr_work_sessions` tem uma constraint `UNIQUE (employee_id, session_date)` que impede mais do que uma sessão por dia. Quando o colaborador faz "Terminar" (clock-out), não consegue voltar a "Iniciar Trabalho" porque o insert falha silenciosamente.

Além disso, faltam funcionalidades essenciais de controlo de ponto:
- Pausas (almoço) com registo de início/fim
- Tolerância configurável (ex: 5-10 min na entrada)
- Múltiplas sessões diárias (manhã + tarde)
- Resumo do dia com períodos visíveis
- Estado visual claro do ponto (entrada manhã → pausa almoço → entrada tarde → saída)

## Solução

### 1. Migração DB — Permitir múltiplas sessões por dia

- Remover constraint `UNIQUE (employee_id, session_date)`
- Adicionar coluna `session_type` (text: 'morning', 'afternoon', 'extra') com default 'morning'
- Adicionar coluna `break_start_at` e `break_end_at` (timestamptz) para registo preciso de pausas

### 2. Edge Function `hr-clock-action` — Lógica multi-sessão

Reescrever a lógica para suportar o fluxo completo:

```text
Iniciar Manhã → Pausa Almoço → Retomar (cria sessão tarde) → Terminar Dia
```

- **clock_in**: Se não há sessão aberta hoje, cria nova (morning). Se existe sessão completa sem sessão afternoon, cria afternoon.
- **break_start**: Marca `break_start_at` na sessão activa.
- **break_end**: Marca `break_end_at`, calcula `break_minutes`. Opcionalmente cria nova sessão "afternoon".
- **clock_out**: Fecha a sessão activa actual.
- Validação: impedir clock_in se já há sessão aberta (incompleta).

### 3. ClockInOutButton — UI com estados completos

Transformar o botão simples num mini-painel de ponto com 4 estados:

| Estado | Botões Visíveis |
|---|---|
| Sem sessão activa | "Iniciar Trabalho" |
| Em serviço (sem pausa) | "Pausa Almoço" + "Terminar" |
| Em pausa | "Retomar Trabalho" |
| Sessão da manhã completa, sem tarde | "Iniciar Tarde" |

Mostrar resumo do dia: entradas/saídas anteriores, total acumulado.

### 4. Tolerância na entrada

- Ler `tolerance_minutes` das `hr_country_labor_rules` (campo existente ou novo no JSON `rules`)
- No clock_in, comparar com hora de início do turno do colaborador
- Se dentro da tolerância, registar normalmente; se fora, marcar como atraso (já existe anomalia `late_arrival`)

## Alterações

| Ficheiro/Recurso | Acção |
|---|---|
| **Migração SQL** | DROP unique constraint, ADD `session_type`, `break_start_at`, `break_end_at` |
| `supabase/functions/hr-clock-action/index.ts` | Reescrever lógica: suportar múltiplas sessões, pausas com timestamps, tolerância |
| `src/components/hr/ClockInOutButton.tsx` | UI multi-estado: Iniciar, Pausa, Retomar, Terminar + resumo do dia |
| `src/hooks/hr/useHRTimeEntries.ts` | Ajustar query para devolver múltiplas sessões por dia |
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Tabela de sessões mostra tipo (manhã/tarde) e pausas |

### Detalhe da migração

```sql
-- Remove single-session-per-day constraint
ALTER TABLE hr_work_sessions 
  DROP CONSTRAINT hr_work_sessions_employee_id_session_date_key;

-- Add session type and break timestamps
ALTER TABLE hr_work_sessions
  ADD COLUMN session_type text NOT NULL DEFAULT 'morning',
  ADD COLUMN break_start_at timestamptz,
  ADD COLUMN break_end_at timestamptz;

-- Add unique constraint per employee + date + session_type
ALTER TABLE hr_work_sessions
  ADD CONSTRAINT hr_work_sessions_employee_date_type_key 
  UNIQUE (employee_id, session_date, session_type);
```

### Detalhe do fluxo na Edge Function

```text
clock_in:
  1. Buscar sessões de hoje para este employee
  2. Se existe sessão incompleta (sem clock_out) → erro
  3. Se não existem sessões → criar "morning"
  4. Se existe "morning" completa e não existe "afternoon" → criar "afternoon"
  5. Se existe "afternoon" completa → criar "extra"

break_start:
  1. Buscar sessão activa (sem clock_out)
  2. Marcar break_start_at = now

break_end:
  1. Buscar sessão com break_start_at e sem break_end_at
  2. Marcar break_end_at = now
  3. Calcular break_minutes

clock_out:
  1. Buscar sessão activa
  2. Fechar com clock_out_at, calcular totais
```

