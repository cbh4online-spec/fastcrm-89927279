

## Ações em massa com tags para Contatos e Empresas

### Situação atual

| Componente | BulkActionsBar | Tags no popover | Bulk Edit | bulkUpdate hook |
|---|---|---|---|---|
| **Leads** | ✅ | ✅ (tags dos leads + workspace_tags) | ✅ | ✅ `useBulkUpdateLeads` |
| **Contatos** | ✅ | ❌ (não passa `availableTags`) | ✅ | ✅ `bulkUpdateContacts` (já no hook) |
| **Empresas** | ❌ (barra inline básica) | ❌ | ❌ | ❌ |

### Alterações

#### 1. Contatos — `AttioContactsTable.tsx`
- Extrair todas as tags dos contatos + `useWorkspaceTags` e passar como `availableTags` ao `BulkActionsBar` já existente
- Sincronizar tags adicionadas ao `workspace_tags` via `useSyncLeadTagsToWorkspace`

#### 2. Empresas — `SmartCompaniesTable.tsx` + `useCompanies.ts`

**Hook** (`useCompanies.ts`):
- Adicionar `addTagsToCompanies` e `bulkUpdateCompanies` mutations (padrão idêntico ao de contatos)

**Tabela** (`SmartCompaniesTable.tsx`):
- Substituir a barra inline (linhas 273-281) pelo `BulkActionsBar`
- Definir `companyBulkEditFields`: industry, source, size, tags
- Calcular `availableTags` a partir dos dados + `useWorkspaceTags`
- Manter botões extra de AI, Revenue Intelligence e LinkedIn como estão

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/contacts/AttioContactsTable.tsx` | Adicionar `availableTags` e sync ao `BulkActionsBar` |
| `src/components/companies/SmartCompaniesTable.tsx` | Substituir barra básica por `BulkActionsBar` com tags e bulk edit |
| `src/hooks/useCompanies.ts` | Adicionar `addTagsToCompanies` e `bulkUpdateCompanies` |

Sem alterações de base de dados.

