

# Correcções P0 — Estado Actual e Plano

## Diagnóstico

Duas das três correcções P0 já foram implementadas na sessão anterior:
- **@faker-js/faker** → já está em `devDependencies` (linha 263 do package.json)
- **import \* as LucideIcons** → já corrigido nos 3 ficheiros (PublicBioPage, ProductCard, POSProductSelector)

Resta apenas a **virtualização das tabelas core**.

## Análise das Tabelas

As 3 tabelas usam **paginação client-side** com pageSize de 10-100 rows:
- `SmartContactsTable` (881 linhas) — renderiza `paginatedContacts` dentro de `StickyTableWrapper` + `TableBody`
- `SmartCompaniesTable` (408 linhas) — mesmo padrão, delega rows a `SmartCompanyRow`
- `OpportunityTableView` (371 linhas) — renderiza `sortedOpportunities` (sem paginação própria, depende do módulo pai)

**Facto importante:** Com pageSize máximo de 100 rows, o DOM nunca terá mais de ~100 `<tr>`. Virtualização com `@tanstack/react-virtual` traria **complexidade significativa** (reescrever o scroll container, lidar com sticky headers, alterar a estrutura `<table>` para usar `position: absolute` ou `translateY`) com **ganho marginal** — 100 rows é trivial para o browser.

## Decisão Técnica

A virtualização traz valor real quando se renderizam **500+ items sem paginação** (ex: Kanban com centenas de cards, listas infinitas). Nas tabelas paginadas com max 100 rows, o custo de implementação supera o benefício.

**Proposta:** Em vez de forçar virtualização nestas tabelas paginadas, implementar onde traz impacto real:

### Opção A — Virtualizar apenas onde faz sentido
1. **OpportunityTableView**: adicionar virtualização porque pode receber centenas de oportunidades sem paginação (o componente pai `OpportunitiesListView` passa `filteredOpportunities` sem paginar)
2. Manter contactos e empresas como estão (já paginadas com max 100 rows)

### Opção B — Remover limite de paginação + virtualizar
1. Remover paginação client-side das 3 tabelas
2. Implementar virtualização com `@tanstack/react-virtual` para scroll infinito
3. Reescrever o layout das tabelas para suportar rows virtualizadas (heights fixas, container com overflow)

A **Opção A** é pragmática e de baixo risco. A **Opção B** é uma refactorização significativa (cada tabela tem 400-900 linhas de código).

## Plano de Implementação (Opção A)

### 1. Virtualizar `OpportunityTableView`
- Importar `useVirtualizer` de `@tanstack/react-virtual`
- Wrapper div com `ref` e `overflow-y: auto` com altura fixa
- Virtualizar as rows do `TableBody` com `estimateSize: 52` (altura de uma row)
- Manter header sticky fora do container virtualizado
- Renderizar apenas as rows visíveis + overscan de 5

### 2. Adicionar `React.memo` aos componentes de row
- Wrap do conteúdo do `.map()` em `SmartContactsTable` num componente `ContactRow` com `React.memo`
- `SmartCompanyRow` já é um componente separado — adicionar `React.memo`
- Criar `OpportunityRow` com `React.memo` extraído do `.map()` em `OpportunityTableView`

### Ficheiros alterados
| Ficheiro | Alteração |
|----------|-----------|
| `src/components/opportunities/OpportunityTableView.tsx` | Virtualização com useVirtualizer + extrair OpportunityRow com memo |
| `src/components/contacts/SmartContactsTable.tsx` | Extrair ContactRow com React.memo |
| `src/components/companies/SmartCompanyRow.tsx` | Adicionar React.memo wrapper |

### Riscos
- Virtualização altera o comportamento de scroll — testar com 200+ oportunidades
- Sticky columns (`StickyTableWrapper`) podem conflitar com o container virtualizado nas tabelas de contactos/empresas — por isso virtualizar apenas OpportunityTableView que não usa sticky columns

