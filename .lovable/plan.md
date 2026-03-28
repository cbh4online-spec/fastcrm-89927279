

## Ações em Massa + Vista Kanban para Leads

### 1. Ações em massa (Bulk Actions)

A tabela de leads (`SmartLeadsTable`) já tem seleção múltipla mas só oferece: Analisar AI, LinkedIn, Exportar e Eliminar. Vou substituir essa barra básica pelo componente `BulkActionsBar` já existente no sistema unificado, adicionando:

**Novo hook `useBulkUpdateLeads`** em `src/hooks/useLeads.ts`:
- Recebe array de IDs + campos a alterar (status, tags, assigned_to, lead_type, etc.)
- Executa update em batch via Supabase `.in('id', ids)`
- Invalida queries relevantes

**Integração na `SmartLeadsTable`** (linhas 438-446):
- Substituir a barra inline atual pela `BulkActionsBar` que já suporta:
  - **Adicionar tags** (popover com tags existentes + criar nova)
  - **Edição em massa** (dialog `BulkEditDialog` com campos selecionáveis)
  - **Exportar** e **Eliminar**
- Definir `editableFields` para leads: status, assigned_to, tags, lead_type, source, city, company_name
- Manter botões de Analisar AI e LinkedIn como ações extra na barra

### 2. Vista Kanban configurável

**Novo componente `LeadsKanbanView`** em `src/components/leads/`:
- Colunas agrupáveis por: **status** (default), **temperatura** ou **lead_type**
- Cada coluna mostra contagem e cards com: nome, avatar, tags, score
- **Drag-and-drop** nativo (HTML5) para mover leads entre colunas (atualiza o campo correspondente)
- Configuração do agrupamento via dropdown no header

**Nova tab na `SmartLeadsTable`**:
- Adicionar tab "Kanban" ao array `pageTabs` (já existe Leads, Duplicates, Smart Lists, Automations, Import)
- Renderizar `LeadsKanbanView` quando tab ativa = "kanban"
- Partilha os mesmos filtros e pesquisa da vista tabela

### Ficheiros a criar/alterar

| Ficheiro | Ação |
|---|---|
| `src/hooks/useLeads.ts` | Adicionar `useBulkUpdateLeads` |
| `src/components/leads/SmartLeadsTable.tsx` | Integrar `BulkActionsBar`, tab Kanban |
| `src/components/leads/LeadsKanbanView.tsx` | **Novo** — vista kanban com drag-and-drop |

Sem alterações de base de dados — usa os campos existentes (status, tags, assigned_to, ai_temperature, lead_type).

