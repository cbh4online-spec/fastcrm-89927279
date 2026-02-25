

# Plano: Refinamentos Finais Estilo Attio -- Quick Actions, Records Expandidos, Invite Members

## Análise do Screenshot vs Estado Atual

O screenshot mostra refinamentos que ainda faltam na implementação atual:

1. **"Quick actions" com atalho ⌘K** no topo da sidebar -- botão com indicadores de keyboard shortcut (⌘K, /)
2. **Records expandidos** -- além de Companies, People (Contacts), Deals e Invoices, faltam: **Users**, **Workspaces**, **Partners**
3. **"Invite team members"** no fundo da sidebar -- link fixo no bottom
4. **"+ Add column"** como último header da tabela -- botão visível no header, não apenas no footer
5. **Filter pills com dot colorido** nos valores (ex: "Subscription Status is `●` Active") -- refinamento visual
6. **"Sorted by X"** como pill na barra de filtros, com ícone de sort, em vez de badge separada

## Componentes a Editar

### 1. `DealsSidebar.tsx` -- EDIT
- Adicionar botão **"Quick actions"** no topo com indicadores de shortcut `⌘K` e `/`
- Expandir `RECORDS_LINKS` com **Users** (`Users` icon → `/dashboard`), **Workspaces** (`Building` → `/dashboard`), **Partners** (`Handshake` → `/dashboard`)
- Adicionar **"Invite team members"** como link fixo no bottom da sidebar (fora do ScrollArea), com ícone `UserPlus`
- O "Quick actions" abre um Command Palette (cmdk dialog) -- implementação básica com pesquisa de vistas e navegação

### 2. `OpportunityTableView.tsx` -- EDIT
- Adicionar **"+ Add column"** como último `TableHead` no header (botão ghost com tooltip "Em breve")
- Ajustar footer para alinhar melhor com as colunas reais da tabela

### 3. `ActiveFilterPills.tsx` -- EDIT
- Adicionar suporte para **dot colorido** antes dos valores de filtro (quando o campo é "status", "stage", etc.)
- Aceitar prop `sortField` e `sortDir` para renderizar "Sorted by X" como pill integrada (em vez de badge separada no `OpportunitiesModule`)

### 4. `OpportunitiesModule.tsx` -- EDIT
- Mover o indicador "Sorted by" para dentro do `ActiveFilterPills` como props
- Remover o Badge separado de sorted by

### 5. `CommandPalette.tsx` -- NEW (opcional, pode ser simplificado)
- Dialog com `Command` (cmdk) que abre com `⌘K`
- Pesquisa rápida de vistas, navegação para páginas (Companies, Contacts, etc.)
- Ações rápidas: "Create Deal", "Create Contact", etc.

## Ficheiros

| Ficheiro | Ação | Descrição |
|---|---|---|
| `src/components/opportunities/DealsSidebar.tsx` | **EDIT** | Quick actions, Records expandidos, Invite team members |
| `src/components/opportunities/OpportunityTableView.tsx` | **EDIT** | "+ Add column" no header |
| `src/components/opportunities/ActiveFilterPills.tsx` | **EDIT** | Dot colorido + "Sorted by" integrado |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Mover sorted by para ActiveFilterPills |
| `src/components/opportunities/CommandPalette.tsx` | **NEW** | Command palette com ⌘K |
| `src/i18n/locales/*/crm.json` | **EDIT** | ~6 novas keys |

## Detalhes Técnicos

### Quick Actions + Command Palette
```text
┌─────────────────────────────────┐
│ 🔍 Search or type a command...  │
├─────────────────────────────────┤
│ NAVIGATION                      │
│   Companies                     │
│   Contacts                      │
│   Deals                         │
│   Invoices                      │
├─────────────────────────────────┤
│ ACTIONS                         │
│   + Create Deal                 │
│   + Create Contact              │
│   + Create Company              │
├─────────────────────────────────┤
│ VIEWS                           │
│   🎯 Inbound Leads              │
│   🎊 Product Launch Campaign    │
└─────────────────────────────────┘
```
- Abre com `⌘K` ou clique no botão
- Usa `CommandDialog` do cmdk (já instalado)
- Registra `useEffect` com event listener de keyboard

### Records Expandidos
Adicionar ao array `RECORDS_LINKS`:
- `{ key: "sidebarUsers", icon: Users, href: "/dashboard" }`
- `{ key: "sidebarWorkspaces", icon: Building, href: "/dashboard" }`
- `{ key: "sidebarPartners", icon: Handshake, href: "/dashboard" }`

### Sidebar Bottom
Abaixo do `ScrollArea`, um div fixo com:
```text
┌─────────────────────────────┐
│ 👤 Invite team members      │
└─────────────────────────────┘
```

### Filter Pills Melhorados
- Quando o valor do filtro é um status/stage, mostrar um dot colorido antes do texto
- Aceitar `sortField?: string` e `sortDir?: "asc" | "desc"` como props
- Renderizar "Sorted by {field}" como primeiro pill (com ícone ArrowUpDown e botão X para limpar)

### "+ Add column" no Header
- Último `TableHead` com botão ghost `+ Add column`
- `onClick` mostra toast "Em breve" ou tooltip

## i18n Keys Novas (~6)
```
quickActions, inviteTeamMembers, sidebarUsers,
sidebarWorkspaces, sidebarPartners, commandPaletteSearch
```

## Ordem de Implementação

1. `CommandPalette.tsx` -- novo componente
2. `DealsSidebar.tsx` -- quick actions, records expandidos, invite link
3. `ActiveFilterPills.tsx` -- dots coloridos + sorted by integrado
4. `OpportunityTableView.tsx` -- "+ Add column" no header
5. `OpportunitiesModule.tsx` -- integrar sorted by nas pills
6. i18n keys

