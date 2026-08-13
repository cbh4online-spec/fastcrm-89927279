# Elementos internos: alargar aos restantes módulos

Hoje o 4.º nível de visibilidade (separadores, campos, colunas e acções) só está declarado para **Leads, Contactos e Empresas**. O objectivo é cobrir os restantes módulos operacionais, mantendo o mesmo mecanismo já existente (`pageElements.ts` + `usePageElementVisibility` + backoffice Menus & Páginas).

## Âmbito por fases

**Fase 1 — Comercial e Financeiro**
- Pipeline (`opportunities`), Propostas (`proposals`), Faturas (`invoices`), Pagamentos (`payments`), Notas de Encomenda (`order-notes`), Cobranças (`collections`), Renovações (`renewals`).

**Fase 2 — Catálogo e Loja**
- Produtos (`products`), Pacotes (`bundles`), Produtos Compostos (`composite-products`), Stock Valorizado (`stock-valuation`), Loja Online (`store-orders`, `store-products`, `store-categories`, `store-coupons`, `store-reviews`, `store-returns`).

**Fase 3 — Operações, Suporte e Pessoas**
- Tarefas (`tasks`), Calendário (`calendar`), Inbox/Comunicação (`inbox`, `whatsapp-pro`), Suporte (`helpdesk-tickets`, `helpdesk-kb`), RH (`hr-employees`, `hr-absences`, `hr-recruitment-candidates`), Compras (`procurement-suppliers`, `procurement-orders`, `procurement-requests`).

Para cada módulo declaram-se apenas os elementos que existem mesmo no ecrã: separadores da ficha, campos do detalhe, colunas da listagem e acções do cabeçalho.

## Como fica para o utilizador

- No backoffice **Menus & Páginas**, cada uma destas páginas passa a ter "Elementos internos" com os mesmos 3 estados: Visível / Com cadeado / Oculto.
- Herança mantida: elemento → rota → sub-grupo → grupo de topo.
- Colunas ocultas desaparecem da tabela e do seletor de colunas; separadores ocultos não aparecem na ficha; acções ocultas saem do cabeçalho e do menu de acções; "com cadeado" mostra cadeado e não executa.
- Super admin nunca fica bloqueado (regra já existente).

## Detalhes técnicos

- `src/config/pageElements.ts`: acrescentar os blocos por módulo, reaproveitando os helpers `el()` e listas partilhadas (ex.: separadores comuns de ficha). Ids das colunas têm de coincidir com os ids já usados nas tabelas/column pickers de cada módulo; ids dos separadores com os valores de `value` dos `Tabs`.
- Integração em cada módulo (padrão já usado nas fichas CRM):
  - listagens → filtrar as definições de colunas com `isElementVisible("column", id)`;
  - fichas → filtrar `TabsTrigger`/`TabsContent` com `isElementVisible("tab", id)` e aplicar cadeado com `isElementLocked`;
  - cabeçalhos → esconder botões e itens de dropdown com `isElementVisible("action", id)`;
  - painéis de detalhe → filtrar linhas de campos com `isElementVisible("field", id)`.
- Sem alterações de base de dados: `workspace_menu_overrides` já aceita `item_type = 'element'`.
- `WorkspaceMenusSection.tsx` não precisa de alterações estruturais — passa a listar automaticamente os novos elementos por rota.
- Testes: alargar `src/test/navigation/menu-overrides.test.ts` com casos de herança para as novas rotas e um teste que garante que não há ids duplicados por (routeKey, kind).

## Critérios de aceitação

- Cada módulo listado tem elementos configuráveis no backoffice e as alterações reflectem-se na UI da workspace.
- Nenhum id declarado sem correspondência real no ecrã (sem entradas "mortas").
- Outras workspaces mantêm-se inalteradas; camada apenas de apresentação, sem impacto em RLS.

## Riscos e pontos por validar

- Módulos com colunas dinâmicas (ex.: campos personalizados) podem precisar de tratamento próprio — proposta: cobrir só as colunas fixas nesta iteração.
- Volume de trabalho: 3 fases; sugiro executar por fases para revisão intermédia.
