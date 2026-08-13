# Esconder elementos dentro das páginas (nível 4 de visibilidade)

Hoje o backoffice (Super Admin → Menus & Páginas) só controla três níveis: grupo de topo, sub-grupo e página. O objectivo é acrescentar um quarto nível — os **elementos dentro de cada página**: separadores/secções das fichas, campos, colunas de listagem e botões/acções.

## Como fica para o utilizador

Na mesma página de Menus & Páginas, cada rota passa a ter uma seta para expandir. Ao expandir mostra os elementos dessa página, agrupados por tipo:

```text
Empresas  /dashboard/companies            herdado   Visível  v
  ├─ SEPARADORES
  │    Financeiro                         herdado   Visível  v
  │    IA & Dados                         herdado   Oculto   v
  ├─ CAMPOS
  │    NIF · Valor estimado · Score IA    ...
  ├─ COLUNAS DA LISTAGEM
  │    Faturação · Estado de pagamento    ...
  └─ ACÇÕES
       Exportar · Apagar · Nova fatura    ...
```

Mantém-se exactamente a mesma mecânica já conhecida: **Visível / Bloqueado / Oculto**, badge "herdado", botão "Aplicar a tudo" por página e "Repor predefinições". Um elemento sem regra herda o estado da própria página.

Âmbito: por workspace (igual ao actual). Sem regras por papel nesta fase.

## O que passa a ser configurável

- **Separadores/secções** das fichas de Lead, Contacto e Empresa (Visão Geral, Atividade, Mensagens, Negócio, IA & Dados e respectivas sub-secções).
- **Campos** dos formulários e painéis de detalhe das mesmas fichas (ex.: NIF, valor estimado, score IA, dados de enriquecimento).
- **Colunas** das listagens principais (Leads, Contactos, Empresas, Pipeline, Faturas).
- **Acções**: botões de topo e itens do menu "..." (Exportar, Apagar, Arquivar, Nova fatura, Enriquecer com IA, etc.).

Cada elemento é declarado num registo central, para o backoffice saber o que oferecer e as páginas saberem o que esconder.

## Estrutura técnica

1. **Base de dados** — alargar o `CHECK` de `workspace_menu_overrides.item_type` para aceitar `'element'`. Sem tabela nova; a chave única `workspace_id + item_type + item_key` já serve. `item_key` = `<routeKey>::<tipo>::<idDoElemento>` (ex.: `companies::tab::financial`).

2. **Registo de elementos** — novo `src/config/pageElements.ts`:
   - `PageElement = { id, routeKey, kind: 'tab' | 'field' | 'column' | 'action', label, defaultVisibility? }`
   - `PAGE_ELEMENTS: PageElement[]` agrupado por rota, com helpers `getElementsForRoute()` e `buildElementKey()`.
   - Arranca com as fichas de Lead/Contacto/Empresa e as listagens principais; expansível por acréscimo de entradas.

3. **Resolução de visibilidade** — em `src/config/menuOverrides.ts` acrescentar `resolveElementVisibility(map, routeKey, kind, id)`, com herança elemento → rota → sub-grupo → grupo de topo, reutilizando `resolveRouteVisibility`.

4. **Consumo nas páginas** — novo hook `src/hooks/usePageElementVisibility.ts` que devolve `isElementVisible(kind, id)` e `elementState(kind, id)` para a rota actual, alimentado pelo `useMenuOverrideMap()` já existente (com realtime). Aplicação:
   - `EntityHorizontalTabs.tsx` filtra separadores e sub-secções ocultos;
   - painéis de detalhe/formulários das fichas escondem campos ocultos;
   - `ListColumnsPicker` / tabelas removem colunas ocultas da lista disponível;
   - cabeçalhos das fichas e dropdowns `...` escondem acções ocultas.
   - Estado `locked` = elemento visível mas desactivado com cadeado (nos separadores e acções); em campos e colunas comporta-se como só-leitura.

5. **Backoffice** — em `WorkspaceMenusSection.tsx`, cada linha de rota ganha um `Collapsible` com os elementos do registo, reutilizando `VisibilitySelect` e o mesmo fluxo de `setVisibility` / `clearOverride` / `setBulk`. A pesquisa existente passa também a encontrar elementos pelo label.

6. **Segurança** — esta camada é apenas de apresentação. Não substitui RLS: campos sensíveis continuam protegidos ao nível dos dados. Fica documentado em `docs/permissions.md`.

## Critérios de aceitação

- Expandir uma página no backoffice mostra separadores, campos, colunas e acções dessa página.
- Marcar um elemento como Oculto remove-o da UI da workspace correspondente sem recarregar (realtime já existente).
- "Aplicar a tudo" numa página propaga para os seus elementos; "Repor predefinições" limpa tudo.
- Elementos sem regra mostram "herdado" e seguem o estado da página.
- Nenhuma funcionalidade existente desaparece para workspaces sem regras definidas.
- Consola limpa; sem regressões nas fichas de Lead/Contacto/Empresa nem nas listagens.

## Riscos e pontos por validar

- O registo de elementos é manual: elementos não declarados continuam sempre visíveis. Começamos pelas páginas mais usadas e alargamos depois.
- Esconder uma coluna com preferências guardadas (`ListColumnsPicker`) exige filtrar também as preferências gravadas — validar caso a caso.
- Regras por papel ficam fora desta fase; se for necessário depois, acrescenta-se uma coluna `role` sem quebrar o modelo actual.
