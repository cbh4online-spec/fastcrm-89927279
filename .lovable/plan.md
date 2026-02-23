

# Fase 2 -- Portal B2B "Comprar por Diagnostico" + IA + BI

## Resumo da Analise

O codebase ja tem infraestrutura solida que podemos reutilizar:
- `product_protocols` + `protocol_products` (tabelas e hooks ja existem)
- `product_attributes` com tipos `pathology` e `function` (filtros ja funcionam)
- `ai-diagnostic-assistant` edge function (Copilot B2B ja funcional)
- `product_cross_sells` (cross-sell ja existe)
- `useProtocols` hook (fetch de protocolos com produtos)
- `CartContext` com IVA automatico

O que **falta** e novo:
- Catalogo de patologias e ligacao patologia-protocolo
- Kits com niveis (basico/avancado) dentro dos protocolos
- Paginas de compra por diagnostico
- Edge functions de recomendacao IA
- Dashboard de consumo e rankings

---

## Fase 2.1 -- Migracoes de Base de Dados

### Tabelas novas

```
pathologies
  id, workspace_id, name, slug, description, image_url, tags[], is_active, position, created_at

pathology_protocols (N:N)
  id, pathology_id, protocol_id, notes, position, created_at

protocol_kits
  id, protocol_id, kit_name, kit_level (basic/advanced/custom), description, is_default, position, created_at

protocol_kit_items
  id, kit_id, product_id, suggested_qty, is_optional, notes, position, created_at

client_consumption_analytics
  id, workspace_id, company_id, period_month (date), category, line, pathology, total_qty, total_value_net, created_at, updated_at

client_product_rankings
  id, workspace_id, company_id, period_days (30/90/180), product_id, product_name, total_qty, total_value_net, last_purchased_at, updated_at
```

### RLS
- Todas as tabelas com `workspace_id`
- `pathologies`, `pathology_protocols`, `protocol_kits`, `protocol_kit_items`: leitura autenticada por workspace
- `client_consumption_analytics`, `client_product_rankings`: leitura filtrada por `company_id` do utilizador autenticado (via security definer function)

### Indices
- `pathologies(workspace_id, is_active)`
- `pathology_protocols(pathology_id)`, `pathology_protocols(protocol_id)`
- `protocol_kits(protocol_id)`
- `protocol_kit_items(kit_id)`
- `client_consumption_analytics(company_id, period_month)`
- `client_product_rankings(company_id, period_days)`

---

## Fase 2.2 -- Compra por Diagnostico (3 paginas)

### Pagina 1: Lista de Patologias
**Rota:** `/client/diagnosis`
**Ficheiro:** `src/pages/client/ClientDiagnosisPage.tsx`

- Grid de cards com patologias activas do workspace
- Cada card: imagem, nome, descricao curta, tags, contagem de protocolos
- Filtro por tag e pesquisa
- Click navega para `/client/diagnosis/:slug`

### Pagina 2: Protocolos para Patologia
**Rota:** `/client/diagnosis/:slug`
**Ficheiro:** `src/pages/client/ClientDiagnosisDetailPage.tsx`

- Header com nome e descricao da patologia
- Lista de protocolos associados (via `pathology_protocols`)
- Cada protocolo: nome, descricao, kits disponiveis (basico/avancado), badge de nivel
- Secao IA: "Protocolos Recomendados" (via edge function `ai-protocol-recommendations`)
- Click em protocolo navega para `/client/protocol/:id`

### Pagina 3: Detalhe do Protocolo + Kit
**Rota:** `/client/protocol/:id`
**Ficheiro:** `src/pages/client/ClientProtocolDetailPage.tsx`

- Header com info do protocolo
- Selector de kit (basico/avancado) se existirem multiplos
- Lista de produtos do kit com imagem, nome, quantidade sugerida, preco
- Quantidades editaveis por produto
- Totais em tempo real (sem IVA, IVA, com IVA)
- Botao "Adicionar Kit ao Carrinho" (1 clique, adiciona todos)
- Secao IA: "Complementares e Upgrades" (via `ai-cart-recommendations`)
- Guardrail: aviso "Recomendacao tecnica -- confirme com protocolo profissional"

### Hook novo
**Ficheiro:** `src/hooks/client-portal/usePathologies.ts`
- `usePathologies(workspaceId)` -- lista patologias activas
- `usePathology(slug)` -- detalhe + protocolos associados
- `useProtocolKits(protocolId)` -- kits com items

---

## Fase 2.3 -- Sugestoes IA Automaticas

### Edge Function 1: `ai-protocol-recommendations`
- Input: `pathologyId`, `workspaceId`, `clientUserId`, `companyId`
- Busca: patologia, historico de encomendas, protocolos disponiveis, embeddings de produtos
- Output: lista de protocolos recomendados com `reason` e `priority`
- Usa Lovable AI (google/gemini-3-flash-preview)

### Edge Function 2: `ai-cart-recommendations`
- Input: `cartProductIds[]`, `workspaceId`, `clientUserId`, `companyId`
- Busca: cross-sells existentes, atributos dos produtos no carrinho, historico
- Output: lista de produtos complementares com `type` (complementar/upgrade/manutencao) e `reason`
- Usa Lovable AI (google/gemini-2.5-flash)

### Hook novo
**Ficheiro:** `src/hooks/client-portal/useAIRecommendations.ts`
- `useProtocolRecommendations(pathologyId, workspaceId)` -- chama edge function
- `useCartRecommendations(cartProductIds, workspaceId)` -- chama edge function

### Guardrails
- Linguagem: "recomendacao de protocolo/produto para a situacao selecionada"
- Aviso obrigatorio em todos os blocos IA: "Confirme com protocolo profissional"
- Nunca "diagnosticar" -- apenas "recomendar para a situacao"

---

## Fase 2.4 -- Dashboard de Consumo por Categoria

### Pagina
**Rota:** `/client/insights/consumption`
**Ficheiro:** `src/pages/client/ClientConsumptionPage.tsx`

- Total gasto (sem IVA / com IVA) no periodo selecionado
- Selector de periodo: mes actual, trimestre, semestre, ano
- Graficos:
  - Bar chart: consumo por categoria
  - Bar chart: consumo por linha
  - Line chart: evolucao mensal
  - Pie chart: distribuicao por categoria (top 5)
- Tabela detalhada com sorting

### Hook novo
**Ficheiro:** `src/hooks/client-portal/useConsumptionAnalytics.ts`
- Agrega dados de `order_notes` + `order_note_items` faturados
- Calcula totais por categoria, linha, patologia, mes
- Fallback: se `client_consumption_analytics` nao tiver dados, calcula em tempo real a partir das encomendas

### Permissoes
- Visivel para: `client_admin`, `client_financial`
- `client_viewer`: so leitura se permitido

---

## Fase 2.5 -- Ranking de Produtos Mais Comprados

### Pagina
**Rota:** `/client/insights/rankings`
**Ficheiro:** `src/pages/client/ClientRankingsPage.tsx`

- Selector de janela temporal: 30, 90, 180 dias
- Top 10 produtos por quantidade e valor
- Badges: "Mais Comprado", "Tendencia" (crescimento vs periodo anterior)
- Botao "Re-encomendar" em cada produto
- Secao IA: "Recomendados para si" (reutiliza `ai-cart-recommendations`)

### Widgets no Dashboard
**Ficheiro:** `src/pages/client/ClientDashboardPage.tsx`
- Adicionar card "Mais Comprados (30d)" com top 3 + link para rankings
- Adicionar card "Comprar por Diagnostico" com link para `/client/diagnosis`

### Hook novo
**Ficheiro:** `src/hooks/client-portal/useProductRankings.ts`
- Agrega de `order_note_items` com joins a `order_notes` (status = invoiced)
- Calcula por janela temporal
- Detecta tendencias (comparacao com periodo anterior)

---

## Fase 2.6 -- Integracao na Navegacao

### `src/components/client-portal/ClientLayout.tsx`
Adicionar ao menu:
- "Diagnostico" (icon: Stethoscope) -> `/client/diagnosis`
- "Consumo" (icon: BarChart3) -> `/client/insights/consumption` (requer canViewFinancials)
- "Rankings" (icon: Trophy) -> `/client/insights/rankings`

### `src/App.tsx`
Adicionar rotas:
- `/client/diagnosis`
- `/client/diagnosis/:slug`
- `/client/protocol/:id`
- `/client/insights/consumption`
- `/client/insights/rankings`

---

## Detalhes Tecnicos

### Ficheiros a criar

| Ficheiro | Tipo |
|---|---|
| Migracao SQL (6 tabelas + RLS + indices) | DB |
| `src/pages/client/ClientDiagnosisPage.tsx` | Pagina |
| `src/pages/client/ClientDiagnosisDetailPage.tsx` | Pagina |
| `src/pages/client/ClientProtocolDetailPage.tsx` | Pagina |
| `src/pages/client/ClientConsumptionPage.tsx` | Pagina |
| `src/pages/client/ClientRankingsPage.tsx` | Pagina |
| `src/hooks/client-portal/usePathologies.ts` | Hook |
| `src/hooks/client-portal/useProtocolKits.ts` | Hook |
| `src/hooks/client-portal/useAIRecommendations.ts` | Hook |
| `src/hooks/client-portal/useConsumptionAnalytics.ts` | Hook |
| `src/hooks/client-portal/useProductRankings.ts` | Hook |
| `supabase/functions/ai-protocol-recommendations/index.ts` | Edge Function |
| `supabase/functions/ai-cart-recommendations/index.ts` | Edge Function |

### Ficheiros a editar

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Adicionar 5 rotas + lazy imports |
| `src/components/client-portal/ClientLayout.tsx` | Adicionar 3 items ao menu |
| `src/pages/client/ClientDashboardPage.tsx` | Adicionar widgets Diagnostico + Rankings |
| `supabase/config.toml` | Registar 2 novas edge functions |

### Compatibilidade
- Reutiliza `product_protocols` e `protocol_products` existentes (sem duplicar)
- Reutiliza `product_attributes` para pathologies/functions
- Reutiliza `CartContext` e `useCart` para adicionar kits
- Reutiliza `ai-diagnostic-assistant` como base de logica IA
- Todas as tabelas novas sao aditivas -- nenhuma tabela existente e modificada
- RLS mantido por workspace_id + company_id
- Multi-tenant compativel

