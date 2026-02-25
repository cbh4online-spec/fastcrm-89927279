

# Plano: Melhorias na Deal Detail Page -- "Configure Record Page" Estilo Attio

## Analise do Screenshot

O screenshot mostra o modo **"Configure record page"** do Basepoint/Attio com funcionalidades que ainda faltam na implementação atual:

1. **Breadcrumb no header** -- `X → Deals → Configure record page` (indica modo de configuração da página)
2. **"+ Add tab"** -- botão no final da lista de tabs para adicionar novas tabs dinâmicas
3. **"+ Add widget (5/6)"** -- botão verde no canto superior direito dos Highlights para adicionar widgets com contador de slots usados
4. **Highlights como cards editáveis** -- cada card tem ícones de configuração (reorder, settings) no hover, com layout mais espaçado e visualmente distinto
5. **"Documents (PandaDoc)"** -- widget de integração com documentos ao lado do Deal value, com indicator verde de status
6. **Sidebar "Deal Info" com field chips** -- campos mostrados como chips inline com ícones (Deal name, Associated company, Deal value, Priority Level, Deal stage, Projected Close Date)
7. **Sidebar "Company Info" com navegação** -- campos tipo "Associated company > Domains", "Associated company > Categories", "Associated company > ICP" com formato de navegação por setas
8. **"+ Add section"** -- botão no fundo da sidebar para adicionar secções dinâmicas
9. **Tab dots coloridos** -- cada tab tem um dot colorido ao lado do nome (verde, roxo, azul, etc.)
10. **Header actions extras** -- ícones adicionais ao lado do "Compose email" (clipboard, share, expand, bookmark)

## Estado Atual vs Melhorias

| Funcionalidade | Estado Atual | Melhoria |
|---|---|---|
| "+ Add tab" | Não existe | Botão no final das tabs para adicionar tabs dinâmicas |
| "+ Add widget (X/Y)" | Não existe | Botão verde nos Highlights com contador de slots |
| Highlight cards editáveis | Estáticos | Icons de hover para reorder/settings em cada card |
| Documents widget | Não existe | Widget placeholder para documentos (PandaDoc) |
| Header ícones extra | Compose email + star + menu | Adicionar clipboard, share, expand |
| Tab colored dots | Sem dots | Dots coloridos por tab |
| Sidebar field chips view | Lista vertical InlineEditable | Vista alternativa com chips inline |
| Company Info navigation | Texto plano | Formato "Associated company > Domains" com setas |
| "+ Add section" sidebar | Não existe | Botão no fundo da sidebar |
| Breadcrumb "Configure record page" | Não existe | Modo de configuração de layout (simplificado) |

## Componentes a Editar/Criar

### 1. `OpportunityDetailPage.tsx` -- **EDIT**
- Adicionar **"+ Add tab"** como último item da TabsList (botão ghost com `Plus` icon)
- Adicionar **dots coloridos** antes do nome de cada tab
- Toast "Em breve" ao clicar no "+ Add tab"

### 2. `OpportunityHighlightsCards.tsx` -- **EDIT (major)**
- Adicionar botão **"+ Add widget (X/6)"** no canto superior direito da secção Highlights
- Cada card ganha ícones de hover: drag handle (GripVertical) + settings (Settings)
- Adicionar **4º card** placeholder "Documents" com badge verde de integração
- Layout mais espaçado com bordas subtis entre cards (como no screenshot)
- Cards envolvidos em contentor com label "Highlights" e ícone ✨

### 3. `OpportunityHeaderActions.tsx` -- **EDIT**
- Adicionar ícones extras ao lado do "Compose email": ClipboardCopy, Share2, Maximize2
- Cada ícone ghost com tooltip

### 4. `OpportunityDetailSidebar.tsx` -- **EDIT**
- Secção "Deal Info": vista alternativa com **field chips** (compactos, inline com ícones pequenos)
- Secção "Company Info": campos com formato **"Associated company > Domains"** usando `ChevronRight` como separador visual
- Adicionar **"+ Add section"** como botão no fundo do sidebar (abaixo de Lists/Intelligence)
- Toast "Em breve" para funcionalidades futuras

### 5. `src/i18n/locales/*/crm.json` -- **EDIT**
- ~10 novas keys para as funcionalidades adicionadas

## Detalhes Tcnicos

### "+ Add tab" na TabsList
Após o último `TabsTrigger`, adicionar:
```text
│ ... │ Calls 0 │ Insights │ [+ Add tab] │
```
- Botão `ghost` com `Plus` + texto
- `onClick` → toast "Em breve"

### Highlights com "+ Add widget"
```text
┌─ ✨ Highlights ────────────────────── [+ Add widget (4/6)] ─┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │Deal stage│ │Deal owner│ │Associated│ │Documents │       │
│ │Lead      │ │No owner  │ │No company│ │(PandaDoc)│ 🟢   │
│ │████░░░░░ │ │          │ │          │ │          │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│ ┌──────────────────────────────────────────────────┐       │
│ │Deal value                                        │       │
│ │No Deal value                                     │       │
│ └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Header Actions Extras
```text
[Compose email] [📋] [🔗] [⤢] [☆] [⋯]
```
- `ClipboardCopy` → copia título
- `Share2` → copia URL
- `Maximize2` → expande (fullscreen toggle)

### Sidebar Field Chips (Deal Info)
Vista compacta com chips inline:
```text
Deal Info
🔤 Deal name  🔗 Associated company
💰 Deal value  🔷 Priority Level  📊 Deal stage
📅 Projected Close Date
```
Cada chip é clicável e abre o editor inline

### Company Info com navegação
```text
Company Info
🔗 Associated company > Domains
○ Associated company > Categories
🎯 Associated company > ICP
```

### Tab Colored Dots
Mapeamento de cores:
- Overview: cinza
- Activity: amarelo
- Notes: azul
- Associated company: roxo
- Associated People: verde
- Tasks: laranja
- Calls: vermelho
- Insights: dourado

## Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `src/components/opportunities/OpportunityDetailPage.tsx` | **EDIT** | + Add tab, tab dots coloridos |
| `src/components/opportunities/detail/OpportunityHighlightsCards.tsx` | **EDIT** | + Add widget, hover icons, Documents card |
| `src/components/opportunities/detail/OpportunityHeaderActions.tsx` | **EDIT** | Icones extras (clipboard, share, expand) |
| `src/components/opportunities/detail/OpportunityDetailSidebar.tsx` | **EDIT** | Field chips, Company Info navigation, + Add section |
| `src/i18n/locales/pt/crm.json` | **EDIT** | ~10 novas keys |
| `src/i18n/locales/en/crm.json` | **EDIT** | ~10 novas keys |

## i18n Keys Novas (~10)
```
oppDetail_addTab, oppDetail_addWidget, oppDetail_widgetCount,
oppDetail_documents, oppDetail_addSection, oppDetail_configureRecord,
oppDetail_copyTitle, oppDetail_shareRecord, oppDetail_expandView,
oppDetail_companyDomains, oppDetail_companyCategories, oppDetail_companyICP
```

## Ordem de Implementacao

1. `OpportunityHighlightsCards.tsx` -- + Add widget, Documents card, hover icons
2. `OpportunityDetailPage.tsx` -- + Add tab, tab dots
3. `OpportunityHeaderActions.tsx` -- icones extras
4. `OpportunityDetailSidebar.tsx` -- field chips, company info nav, + Add section
5. i18n keys

