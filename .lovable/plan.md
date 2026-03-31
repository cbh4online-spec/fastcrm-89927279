

## Tabelas de Configuração HR — Departamentos, Cargos e Tipos de Contrato

### Diagnóstico

Actualmente, os campos **Cargo**, **Departamento** e **Tipo de Contrato** no perfil HR são texto livre ou valores hardcoded no frontend. Isto impede consistência, reutilização e gestão centralizada. É necessário criar tabelas de referência e uma página de configuração.

### Estrutura

**1. Migração SQL — 3 tabelas de referência**

| Tabela | Campos |
|--------|--------|
| `hr_departments` | id, workspace_id, name, description, is_active, created_at |
| `hr_job_titles` | id, workspace_id, name, department_id (FK opcional), is_active, created_at |
| `hr_contract_types` | id, workspace_id, name, description, is_active, created_at |

- RLS: membros do workspace podem ler; admin/owner podem gerir
- Seed de valores por defeito nos contract_types: Tempo inteiro, Part-time, Prestador, Estagiário

**2. Hooks CRUD**

| Ficheiro | Conteúdo |
|----------|----------|
| `src/hooks/hr/useHRDepartments.ts` | CRUD para `hr_departments` |
| `src/hooks/hr/useHRJobTitles.ts` | CRUD para `hr_job_titles` |
| `src/hooks/hr/useHRContractTypes.ts` | CRUD para `hr_contract_types` |

**3. Página de Configuração HR**

| Ficheiro | Conteúdo |
|----------|----------|
| `src/pages/dashboard/hr/HRSettingsPage.tsx` | Página com 3 tabs (Departamentos, Cargos, Contratos). Cada tab: tabela CRUD com inline add/edit/delete e toggle activo/inactivo |

**4. Rota no manifesto**

Adicionar em `routeManifest.ts`:
```
e("hr-settings", "Configurações RH", "/dashboard/hr/settings", Settings, "rh", { moduleSlug: "hr-management" })
```

Registar rota lazy em `routes.legacy.ts` ou onde as rotas HR estão definidas.

**5. Actualizar formulário do perfil HR**

Em `HREmployeesPage.tsx`, substituir os inputs de texto livre e selects hardcoded por selects populados a partir das tabelas de referência:
- **Departamento** → Select com dados de `hr_departments`
- **Cargo** → Select com dados de `hr_job_titles` (filtrado pelo departamento seleccionado, se aplicável)
- **Contrato** → Select com dados de `hr_contract_types`

### Critérios de aceitação

1. Página "Configurações RH" acessível no menu lateral com gestão de departamentos, cargos e contratos
2. Formulário de perfil HR usa selects populados a partir das tabelas
3. Valores activos/inactivos controlam visibilidade nos selects
4. CRUD completo com validação (nome obrigatório, sem duplicados por workspace)
5. RLS correcta — leitura para todos os membros, escrita apenas admin/owner

