

## Configuração de Legislação Laboral por País

### Contexto
O sistema HR tem valores hardcoded (ex: 40h semanais, feriados PT) sem uma fonte centralizada de regras legais por país. Precisamos de um local de configuração que defina as regras laborais do país seleccionado e que os módulos HR consumam automaticamente.

### Solução

**Nova tab "Legislação" na página HRSettingsPage** + tabela `hr_country_labor_rules` para armazenar as regras por país, pré-populada com Portugal.

### Estrutura de dados — Portugal (seed inicial)

| Regra | Valor |
|---|---|
| País | PT — Portugal |
| Horas semanais legais | 40 |
| Horas diárias máximas | 8 |
| Horas extra máximas/ano | 150 (trabalhador) / 175 (empresa) |
| Multiplicador hora extra (dia útil) | 1.25 (1ª hora), 1.375 (seguintes) |
| Multiplicador hora extra (feriado/descanso) | 1.50 |
| Dias férias anuais | 22 |
| Período experimental (dias) | 90 (geral), 180 (cargos complexos), 240 (dirigentes) |
| Salário mínimo nacional | 870€ (2025) |
| Subsídio alimentação (isento) | 10.20€/dia (cartão) |
| Descanso semanal obrigatório | 1 dia (domingo) |
| Intervalo mínimo entre jornadas | 11 horas |
| Pausa obrigatória | após 5h consecutivas |
| Feriados obrigatórios | 13 |

### Implementação

**1. Migration SQL** — Criar tabela `hr_country_labor_rules`:
- `id`, `workspace_id`, `country_code` (ex: "PT"), `country_name`, `is_active` (boolean — o país seleccionado)
- `rules` (JSONB) — contém todas as regras estruturadas
- `created_at`, `updated_at`
- Unique constraint em `(workspace_id, country_code)`
- RLS: workspace members podem ler; admins podem editar
- Seed com regras de Portugal

**2. Hook `useHRLaborRules`** (`src/hooks/hr/useHRLaborRules.ts`):
- `useActiveLaborRules()` — retorna as regras do país activo do workspace
- `useAllLaborRules()` — lista todos os países configurados
- `useUpdateLaborRules()` — mutation para editar regras
- `useSetActiveCountry()` — activar/desactivar país

**3. Nova tab "Legislação" em `HRSettingsPage.tsx`**:
- Selector de país activo (inicialmente só PT)
- Formulário organizado por secções: Horário, Horas Extra, Férias, Remuneração, Descanso
- Cada campo editável com o valor legal pré-preenchido
- Badge "Portugal" activo

**4. Integração nos módulos existentes** (segunda fase, não neste PR):
- `HRTimeTrackingPage` → alertar se sessão excede horas diárias máximas
- `HRAbsencesPage` → usar dias de férias do país activo como saldo base
- `hr-clock-action` → calcular overtime com multiplicadores correctos

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| Nova migration SQL | Tabela `hr_country_labor_rules` + seed PT |
| `src/hooks/hr/useHRLaborRules.ts` | Novo hook CRUD |
| `src/pages/dashboard/hr/HRSettingsPage.tsx` | Adicionar tab "Legislação" |

### Critérios de aceitação
1. Tab "Legislação" visível em Configurações RH
2. Portugal pré-carregado com todas as regras laborais correctas
3. Regras editáveis por workspace
4. Hook disponível para outros módulos consumirem as regras activas

