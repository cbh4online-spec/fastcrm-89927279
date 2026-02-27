

# Aplicar Filtragem por Módulos nos Dois Menus (V1 + V2)

## Problema Real

O workspace METODOPARE tem `ui.shell_v2_enabled = false`, logo usa o **SidebarV1** que não tem qualquer filtragem por módulos. O V2 já tem a lógica correcta mas não está activo. Ambos precisam de filtrar.

## Alterações

### 1. `src/config/nav.v1.ts` — Adicionar `moduleSlug` aos itens

Adicionar `moduleSlug?: string` ao tipo `NavV1Item` e anotar cada item que depende de módulo:

| Grupo V1 | Itens com moduleSlug |
|---|---|
| Comunicação | Email → `email-campaigns` |
| Vendas | Propostas → `proposals`, Faturas → `invoices` |
| Portal B2B | Todos → `b2b-portal` |
| Loja Online | Todos → `online-store` |
| Marketplace C2C | Todos → `marketplace-c2c` |
| FastClub | Todos → `fastclub` |
| Marketing | Email Marketing → `email-campaigns`, Google Local → `google-local-services`, Bio OS → `bio-os` |
| Estratégia | Brief → `strategy-brief` |
| Ferramentas | Motor Conversacional → `conversational-engine`, SEO → `seo-growth` |
| Student Journey | Todos → `student-journey` |
| Instagram Looter | Todos → `instagram-looter` |

Itens sem moduleSlug (sempre visíveis): Dashboard, Mural, Coach IA, WhatsApp, Templates, CRM inteiro, Pipeline, Agendamento, Produtos, Relatórios, Automações, Assistentes IA, AI Employees, Form Studio, Importações, Integrações, Marketplace, Definições.

### 2. `src/components/layout/SidebarV1.tsx` — Filtrar itens por módulo

Antes de renderizar `mergedNavItems`, filtrar por `moduleSlug`:
```
const visibleNavItems = mergedNavItems.filter(item => 
  !item.moduleSlug || installedModuleIds.includes(item.moduleSlug)
);
```

Também filtrar `favoriteItems` da mesma forma.

Remover grupos (labels/separadores) que ficam vazios após filtragem.

### 3. Verificar V2 — Confirmar que lógica existente funciona

O V2 (`Sidebar.tsx`) já tem a filtragem correcta em `filteredGroups`. Sem alterações necessárias.

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/config/nav.v1.ts` | Adicionar `moduleSlug?: string` ao tipo e anotar ~25 itens |
| `src/components/layout/SidebarV1.tsx` | Filtrar `mergedNavItems` e `favoriteItems` por `installedModuleIds` |

