

# Plano: Deal Detail Page Estilo Attio -- Layout Completo com Melhorias

## Referência Visual (Screenshot)

O screenshot mostra a página de detalhe de um Deal no Attio/Basepoint com:

1. **Header com título "metainnovations.net <> New Business"** + estrela de favorito + botão "Compose email"
2. **Barra superior com "X" (fechar) + navegação entre registos** ("1 of 5 in Deal stage → Lead")
3. **Tabs horizontais** no conteúdo principal: Overview, Activity, Notes (0), Associated company (1), Associated People (1), Tasks (0), Calls (0), Workspace (0) -- cada tab com badge de contagem
4. **Secção "Highlights"** com 3 cards: Deal stage (Lead, com barra de progresso), Deal owner (avatar), Associated company (avatar)
5. **Secção "Deal value"** abaixo dos highlights com "No Deal value"
6. **Secção "Activity >"** com timeline compacta mostrando quem mudou atributos e quando
7. **Sidebar direita** com tabs Details/Comments e secções colapsáveis:
   - **Communication**: associação + "When" + "About 2 years ago"
   - **Deal Info**: Deal name, Associated company, Deal value, Priority Level, Deal stage (com dot colorido), Projected Close Date + "Show all values"
   - **Company Info**: Domains (link), Categories, ICP
   - **Lists**: "This record has not..." + "Add to list"

## Estado Atual vs Melhorias Necessárias

| Funcionalidade | Estado Atual | Melhoria |
|---|---|---|
| Header com close (X) + nav | Botão back + nav básica | Close (X) + nav com setas + breadcrumb "Deal stage → Lead" |
| Favoritar deal | Não existe | Estrela de favorito no header |
| "Compose email" botão | Não existe | Botão no header para compor email |
| Tabs com contagens | Contagens parciais | Todas as tabs com badges de contagem |
| Tabs adicionais | Overview, Activity, Notes, Tasks, Insights | Adicionar: Associated Company, Associated People, Calls, Workspace |
| Highlights estilo Attio | Cards com ícones | Cards mais limpos com barra de progresso no stage + avatares |
| "Show all values" link | Todos os campos visíveis | Campos colapsáveis com "Show all values >" |
| "Add to list" na sidebar | Não existe | Secção "Lists" com opção de adicionar a smart lists |
| Activity timeline compacta | Timeline com cards pesados | Timeline inline sem cards, estilo "user changed X attributes" |
| Priority Level field | Não existe | Campo editável na sidebar |

## Componentes a Criar/Editar

### 1. `OpportunityDetailPage.tsx` -- **EDIT (major)**
- Substituir header com botão back por header Attio-style:
  - Botão "X" para fechar (navega para lista)
  - Setas ← → para navegação entre registos (reutilizar `OpportunityRecordNav`)
  - Breadcrumb "1 of 5 in Deal stage → Lead"
  - Título com estrela de favorito
  - Botões de ação à direita: "Compose email", ícones de ação, menu "..."
- Expandir tabs para incluir: Associated Company, Associated People, Calls
- Adicionar badge de contagem em todas as tabs

### 2. `OpportunityHighlightsCards.tsx` -- **EDIT**
- Redesign para layout 3-colunas sem borda (mais limpo, estilo Attio)
- Deal stage com barra de progresso colorida
- Deal owner com avatar grande
- Associated company com avatar/logo
- Abaixo: linha separada "Deal value" com texto cinza se vazio

### 3. `OpportunityDetailSidebar.tsx` -- **EDIT**
- Adicionar "Show all values >" link colapsável em cada secção
- Adicionar campo **Priority Level** (select: Low, Medium, High, Critical)
- Adicionar campo **Projected Close Date** 
- Adicionar secção **"Lists"** no fundo com "Add to list" para smart lists
- Melhorar labels com ícones inline (estilo Attio)

### 4. `OpportunityActivityTimeline.tsx` -- **EDIT**
- Simplificar para timeline compacta sem Card wrapper
- Cada entry: avatar + "User changed X attributes" + timestamp
- Link "View all >" no fundo

### 5. `OpportunityHeaderActions.tsx` -- **EDIT**
- Adicionar botão "Compose email" (abre mailto ou modal futuro)
- Adicionar botão estrela favoritar
- Adicionar ícones de ação rápida (link, expand, etc.)

### 6. `OpportunityAssociatedTab.tsx` -- **NEW**
- Tab genérica para "Associated Company" e "Associated People"
- Mostra entidades associadas com links, avatares e opção de adicionar novas

### 7. `OpportunityCallsTab.tsx` -- **NEW**
- Tab para chamadas associadas ao deal
- Lista de chamadas com data, duração, participantes
- Botão "+ Log a call"

## Ficheiros

| Ficheiro | Ação | Descrição |
|---|---|---|
| `src/components/opportunities/OpportunityDetailPage.tsx` | **EDIT** | Header Attio-style, tabs expandidas com contagens |
| `src/components/opportunities/detail/OpportunityHighlightsCards.tsx` | **EDIT** | Layout 3 colunas + Deal value separado |
| `src/components/opportunities/detail/OpportunityDetailSidebar.tsx` | **EDIT** | Show all values, Priority, Lists section |
| `src/components/opportunities/detail/OpportunityActivityTimeline.tsx` | **EDIT** | Timeline compacta sem Card wrapper |
| `src/components/opportunities/detail/OpportunityHeaderActions.tsx` | **EDIT** | Compose email, favorito, ações rápidas |
| `src/components/opportunities/detail/OpportunityAssociatedTab.tsx` | **NEW** | Tab de entidades associadas |
| `src/components/opportunities/detail/OpportunityCallsTab.tsx` | **NEW** | Tab de chamadas |
| `src/i18n/locales/*/crm.json` | **EDIT** | ~15 novas keys |

## Detalhes Técnicos

### Header Layout
```text
┌────────────────────────────────────────────────────────────────────┐
│ [X]  [←] [→]   1 of 5 in Deal stage → Lead                       │
├────────────────────────────────────────────────────────────────────┤
│ 📧 metainnovations.net <> New Business ☆    [Compose email] [⋯]  │
├────────────────────────────────────────────────────────────────────┤
│ Overview │ Activity │ Notes 0 │ Assoc. Company 1 │ People 1 │ ... │
└────────────────────────────────────────────────────────────────────┘
```

### Highlights Cards (sem borda, inline)
```text
┌──────────────┬──────────────┬──────────────────┐
│ Deal stage   │ Deal owner   │ Associated       │
│ Lead         │ 🟢 Zev L.   │ 🔵 MetalInnov.  │
│ ████░░░░░░░  │              │                  │
├──────────────┴──────────────┴──────────────────┤
│ Deal value   │ (vazio)      │                  │
│ No Deal value│              │                  │
└──────────────┴──────────────┴──────────────────┘
```

### Sidebar "Show all values"
- Cada secção (Deal Info, Company Info) mostra 4-5 campos por defeito
- Link "Show all values >" expande para mostrar todos os campos
- State local com `useState` por secção

### Secção "Lists" na Sidebar
```text
┌─────────────────────────────┐
│ ∨ Lists                     │
│   This record has not been  │
│   added to any lists        │
│   [+ Add to list]           │
└─────────────────────────────┘
```
- Dropdown para selecionar smart lists existentes (do `useSavedViews`)
- Associação guardada localmente (futura persistência em DB)

### Priority Level Field
- Novo campo `priority_level` no tipo `Opportunity`
- Se não existir na DB, usar campo virtual (localStorage) ou adicionar via migration
- Select options: Low, Medium, High, Critical

## Migração de Base de Dados

```sql
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT NULL;
```

## i18n Keys Novas (~15)
```
oppDetail_composeEmail, oppDetail_favorite, oppDetail_unfavorite,
oppDetail_associatedCompany, oppDetail_associatedPeople,
oppDetail_calls, oppDetail_workspace, oppDetail_showAllValues,
oppDetail_hideValues, oppDetail_priorityLevel, oppDetail_projectedClose,
oppDetail_lists, oppDetail_addToList, oppDetail_noLists,
oppDetail_changedAttributes, oppDetail_viewAll
```

## Ordem de Implementação

1. Migração DB -- campo `priority_level`
2. `OpportunityHeaderActions.tsx` -- compose email, favorito, ações
3. `OpportunityDetailPage.tsx` -- header Attio, tabs expandidas
4. `OpportunityHighlightsCards.tsx` -- redesign 3 colunas
5. `OpportunityDetailSidebar.tsx` -- show all values, priority, lists
6. `OpportunityActivityTimeline.tsx` -- timeline compacta
7. `OpportunityAssociatedTab.tsx` -- nova tab
8. `OpportunityCallsTab.tsx` -- nova tab
9. i18n keys

