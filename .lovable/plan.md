

# Plano: Interface Attio/Basepoint -- View Selector + Sidebar Expandida + Table Footer

## Análise do Screenshot

A imagem mostra o Basepoint com funcionalidades que ainda faltam na implementação atual:

1. **View Selector Dropdown no header** -- dropdown "New Trial Workspaces ▾" com campo de pesquisa e lista de vistas guardadas, separado do sidebar
2. **Sidebar com navegação expandida** -- secções adicionais: Quick Actions, Notifications, Tasks, Notes, Emails, Calls, Reports, Automations (Sequences, Workflows)
3. **"+ Add calculation" no footer da tabela** -- placeholder por coluna no rodapé (não apenas contagem total)
4. **"+ New [Entity]" botão prominente** no canto superior direito com cor de destaque

## Estado Atual vs Melhorias

| Funcionalidade | Estado Atual | Melhoria |
|---|---|---|
| View selector no header | Não existe -- vistas apenas no sidebar | Dropdown com pesquisa + lista de vistas no header |
| Sidebar navegação | Apenas Records, Views, Favorites, Lists | Adicionar Quick Actions, Notifications, Tasks, Notes, Emails, Calls, Reports, Automations |
| Footer "+ Add calculation" | Apenas contagem total | Placeholder "+ Add calculation" por coluna visível |
| Botão New Entity | Existe mas sem destaque visual | Cor de destaque (primary) com ícone + |
| Automations sub-items | Não existe | Secção colapsável com Sequences e Workflows |

## Componentes a Criar/Editar

### 1. `DealViewSelectorDropdown.tsx` -- **NEW**
- Dropdown trigger no header mostrando nome da vista ativa (ex: "New Trial Workspaces ▾")
- Campo de pesquisa dentro do dropdown
- Lista de vistas com ícone/dot colorido, nome e botão de 3 pontos (opções)
- Opção "Create new view" no fundo
- Integra com `useSavedViews` e `activeViewId`

### 2. `DealsSidebar.tsx` -- **EDIT**
- Adicionar secções de navegação no topo (antes das Views):
  - Quick Actions, Notifications, Tasks, Notes, Emails, Calls, Reports
  - Automations (colapsável) com sub-items: Sequences, Workflows
- Links navegam para as rotas existentes do dashboard (ex: `/dashboard/tasks`, `/dashboard/notes`)
- Ícones Lucide para cada item

### 3. `OpportunityTableView.tsx` -- **EDIT**
- Substituir footer simples por footer com "+ Add calculation" placeholder por cada coluna visível
- Manter contagem de registos na primeira coluna do footer
- Cada placeholder "+ Add calculation" é clicável mas mostra tooltip "Em breve"

### 4. `OpportunitiesModule.tsx` -- **EDIT**
- Substituir título estático "Opportunities" pelo `DealViewSelectorDropdown` no header
- Manter "View settings" e "Import / Export" à direita do view selector
- Botão "+ New Deal" com estilo mais prominente

## Ficheiros

| Ficheiro | Ação | Descrição |
|---|---|---|
| `src/components/opportunities/DealViewSelectorDropdown.tsx` | **NEW** | Dropdown de seleção de vista com pesquisa |
| `src/components/opportunities/DealsSidebar.tsx` | **EDIT** | Navegação expandida com Quick Actions, Tasks, Notes, etc. |
| `src/components/opportunities/OpportunityTableView.tsx` | **EDIT** | Footer com "+ Add calculation" por coluna |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Integrar view selector dropdown no header |
| `src/i18n/locales/*/crm.json` | **EDIT** | ~10 novas keys |

## Detalhes Técnicos

### DealViewSelectorDropdown
```text
┌─────────────────────────────┐
│ 🔍 Search views...          │
├─────────────────────────────┤
│ ● New Trial Workspaces    ⋯ │  ← ativa (highlight)
│ ● Workspaces Overview     ⋯ │
│ ● PQL upsell opps         ⋯ │
│ ● Active Accounts         ⋯ │
│ ● Renewals this Quarter   ⋯ │
├─────────────────────────────┤
│ + Create new view            │
└─────────────────────────────┘
```
- Usa `DropdownMenu` ou `Popover` com `Command` (cmdk) para pesquisa
- Cada item mostra emoji/dot + nome + menu contextual (⋯)
- Trigger: `<Button variant="ghost">` com nome da vista + `ChevronDown`

### Sidebar Expandida
Novas secções no topo (links simples com ícones):
- `Bell` → Notifications
- `CheckSquare` → Tasks  
- `StickyNote` → Notes
- `Mail` → Emails
- `Phone` → Calls
- `BarChart3` → Reports
- `Zap` → Automations (colapsável)
  - `GitBranch` → Sequences
  - `Workflow` → Workflows

### Table Footer
```text
│ 25 count │ + Add calculation │ + Add calculation │ ... │
```
- Primeira célula: contagem de registos
- Restantes células: botão ghost "+ Add calculation" com tooltip

## i18n Keys Novas (~10)
```
quickActions, notifications, tasks, notes, emails, calls,
reports, automations, sequences, workflows
```
(Muitas já podem existir -- verificar antes de adicionar)

## Ordem de Implementação

1. `DealViewSelectorDropdown.tsx` -- novo componente
2. `DealsSidebar.tsx` -- navegação expandida
3. `OpportunityTableView.tsx` -- footer melhorado
4. `OpportunitiesModule.tsx` -- integrar view selector
5. i18n keys

