

## Refatoração Estrutural do Módulo HR — Plano de Execução

---

### 1. Diagnóstico do Estado Atual

**Fontes de verdade duplicadas:**
- `profiles` — identidade base (nome, email, avatar)
- `workspace_members` — pertença ao workspace (role)
- `hr_employee_profiles` — dados HR legacy (department texto livre, job_title texto, contract_type, weekly_hours, qr_code_token) — referencia `member_id` de workspace_members
- `hr_employees` — tabela HR core (já tem department_id FK, position_id FK, manager_id self-ref) — mas é tratada como secundária

**Problemas concretos identificados:**
1. `useHREmployees` lê workspace_members + profiles + hr_employee_profiles, ignora hr_employees
2. `HREmployeesPage.handleSaveProfile` grava em hr_employee_profiles E tenta sincronizar manualmente para hr_employees
3. `hr_employees.department` é texto livre; `department_id` existe como FK mas não é usado nos hooks de listagem
4. `useHRDepartments` força `head: null, parent: null` — as FKs existem mas os joins são ignorados
5. `hr_departments.head_id` aponta para `workspace_members.id` (errado) — deveria apontar para `hr_employees.id`
6. `hr_employee_create` edge function já cria em hr_employees directamente, mas o frontend de edição usa hr_employee_profiles
7. Não existem permissões HR dedicadas (roles employee/manager/hr_manager/recruiter)

**Schema hr_employees actual (da types.ts):**
Já tem: department_id (FK hr_departments), position_id (FK hr_job_titles), manager_id (self-ref hr_employees), user_id, employee_number, full_name, status, weekly_hours, qr_code_token, contract_type, etc. A estrutura pretendida **já existe em grande parte**.

---

### 2. Roadmap por Prioridade

#### P0 — Fonte de Verdade Única (V1)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| 1 | **Migração DB**: Alterar FK `hr_departments.head_id` de workspace_members para hr_employees. Adicionar `contract_type_id` FK em hr_employees. Adicionar trigger de validação anti-ciclo em parent_department_id e anti-self em manager_id | Migration SQL |
| 2 | **Migração de dados**: Copiar dados de hr_employee_profiles para hr_employees (onde user_id match via workspace_members) | Migration SQL |
| 3 | **Reescrever `useHREmployees`**: Ler hr_employees com joins a profiles (via user_id), hr_departments, hr_job_titles. Eliminar leitura de hr_employee_profiles e workspace_members | `src/hooks/hr/useHREmployees.ts` |
| 4 | **Reescrever `useHRDepartments`**: Join real a hr_employees para head, self-join para parent, count de employees por departamento | `src/hooks/hr/useHRDepartments.ts` |
| 5 | **Corrigir `HREmployeesPage`**: Formulário com selects relacionais (department_id, position_id, manager_id, contract_type_id). Remover sync manual | `src/pages/dashboard/hr/HREmployeesPage.tsx` |
| 6 | **Corrigir `HREmployeeDetailPage`**: Mesma lógica relacional, sem texto livre | `src/pages/dashboard/hr/HREmployeeDetailPage.tsx` |
| 7 | **Corrigir `HRDepartmentsPage`**: Mostrar head real, parent real, headcount real | `src/pages/dashboard/hr/HRDepartmentsPage.tsx` |
| 8 | **Actualizar `hr-clock-qr`**: Ler de hr_employees em vez de hr_employee_profiles | `supabase/functions/hr-clock-qr/index.ts` |

#### P1 — Robustez Operacional (V1.1)

| # | Tarefa |
|---|--------|
| 9 | **Assiduidade avançada**: Correção manual de sessões com justificação, aprovação, detecção de anomalias (atrasos, faltas, sessão aberta > 12h) |
| 10 | **Ausências melhoradas**: Cadeia de aprovação por manager_id, validação de saldo antes de aprovar, calendário de equipa |
| 11 | **Permissões HR**: Criar tabela `hr_roles` ou usar `user_roles` existente com roles employee/manager/hr_manager/recruiter. RLS policies por role |
| 12 | **Enforcement completo de regras laborais**: Descanso entre turnos, pausas obrigatórias, período experimental, feriados em ausências |

#### P2 — Escalabilidade (V2)

| # | Tarefa |
|---|--------|
| 13 | Organograma visual interactivo |
| 14 | Overtime aprovado vs não aprovado com workflow |
| 15 | Auditoria completa de alterações HR |
| 16 | Portal do colaborador (self-service) |

---

### 3. Detalhes Técnicos P0

#### 3.1 Migração SQL

```sql
-- 1. Drop old FK on hr_departments.head_id (references workspace_members)
ALTER TABLE hr_departments DROP CONSTRAINT IF EXISTS hr_departments_head_id_fkey;

-- 2. Add new FK to hr_employees
ALTER TABLE hr_departments 
  ADD CONSTRAINT hr_departments_head_employee_id_fkey 
  FOREIGN KEY (head_id) REFERENCES hr_employees(id) ON DELETE SET NULL;

-- 3. Add contract_type_id FK to hr_employees
ALTER TABLE hr_employees 
  ADD COLUMN IF NOT EXISTS contract_type_id uuid REFERENCES hr_contract_types(id) ON DELETE SET NULL;

-- 4. Migrate data from hr_employee_profiles to hr_employees
-- Match via workspace_members.id = hr_employee_profiles.member_id → workspace_members.user_id = hr_employees.user_id
UPDATE hr_employees e
SET 
  employee_number = COALESCE(e.employee_number, p.employee_number),
  contract_type = COALESCE(e.contract_type, p.contract_type),
  weekly_hours = COALESCE(e.weekly_hours, p.weekly_hours),
  qr_code_token = COALESCE(e.qr_code_token, p.qr_code_token),
  notes = COALESCE(e.notes, p.notes),
  start_date = COALESCE(e.start_date, p.start_date),
  end_date = COALESCE(e.end_date, p.end_date),
  status = COALESCE(e.status, p.status)
FROM hr_employee_profiles p
JOIN workspace_members wm ON wm.id = p.member_id
WHERE e.user_id = wm.user_id
  AND e.workspace_id = p.workspace_id;

-- 5. Trigger: prevent manager_id = id (self-reference)
CREATE OR REPLACE FUNCTION prevent_self_manager()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'Employee cannot be their own manager';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_manager
  BEFORE INSERT OR UPDATE ON hr_employees
  FOR EACH ROW EXECUTE FUNCTION prevent_self_manager();

-- 6. Trigger: prevent circular parent_department_id
CREATE OR REPLACE FUNCTION prevent_circular_department()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_id uuid := NEW.parent_department_id;
  depth int := 0;
BEGIN
  IF NEW.parent_department_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_department_id = NEW.id THEN
    RAISE EXCEPTION 'Department cannot be its own parent';
  END IF;
  WHILE current_id IS NOT NULL AND depth < 20 LOOP
    SELECT parent_department_id INTO current_id FROM hr_departments WHERE id = current_id;
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular department hierarchy detected';
    END IF;
    depth := depth + 1;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_circular_department
  BEFORE INSERT OR UPDATE ON hr_departments
  FOR EACH ROW EXECUTE FUNCTION prevent_circular_department();
```

#### 3.2 Hook `useHREmployees` (reescrito)

```typescript
// Ler directamente de hr_employees com joins
const { data, error } = await supabase
  .from("hr_employees")
  .select(`
    *,
    profiles:user_id(full_name, email, avatar_url),
    hr_departments(id, name),
    hr_job_titles:position_id(id, name),
    hr_contract_types:contract_type_id(id, name),
    manager:manager_id(id, full_name)
  `)
  .eq("workspace_id", wsId)
  .order("full_name");
```

#### 3.3 Hook `useHRDepartments` (reescrito)

```typescript
// Joins reais
const { data, error } = await supabase
  .from("hr_departments")
  .select(`
    *,
    head:head_id(id, full_name),
    parent:parent_department_id(id, name)
  `)
  .eq("workspace_id", wsId)
  .order("name");

// Headcount via query separada
const { data: counts } = await supabase
  .from("hr_employees")
  .select("department_id")
  .eq("workspace_id", wsId)
  .not("department_id", "is", null);
// Agregar counts no frontend
```

#### 3.4 Formulário de Funcionário

Substituir inputs de texto livre por `<Select>` com dados de:
- `useHRDepartments(true)` para department_id
- `useHRJobTitles(true)` para position_id
- `useHRContractTypes(true)` para contract_type_id
- `useHREmployees()` (filtrado) para manager_id

Mutations passam a escrever directamente em hr_employees — sem tocar hr_employee_profiles.

#### 3.5 Edge Function `hr-clock-qr`

Alterar de `hr_employee_profiles` para `hr_employees`:
```typescript
const { data: employee } = await supabase
  .from("hr_employees")
  .select("id, workspace_id, status")
  .eq("qr_code_token", qr_token)
  .maybeSingle();
```

---

### 4. Permissões por Perfil (P1)

| Área | employee | manager | hr_manager | recruiter | admin |
|------|----------|---------|------------|-----------|-------|
| Dados próprios | R/W | R/W | R/W | R | R/W |
| Equipa directa | — | R | R/W | — | R/W |
| Todos funcionários | — | — | R/W | — | R/W |
| Ausências equipa | — | Aprovar | R/W | — | R/W |
| Ponto equipa | — | R | R/W | — | R/W |
| Recrutamento | — | — | R | R/W | R/W |
| Configurações | — | — | R/W | — | R/W |

---

### 5. Critérios de Aceitação P0

1. `hr_employee_profiles` deixa de ser lida/escrita por qualquer hook ou página
2. Tabela de funcionários mostra departamento, cargo, manager e contrato como dados relacionais
3. Departamentos mostram responsável real, pai real e headcount
4. Formulário de edição usa selects relacionais
5. Clock-in por QR funciona via hr_employees
6. Trigger impede manager = self e ciclos em departamentos
7. Dados migrados de hr_employee_profiles para hr_employees sem perda

---

### 6. Riscos e Pontos a Validar

| Risco | Mitigação |
|-------|-----------|
| hr_employee_profiles tem dados que não existem em hr_employees | Migração SQL com COALESCE garante merge sem overwrite |
| Outros módulos (onboarding, check-ins, OKRs) já referenciam hr_employees.id | Confirmar — não há impacto porque a tabela mantém-se |
| FK head_id muda de workspace_members para hr_employees | Dados existentes em head_id precisam ser mapeados (member_id → employee_id via user_id) |
| hr_employee_profiles.member_id pode não ter hr_employees correspondente | Criar hr_employees em falta antes da migração ou ignorar (trigger de sync já cria) |

---

### 7. Ficheiros a Alterar (P0 completo)

| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Schema changes + data migration + triggers |
| `src/hooks/hr/useHREmployees.ts` | Reescrita completa — hr_employees como fonte única |
| `src/hooks/hr/useHRDepartments.ts` | Joins reais + headcount |
| `src/pages/dashboard/hr/HREmployeesPage.tsx` | Formulário relacional, remover sync |
| `src/pages/dashboard/hr/HREmployeeDetailPage.tsx` | Dados relacionais, remover texto livre |
| `src/pages/dashboard/hr/HRDepartmentsPage.tsx` | Mostrar head/parent/headcount reais |
| `supabase/functions/hr-clock-qr/index.ts` | Migrar de hr_employee_profiles para hr_employees |
| `supabase/functions/hr-employee-create/index.ts` | Adicionar contract_type_id |

