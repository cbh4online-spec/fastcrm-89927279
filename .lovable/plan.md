

# Sponsors como Funcionalidade Global

## Diagnóstico

O sistema já tem uma infraestrutura completa de sponsors, mas confinada ao módulo C2C:
- **Tabela `store_sponsors`**: nome, logo, website, tier, is_active, sort_order (já por workspace)
- **Admin (`C2CSponsorAdmin.tsx`)**: CRUD completo com candidaturas, tiers e estatísticas
- **Portal público (`C2CSponsorPortal.tsx`)**: formulário de candidatura para visitantes
- **Display (`StoreSponsorsBar.tsx`)**: barra de logos na loja
- **Hooks (`useStoreAds.ts`)**: todos os CRUD mutations

A tabela e hooks já funcionam por workspace — não é necessário alterar a BD. O trabalho é **elevar a visibilidade e acessibilidade** do sistema.

## Plano de Implementação

### 1. Rota dedicada no sidebar — Secção "Marketing"

Adicionar entrada no `routeManifest.ts` no grupo `marketing`:
- **Label**: "Sponsors / Parceiros"
- **Href**: `/dashboard/sponsors`
- **Ícone**: `Award`

### 2. Nova página global `SponsorsManagement.tsx`

Reutilizar a lógica do `C2CSponsorAdmin.tsx` numa página standalone em `src/pages/SponsorsManagement.tsx`:
- **Tab Parceiros**: lista, criar, editar, eliminar, toggle activo (reusa hooks de `useStoreAds.ts`)
- **Tab Candidaturas**: gerir candidaturas pendentes (reusa hooks de `useSponsorApplications.ts`)
- **Tab Estatísticas**: KPIs de sponsors activos, por tier, receita estimada
- Melhorias face ao existente:
  - Upload de logo via file input (em vez de URL manual)
  - Textarea para descrição (em vez de Input)
  - Preview do card do sponsor antes de guardar
  - Filtro por tier na listagem

### 3. Componente reutilizável `SponsorsShowcase.tsx`

Componente genérico para exibir sponsors em qualquer contexto:
- Props: `workspaceId`, `variant` (`bar` | `grid` | `footer`), `maxItems?`, `tierFilter?`
- `bar`: layout horizontal (como o actual `StoreSponsorsBar`)
- `grid`: grelha de cards com logo, nome, descrição e tier badge
- `footer`: versão compacta para rodapés de página

### 4. Integração no eBook Editor

Na sidebar do editor (tab "Marca" ou nova sub-secção):
- Picker para seleccionar sponsors do workspace a incluir no eBook
- Novo layout block `sponsors_page` que renderiza os sponsors seleccionados como página do eBook
- Guardar sponsors seleccionados no `metadata` do eBook

### 5. Integração na Storefront/Loja

Substituir `StoreSponsorsBar` por `SponsorsShowcase` com variant `bar` — mantém compatibilidade.

### 6. Rota na routing principal

Adicionar `<Route path="/dashboard/sponsors" element={<SponsorsManagement />} />` nas rotas.

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/config/routeManifest.ts` | Adicionar entrada "sponsors" no grupo marketing |
| `src/pages/SponsorsManagement.tsx` | **Novo** — página global de gestão de sponsors |
| `src/components/sponsors/SponsorsShowcase.tsx` | **Novo** — componente reutilizável multi-variante |
| `src/components/store/StoreSponsorsBar.tsx` | Refactorizar para usar `SponsorsShowcase` |
| `src/routes/MarketingRoutes.tsx` (ou equivalente) | Adicionar rota `/dashboard/sponsors` |
| `src/components/ebooks/EbookEditorSidebar.tsx` | Adicionar secção de sponsors na tab "Marca" |

## Critérios de aceitação

- Menu "Sponsors / Parceiros" visível no sidebar sob Marketing
- CRUD completo funcional na nova página (criar, editar, eliminar, toggle)
- Upload de logo funcional
- Componente `SponsorsShowcase` renderiza em 3 variantes
- Sponsors visíveis no eBook quando seleccionados
- Storefront continua a mostrar sponsors correctamente
- Mobile responsivo
- Estados vazios, loading e erro tratados

