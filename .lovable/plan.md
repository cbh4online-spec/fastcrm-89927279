

# Filtrar Grupos da Sidebar V2 por Módulos Instalados

## Problema

Os grupos na sidebar V2 (Loja Online, Marketplace C2C, FastClub, Student Journey, Instagram Looter, Portal B2B, Estratégia, etc.) são hardcoded e aparecem sempre, independentemente de os módulos estarem instalados. Apenas `featureFlag` é verificado, mas não `moduleSlug`.

## Solução

Adicionar propriedade `moduleSlug` aos grupos/itens que dependem de módulos do marketplace e filtrar no Sidebar.tsx usando `installedModuleIds`.

## Mapeamento Grupo → moduleSlug

| Grupo | moduleSlug |
|---|---|
| Portal B2B | `b2b-portal` |
| Loja Online | `online-store` |
| Marketplace C2C | `marketplace-c2c` |
| FastClub | `fastclub` |
| Estratégia | `strategy-brief` |
| Student Journey | `student-journey` |
| Instagram Looter | `instagram-looter` |

Itens individuais dentro de outros grupos:
| Item | moduleSlug |
|---|---|
| Propostas | `proposals` |
| Faturas | `invoices` |
| Email Marketing | `email-campaigns` |
| Google Local | `google-local-services` |
| Bio OS | `bio-os` |
| SEO & Growth | `seo-growth` |
| Motor Conversacional | `conversational-engine` |

## Alterações

### 1. `src/config/nav.v2.ts`
- Adicionar `moduleSlug?: string` aos tipos `NavV2Group` e `NavV2GroupChild`
- Anotar cada grupo/item com o `moduleSlug` correspondente

### 2. `src/components/layout/Sidebar.tsx`
- No `filteredGroups`, além de `featureFlag`, filtrar grupos por `moduleSlug` (se definido, só mostrar se `installedModuleIds` o contém)
- Filtrar também children individuais por `moduleSlug`
- Remover grupos que ficam sem children após filtragem

## Grupos sempre visíveis (sem moduleSlug)
- CRM, Vendas (itens core sem moduleSlug), Marketing (item base), Relatórios, Ferramentas (itens core)

