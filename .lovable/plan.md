

# Batch 4: i18n Migration for CRM Pages

## Scope

Migrate all hardcoded Portuguese strings in 7 CRM components to use `useTranslation('crm')` with translation keys. Most keys already exist in `crm.json` across all 4 locales -- only ~15 new keys need to be added.

## Components to Migrate

### 1. `SmartLeadsTable.tsx` (928 lines) -- LARGEST

**Already has NO `useTranslation`**. All strings are hardcoded Portuguese.

Hardcoded strings to migrate (~60 instances):
- Column labels array `LEAD_COLUMNS` (lines 91-161): 40+ labels like "Lead", "Email", "Telefone", "Morada", etc. -- all have matching `col_*` keys in crm.json
- Filter groups `filterGroups` (lines 166-212): "Temperatura", "Quente", "Morno", "Frio", "Estado", "Novos", "Contactados", etc. -- matching `filter*` keys
- Page tabs `pageTabs` (lines 215-220): "Leads", "Listas Inteligentes", "Automações", "Importar" -- matching `tabLeads`, `tabSmartLists`, etc.
- Sort options `sortOptions` (lines 223-230): "Mais recentes", "Mais antigos", etc. -- matching `sortNewest`, `sortOldest`, etc.
- Toast messages (lines 448-531): "lead(s) eliminados", "Erro ao eliminar", "Lead analisado", etc. -- matching keys exist
- PageHeader (lines 551-570): "Leads", "Importar", "Novo Lead"
- Toolbar (line 575): "Pesquisar leads..."
- Empty states (lines 698-707): "Ainda não há leads", "Quando entrarem leads..."
- Bulk actions bar (lines 640-654): "selecionado(s)", "Analisar com IA", "Exportar", "Eliminar"
- Smart lists/import WIP (lines 621-635): "Listas Inteligentes", "Funcionalidade em desenvolvimento"
- Dropdown actions (lines 798-814): "Enviar mensagem", "Criar oportunidade", "Ativar automação", "Arquivar"
- Pagination (lines 829-846): "Mostrar", "por página", "leads no total", "Página X de Y"
- Delete dialog (lines 906-924): "Eliminar X lead(s)?", "Esta ação não pode ser desfeita...", "Cancelar", "A eliminar..."
- Refresh button (line 608): "Atualizar"

**Challenge**: Column labels, filter groups, sort options, and page tabs are defined as **static const arrays** outside the component. They must be moved inside the component or converted to factory functions that accept `t`.

### 2. `AttioContactsTable.tsx` (525 lines)

**No `useTranslation`**. All hardcoded Portuguese.

- Column configs `CONTACT_COLUMNS` (lines 40-61): "Contacto", "Nº Cliente", "Email", etc.
- Sort options (lines 63-73): "Mais recentes", "Nome (A-Z)", "Quentes primeiro", etc.
- Filter fields (lines 75-82): "Empresa", "Origem", "Estado", etc.
- Bulk edit fields (lines 84-109): "Nome", "Email", "Telefone", "Origem" + option labels
- Header (line 251): "Contactos"
- Tooltip (line 260): "Base de dados de contactos..."
- Buttons (line 272): "Novo contacto"
- Import/Export dropdown (lines 296-308): "Import/Export", "Importar CSV", "Exportar CSV"
- Table header (line 354): "Contacto"
- Empty state (lines 384-389): "Ainda não há contactos", "Quando entrarem contactos..."
- Dropdown actions (lines 466-471): "Enviar mensagem", "Criar oportunidade", etc.
- Pagination (lines 494-497): "por página", "contactos"
- Toast messages (lines 212-221, 239): "Contacto analisado", "Erro ao analisar", "contactos atualizados", "Exportação concluída"

### 3. `SmartCompaniesTable.tsx` (587 lines)

**No `useTranslation`**. All hardcoded Portuguese.

- Column configs `COMPANY_COLUMNS` (lines 32-64): "Empresa", "Indústria", etc.
- Filter groups (lines 68-125): "Temperatura", "Estado", "Dimensão", "Indústria", "Atividade"
- Page tabs (lines 128-133): "Empresas", "Listas Inteligentes", "Ações em Massa", "Importar"
- Sort options (lines 136-143): "Nome (A-Z)", "Mais recentes", etc.
- PageHeader (lines 301-320): "Empresas", "Importar", "Nova Empresa"
- Toolbar (line 325): "Pesquisar empresas..."
- Bulk actions (lines 389-401): "selecionada(s)", "Analisar IA", "Analisar LinkedIn", "Exportar", "Eliminar"
- Empty state (lines 463-470): "Ainda não há empresas", etc.
- Pagination (lines 496-511): "Mostrar", "por página", "empresa(s) no total", "Página X de Y"
- Delete dialog (lines 569-581): "Eliminar X empresa(s)?", "Cancelar", "Eliminar"
- Toast messages (lines 176, 238-281): "Nenhuma empresa selecionada...", "Empresa analisada", etc.
- Refresh button (line 357): "Atualizar"
- SmartListsPanel field names (lines 370-381): "Nome", "Email", "Indústria", etc.

### 4. `SmartCompanyRow.tsx` (541 lines)

**No `useTranslation`**. All hardcoded Portuguese.

- Temperature labels (lines 54-58): "Frio", "Morno", "Quente"
- Company type labels (lines 60-67): "Prospect", "Cliente", "Parceiro", "Concorrente", "Fornecedor", "Desconhecido"
- Next action labels (lines 88-97): "Responder manualmente", "Enviar template", etc.
- SLA format (lines 121): "Agora"
- Insight tooltip (line 447): "Resumo rápido para decidir:"
- Action tooltips (line 500): "Analisar com IA"
- Dropdown actions (lines 518-534): "Enviar mensagem", "Criar oportunidade", etc.

### 5. `OpportunityKanbanColumn.tsx` (265 lines)

**No `useTranslation`**. Hardcoded Portuguese.

- Tooltip (line 154): "Adicionar oportunidade"
- "Probabilidade" (line 163)
- "Valor Total" (line 183)
- "Ponderado" (line 191)
- "Média: X dias" (line 206)
- "Score:" (line 211)
- Empty state (lines 248-258): "Arraste oportunidades para aqui", "Novo Negócio"

### 6. `OpportunityCard.tsx` (153 lines)

**No `useTranslation`**. Hardcoded Portuguese.

- Temperature labels (lines 41-47): "Quente", "Morno", "Frio"
- "Próxima Ação:" tooltip (line 146)

### 7. `OpportunityDetailPage.tsx` (275 lines)

**No `useTranslation`**. Hardcoded Portuguese.

- Toast messages (lines 70-73): "Avançado para:", "Erro ao avançar estágio"
- Activity format (line 80): "Atividade"
- Not found (lines 133-136): "Oportunidade não encontrada", "Voltar às oportunidades"
- Header (line 154): "Detalhes da Oportunidade"
- Tabs (lines 178-184): "Visão Geral", "Insights IA", "Tarefas", "Notas"
- Placeholder texts (lines 232, 238): "Gestão de tarefas em breve...", "Notas em breve..."
- Action toast (line 219): "Ação:"

## New i18n Keys Needed (~30)

These keys do NOT exist yet in crm.json and must be added to all 4 locales:

```
// Company types
companyTypeProspect, companyTypeClient, companyTypePartner,
companyTypeCompetitor, companyTypeVendor, companyTypeUnknown,

// Next actions (company-level)
actionScheduleMeeting, actionResearch,

// Kanban column
kanbanAddOpportunity, kanbanProbability, kanbanTotalValue,
kanbanWeighted, kanbanAvgDays, kanbanDragHere, kanbanNewDeal,

// Opportunity detail
oppDetailTitle, oppDetailNotFound, oppDetailBackToList,
oppDetailTabOverview, oppDetailTabInsights, oppDetailTabTasks, oppDetailTabNotes,
oppDetailAdvancedTo, oppDetailAdvanceError,
oppDetailTasksComingSoon, oppDetailNotesComingSoon,
oppDetailActivity, oppDetailAction,

// Insight tooltip
insightQuickSummary,

// Bulk edit labels for contacts
bulkEditClientStatus
```

## Implementation Order

1. Add ~30 new keys to all 4 locale files (`pt/crm.json`, `en/crm.json`, `es/crm.json`, `fr/crm.json`)
2. Migrate `OpportunityCard.tsx` (smallest, 153 lines)
3. Migrate `OpportunityKanbanColumn.tsx` (265 lines)
4. Migrate `OpportunityDetailPage.tsx` (275 lines)
5. Migrate `SmartCompanyRow.tsx` (541 lines)
6. Migrate `AttioContactsTable.tsx` (525 lines)
7. Migrate `SmartCompaniesTable.tsx` (587 lines)
8. Migrate `SmartLeadsTable.tsx` (928 lines, largest)

## Technical Approach

For components where static const arrays use hardcoded labels (column configs, filter groups, sort options, page tabs), the approach will be:

- **Move arrays inside the component** as `useMemo` hooks that depend on `t`
- OR use a **factory function pattern**: `const getColumns = (t: TFunction) => [...]`
- All `toast.success/error/info` calls will use `t()` keys
- All inline strings in JSX will be replaced with `t()` calls

## Risk Mitigation

- The crm.json files already have ~520 keys each, covering most strings. Only ~30 new keys are needed.
- `OpportunitiesModule.tsx`, `OpportunityKPICards.tsx`, and `PipelineSummaryBar.tsx` are already fully migrated -- they serve as patterns to follow.
- No structural changes to components beyond adding `useTranslation` and wrapping strings.

