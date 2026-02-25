

# Redesign da Página de Detalhe de Oportunidade -- Estilo Attio com Melhorias

## Referência Visual

A imagem mostra o layout de detalhe de deal do Attio/Basepoint com:
- Header com navegação entre registos ("1 of 5 in Deal stage → Lead")
- Tabs horizontais: Overview, Activity, Notes, Associated company, Associated People, Tasks, Calls, Workspace
- Secção de **Highlights** com cards inline (Deal stage, Deal owner, Associated company, Deal value)
- Timeline de **Activity** com avatares e datas
- **Sidebar direita** com Details e Comments em tabs, contendo secções colapsáveis: Communication, Deal Info (campos editáveis inline), Company Info, Lists

## Estado Atual

A página `OpportunityDetailPage.tsx` tem:
- Header simples com botão voltar + título
- Tabs: Overview, Insights, Tasks (coming soon), Notes (coming soon)
- Overview: Stepper de estágios → Grid de detalhes estática → Timeline de atividade
- Sidebar: Intelligence panel, Associações (lead/contacto/empresa), Comissão
- **Problemas**: detalhes não são editáveis inline na tab overview, sem highlights cards, sem navegação entre deals, sem contagem nas tabs, sem secção de comunicação

## Melhorias Planeadas (vs Attio)

1. **Record navigation** -- navegar entre oportunidades do mesmo estágio com "X of Y"
2. **Highlights cards** -- cards visuais de destaque com stage (com cor), owner, empresa, valor
3. **Tabs com contadores** -- Notes (3), Tasks (5), Associated People (2), Calls (0)
4. **Sidebar reestruturada** -- tabs Details/Comments, secções colapsáveis com campos editáveis inline
5. **Communication section** na sidebar -- última comunicação com tempo relativo
6. **Deal Info section** colapsável -- todos os campos editáveis inline (valor, prioridade, estágio, data fecho, probabilidade)
7. **Company Info section** colapsável -- domínios, categorias, ICP
8. **Notes tab funcional** -- lista de notas com criação inline
9. **Tasks tab funcional** -- lista de tarefas associadas com criação rápida
10. **Copy URL / Copy ID / Add to favorites** -- dropdown menu no header

## Arquitetura de Componentes

```text
OpportunityDetailPage (redesenhado)
├── Header
│   ├── Record Navigation ("1 of 5 in Qualificação")
│   ├── Title + Star (favorite)
│   └── Actions (Compose email, Configure, ...)
├── Main Content Area
│   ├── Tabs (Overview | Activity | Notes | People | Tasks | Calls)
│   │   
│   │   Tab: Overview
│   │   ├── HighlightsCards (stage, owner, company, value)
│   │   └── ActivityTimeline (existente, melhorado)
│   │   
│   │   Tab: Activity (timeline completa)
│   │   Tab: Notes (CRUD de notas)
│   │   Tab: Tasks (lista + criação)
│   │   Tab: Associated People (contactos)
│   │   Tab: Calls (recordings/transcripts)
│   │   
│   └── Sidebar Direita (fixa)
│       ├── Sub-tabs: Details | Comments
│       ├── Communication (último contacto)
│       ├── Deal Info (campos editáveis inline colapsáveis)
│       ├── Company Info (colapsável)
│       └── AI Intelligence (colapsável, existente)
```

## Componentes Novos

### 1. `OpportunityHighlightsCards.tsx`
Cards inline horizontais mostrando métricas-chave com cor e ícones:
- **Deal Stage**: nome + barra de cor do estágio
- **Deal Owner**: avatar + nome
- **Associated Company**: logo + nome
- **Deal Value**: valor formatado com moeda

Cada card é clicável para edição rápida (popover com select/input).

### 2. `OpportunityRecordNav.tsx`
Navegação entre registos do mesmo estágio:
- "← 3 of 12 in Qualificação →"
- Busca oportunidades do mesmo `stage_id`, ordena por `created_at`
- Botões prev/next navegam entre IDs

### 3. `OpportunityDetailSidebar.tsx`
Sidebar completa estilo Attio com:
- Tabs internos: Details | Comments
- **Communication**: última atividade com ícone + tempo relativo ("About 2 months ago")
- **Deal Info**: campos editáveis inline usando `InlineEditableField` (título, valor, prioridade, estágio, data fecho, probabilidade, moeda)
- **Company Info**: domínios, categorias -- com "Show all values" expandível
- **AI Intelligence**: panel existente integrado como secção colapsável
- Cada secção com `Collapsible` + chevron

### 4. `OpportunityNotesTab.tsx`
Lista de notas com:
- Criação inline (textarea + guardar)
- Lista cronológica de notas existentes
- Edição/eliminação

### 5. `OpportunityTasksTab.tsx`
Lista de tarefas associadas à oportunidade:
- Usa hook `useTasks` existente com filtro `related_type: "opportunity"`
- Criação rápida com título + data
- Toggle de conclusão
- Contagem na tab

### 6. `OpportunityHeaderActions.tsx`
Dropdown menu com:
- Copy page URL
- Copy record ID
- Add to favorites (toggle)
- Delete record

## Ficheiros

| Ficheiro | Ação | Descrição |
|---|---|---|
| `src/components/opportunities/detail/OpportunityHighlightsCards.tsx` | **NEW** | Cards de destaque (stage, owner, company, value) |
| `src/components/opportunities/detail/OpportunityRecordNav.tsx` | **NEW** | Navegação entre registos do mesmo estágio |
| `src/components/opportunities/detail/OpportunityDetailSidebar.tsx` | **NEW** | Sidebar reestruturada estilo Attio |
| `src/components/opportunities/detail/OpportunityNotesTab.tsx` | **NEW** | Tab de notas funcional |
| `src/components/opportunities/detail/OpportunityTasksTab.tsx` | **NEW** | Tab de tarefas funcional |
| `src/components/opportunities/detail/OpportunityHeaderActions.tsx` | **NEW** | Menu de ações do header |
| `src/components/opportunities/detail/OpportunityCommunicationSection.tsx` | **NEW** | Secção de comunicação na sidebar |
| `src/components/opportunities/OpportunityDetailPage.tsx` | **EDIT** | Reestruturar layout completo |
| `src/i18n/locales/pt/crm.json` | **EDIT** | +20 keys |
| `src/i18n/locales/en/crm.json` | **EDIT** | +20 keys |
| `src/i18n/locales/es/crm.json` | **EDIT** | +20 keys |
| `src/i18n/locales/fr/crm.json` | **EDIT** | +20 keys |

## Base de Dados

Sem alterações de schema necessárias. As tabelas `opportunities`, `activities`, `tasks`, e `notes` já existem. Os campos `notes` na opportunity já suportam texto. As tasks já têm `related_type`/`related_id`.

## i18n Keys (~20 novas)

```
oppDetail_highlights, oppDetail_dealStage, oppDetail_dealOwner,
oppDetail_dealValue, oppDetail_associatedCompany,
oppDetail_recordNav, oppDetail_ofRecords,
oppDetail_communication, oppDetail_lastContact,
oppDetail_dealInfo, oppDetail_companyInfo,
oppDetail_showAllValues, oppDetail_hideValues,
oppDetail_copyUrl, oppDetail_copyId, oppDetail_addFavorite,
oppDetail_removeFavorite, oppDetail_configureLayout,
oppDetail_comments, oppDetail_details,
oppDetail_noNotes, oppDetail_addNote
```

## Ordem de Implementação

1. `OpportunityHighlightsCards` -- cards visuais de destaque
2. `OpportunityRecordNav` -- navegação entre registos
3. `OpportunityDetailSidebar` -- sidebar completa com secções colapsáveis
4. `OpportunityCommunicationSection` -- última comunicação
5. `OpportunityNotesTab` -- notas funcionais
6. `OpportunityTasksTab` -- tarefas funcionais
7. `OpportunityHeaderActions` -- dropdown de ações
8. Reestruturar `OpportunityDetailPage` com o novo layout
9. Adicionar i18n keys

## Notas Técnicas

- Os Highlights Cards reutilizam `InlineEditableField` e `InlineEntitySelect` existentes para edição inline via popover
- A navegação entre registos usa uma query separada para buscar IDs do mesmo estágio, sem carregar dados completos
- A sidebar usa `Collapsible` do Radix para secções expansíveis, com estado persistido em `localStorage`
- O tab de Tasks reutiliza o hook `useTasks` existente, filtrando por `related_type: "opportunity"` e `related_id: opportunityId`
- A secção Communication busca a última atividade do tipo `call`/`email`/`meeting` e mostra tempo relativo com `formatDistanceToNow`
- O layout muda de `flex-col-reverse lg:flex-row` para `flex lg:flex-row` com sidebar fixa à direita com `sticky top`

