

# Melhorias ao Módulo de Deals -- Estilo Attio com Melhorias

## Referência Visual

A imagem mostra o Attio/Basepoint com:
- Sidebar com listas que têm **ícones emoji** (🎯 Inbound Leads, 🎊 Product Launch Campaign, ❤️ Event Invitees, etc.)
- Link **"All lists"** no fundo da secção Lists
- Barra de filtros com **pills visuais** ("Deal stage is ● Lead") e badge de contagem no "Advanced filter"
- **"Sorted by Created at"** indicador
- **"+ Add column"** no header da tabela
- **"+ Add calculation"** no footer de cada coluna
- **Contagem de registos** no rodapé ("5 count")
- Botão **"View settings"** e **"Import / Export"**

## Estado Atual vs Melhorias

| Funcionalidade | Estado Atual | Melhoria |
|---|---|---|
| Lists com ícones | Apenas dot de cor | Emoji customizável por lista |
| All lists link | Não existe | Link "All lists" no fundo |
| Filter pills | Dropdown de status simples | Pills visuais com condições ativas |
| Row count | Não existe | Footer com "X count" |
| Sorted by indicator | Não existe | Badge de ordenação ativa |
| Add column | Colunas fixas | Botão "+ Add column" (futuro) |
| Add calculation | Não existe | Botão "+ Add calculation" por coluna (futuro) |
| Import/Export | Não existe | Botões no header |
| View settings | Não existe | Dropdown com configurações da vista |

## Componentes a Criar/Editar

### 1. `DealsSidebar.tsx` -- EDIT
- Adicionar campo `icon` (emoji) às listas -- usar emoji do `SavedView.icon` ou fallback para dot colorido
- Adicionar link **"··· All lists"** no fundo da secção Lists, que navega para uma vista que mostra todas as listas
- Estilização mais próxima do Attio: padding, tamanho de fonte, espaçamento

### 2. `ActiveFilterPills.tsx` -- NEW
- Componente que renderiza as condições de filtro ativas como pills visuais
- Cada pill mostra: campo + operador + valor (ex: "Deal stage is ● Lead")
- Botão X para remover filtro individual
- Botão "+" para adicionar novo filtro
- Integra com o `useFilterEngine` existente

### 3. `OpportunityTableView.tsx` -- EDIT
- Adicionar **footer row** com contagem de registos ("X count") e placeholder "+ Add calculation" por coluna
- Adicionar **"+ Add column"** no final do header (placeholder visual, futura implementação)
- Melhorar espaçamento e tipografia para se aproximar do Attio

### 4. `OpportunitiesModule.tsx` -- EDIT
- Adicionar `ActiveFilterPills` entre a barra de filtros e o conteúdo principal
- Adicionar indicador **"Sorted by"** quando há ordenação ativa
- Adicionar botões **"View settings"** e **"Import / Export"** no header
- Mostrar nome da vista ativa no header (ex: "New inbound leads ▾")

### 5. `ViewSettingsDropdown.tsx` -- NEW
- Dropdown com opções: Rename, Duplicate, Set as default, Delete
- Configurações de colunas visíveis (toggle on/off)
- Ordem de colunas (drag-and-drop futuro)

### 6. `DealsImportExportMenu.tsx` -- NEW
- Dropdown com: Import CSV, Export CSV, Export Excel
- Reutiliza lógica de `papaparse` e `xlsx` já instalados no projeto

### 7. `useSavedViews` hook -- EDIT
- Suportar campo `icon` (emoji string) nas vistas guardadas
- Adicionar mutation para atualizar ícone

## Migração de Base de Dados

Adicionar coluna `icon` à tabela `saved_views`:

```sql
ALTER TABLE public.saved_views
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
```

Sem RLS changes -- a tabela já tem policies por workspace.

## Ficheiros

| Ficheiro | Ação | Descrição |
|---|---|---|
| `src/components/opportunities/DealsSidebar.tsx` | **EDIT** | Emoji icons nas listas, link "All lists" |
| `src/components/opportunities/ActiveFilterPills.tsx` | **NEW** | Pills visuais de filtros ativos |
| `src/components/opportunities/ViewSettingsDropdown.tsx` | **NEW** | Dropdown de configurações da vista |
| `src/components/opportunities/DealsImportExportMenu.tsx` | **NEW** | Menu Import/Export CSV/Excel |
| `src/components/opportunities/OpportunityTableView.tsx` | **EDIT** | Footer com counts, "+ Add column", espaçamento |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Filter pills, sorted indicator, view name header, import/export |
| `src/hooks/useSavedViews.ts` | **EDIT** | Suportar campo `icon` |
| DB migration | **NEW** | Coluna `icon` em `saved_views` |
| `src/i18n/locales/*/crm.json` | **EDIT** | ~12 novas keys |

## i18n Keys Novas (~12)

```
filterPillAdd, filterPillRemove, sortedBy,
viewSettings, importExport, importCSV, exportCSV, exportExcel,
tableRowCount, addColumn, addCalculation, viewSettingsRename
```

## Ordem de Implementação

1. Migração DB -- campo `icon` em `saved_views`
2. `useSavedViews` -- suportar `icon`
3. `DealsSidebar` -- emoji icons + "All lists"
4. `ActiveFilterPills` -- pills visuais
5. `ViewSettingsDropdown` -- configurações da vista
6. `DealsImportExportMenu` -- import/export
7. `OpportunityTableView` -- footer counts + add column
8. `OpportunitiesModule` -- integrar tudo
9. i18n keys

## Notas Técnicas

- O campo `icon` na DB é TEXT para guardar qualquer emoji (ex: "🎯", "🎊")
- As filter pills leem as `FilterCondition[]` da vista ativa e renderizam cada uma como chip removível
- O export CSV usa `papaparse` (já instalado) e o export Excel usa `xlsx` (já instalado)
- O "Sorted by" mostra o campo + direção ativa, com botão para limpar
- O "View settings" permite renomear a vista e toggle de colunas (a reordenação de colunas fica para iteração futura)
- O "+ Add column" e "+ Add calculation" são placeholders visuais nesta iteração, com tooltip "Em breve"

