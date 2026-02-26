

# Reorganizar Layouts para Responsividade

## Problema

Analisando o screenshot e o código, identifico os seguintes problemas de responsividade:

1. **FilterSidebar** (`w-64` fixo) ocupa espaço permanente em mobile — deveria ser um overlay/drawer
2. **SmartLeadsTable** usa `flex h-full -m-6` e `p-6` que não se adapta a ecrãs pequenos
3. **Toolbar** tem elementos que não fazem wrap adequado em mobile (sort dropdown, botões)
4. **PageHeader** — tabs e actions empilham mas ficam apertados
5. **DashboardLayout** — `main` não tem padding base, cada página gere o seu próprio, causando inconsistências
6. **Pagination** não se adapta bem a mobile (muitos botões em linha)

## Alterações

### 1. `src/components/common/FilterSidebar.tsx`

- Em mobile (`< lg`), renderizar como overlay absoluto com backdrop em vez de coluna fixa
- Adicionar `fixed inset-0 z-40` em mobile quando aberto, com fundo semi-transparente
- Manter comportamento actual em `lg+`

### 2. `src/components/leads/SmartLeadsTable.tsx`

- Remover o hack `-m-6` e ajustar padding para `p-4 md:p-6`
- O container flex principal: `flex flex-col lg:flex-row h-full`
- FilterSidebar em mobile: hidden by default, toggle via botão
- Iniciar `showFilterSidebar` como `false` em mobile
- Ajustar `max-h` da tabela para usar `calc` responsivo

### 3. `src/components/common/Toolbar.tsx`

- Tornar a search bar full-width em mobile (já tem `w-full sm:w-72`)
- Esconder texto "Filtros" e "Limpar" em mobile, mostrar só ícones (`sm:inline`)
- Sort dropdown: reduzir width em mobile `w-[140px] sm:w-[160px]`

### 4. `src/components/common/PageHeader.tsx`

- Tabs: adicionar `overflow-x-auto` e `flex-nowrap` para scroll horizontal em mobile em vez de wrap
- Actions: stack vertical em `< sm`

### 5. `src/components/layout/DashboardLayout.tsx`

- Adicionar `p-4 md:p-6` ao `<main>` para padding consistente base — e remover padding duplicado das páginas individuais que usam este layout

### 6. Padrão aplicado a outras tabelas (Contactos, Empresas)

- Verificar se `SmartContactsTable` e `SmartCompaniesTable` seguem o mesmo padrão e aplicar mesmas correcções

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/components/common/FilterSidebar.tsx` | Overlay mobile com backdrop |
| `src/components/leads/SmartLeadsTable.tsx` | Remover `-m-6`, padding responsivo, filter sidebar hidden by default em mobile |
| `src/components/common/Toolbar.tsx` | Ícones-only em mobile, widths responsivos |
| `src/components/common/PageHeader.tsx` | Tabs com scroll horizontal, actions stack |
| `src/components/layout/DashboardLayout.tsx` | Padding base no main |

