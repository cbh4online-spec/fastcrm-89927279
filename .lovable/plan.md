

# Recommendation Skill — Plano de Implementação

## Contexto Atual

O projecto já tem:
- **Edge Function** `suggest-products-for-entity` — usa apenas IA (Lovable AI Gateway) para sugerir produtos com base no perfil da entidade. Sem histórico de compras, sem scoring por estratégias.
- **Hook** `useEntityProductSuggestions` — mutation que chama a edge function acima.
- **Componente** `ProductSuggestionsCard` — card com botão "Gerar Sugestões", usado apenas na ficha do Lead.
- **Tabelas existentes**: `invoice_items` (sem `workspace_id`, herda de `invoices`), `products` (usa `category` string, não `category_id`; preço em `base_price`, não `price`).
- Não existem tabelas `product_recommendations`, `recommendation_feedback`, `recommendation_config`, nem views materializadas.

## Adaptações ao Prompt Original

O prompt original tem vários campos/tabelas que não correspondem ao schema real. Adaptações necessárias:

- `invoice_items.workspace_id` → usar JOIN com `invoices` para obter `workspace_id`
- `products.price` → `products.base_price`
- `products.category_id` → `products.category` (string)
- `products.is_active` → `products.status = 'active'`
- Views materializadas adaptadas ao schema real
- Edge function usa **Lovable AI Gateway** (já configurado) em vez de Anthropic diretamente
- `contacts.first_name/last_name` → verificar schema real de contacts
- `leads.sector` → `leads.company` (não existe `sector` em leads)

## Implementação em 6 Passos

### 1. Migration SQL

Criar 3 tabelas + 2 views materializadas + função de refresh:

**Tabelas:**
- `product_recommendations` — com entity_check constraint, índices parciais, RLS
- `recommendation_feedback` — feedback de utilizadores sobre recomendações, RLS  
- `recommendation_config` — pesos configuráveis por workspace, RLS

**Views Materializadas** (adaptadas ao schema real):
- `entity_purchase_history` — JOIN `invoice_items` → `invoices` (para `workspace_id`, `contact_id`, `company_id`) → `products` (para `category`)
- `product_cooccurrence` — co-ocorrência de produtos em faturas pagas, com lift_score

**Nota**: As views materializadas usam `UNIQUE INDEX` para suportar `REFRESH CONCURRENTLY`. A função `refresh_recommendation_views()` faz o refresh.

RLS em todas as tabelas usando padrão `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`.

### 2. Edge Function: `suggest-products-for-entity` (reescrever)

Substituir a implementação atual (apenas IA) por uma versão com **4 estratégias em paralelo**:

1. **History** (peso 40%): mesma categoria não comprada, recompra por ciclo, churn prevention
2. **Profile** (peso 25%): protocolos de sector, boost por contexto, range de preço por lead score
3. **Collaborative** (peso 20%): co-ocorrência via `product_cooccurrence`
4. **Semantic/AI** (peso 15%): chamada ao Lovable AI Gateway para razões contextuais

Fluxo:
1. Verificar cache (recomendações pending com < 30 min)
2. Carregar config do workspace (pesos)
3. Construir perfil da entidade (dados + histórico de compras)
4. Executar 3 estratégias SQL em paralelo
5. Combinar scores ponderados, filtrar por threshold mínimo
6. Chamar Lovable AI para gerar razões em português para os top candidatos
7. Apagar pending anteriores e inserir novas recomendações
8. Retornar com dados enriquecidos do produto

Input/output mantém compatibilidade com o hook existente mas com novo formato.

### 3. Edge Function: `recommendation-feedback` (nova)

Endpoint para registar feedback do utilizador:
- Mapeia feedback → status (dismissed, converted, added_to_proposal, etc.)
- Insere em `recommendation_feedback`
- Atualiza `product_recommendations.status`

### 4. Hook: `useProductRecommendations` (novo)

Novo hook com:
- `useQuery` para carregar recomendações (com staleTime de 30 min)
- `giveFeedback` mutation
- `refresh` mutation (força recálculo)
- Mantém o `useEntityProductSuggestions` existente para backward compatibility

### 5. Componente: `RecommendationPanel` (novo)

Componente reutilizável com 3 modos:

- **`panel`**: secção vertical para fichas de entidade. Header "Sugestões IA" + refresh. Cards com thumbnail, nome, preço, badge de confiança, razão, tags, botões de ação (+Proposta, +Encomenda, ✓, ✗). Animação de saída com framer-motion.
- **`inline`**: horizontal, compacto, 3 cards lado a lado. Sem refresh. Para propostas/encomendas.
- **`widget`**: lista simples de 5 linhas para dashboard. Avatar + "Cliente → Produto" + score.

Estados: empty (Sparkles + mensagem), loading (skeletons), erro (mensagem inline).

### 6. Integração nos Módulos

Adicionar `RecommendationPanel` em:

| Módulo | Componente | Modo | Contexto |
|--------|-----------|------|----------|
| Lead | `LeadDetailWithSidebar` | panel | `lead_view` |
| Contacto | `ENIContactDetailWithSidebar` | panel | `contact_view` |
| Empresa | `CompanyDetailWithSidebar` | panel | `company_view` |
| Dashboard | Novo widget `RecommendationOpportunitiesWidget` | widget | `dashboard` |

A integração em propostas, encomendas, oportunidades, B2B, security e procurement será feita numa segunda fase — requer verificação de cada componente para adaptar os callbacks (`onAddToProposal`, `onAddToOrder`).

## Ficheiros

**Novos:**
- Migration SQL (tabelas + views + refresh function)
- `supabase/functions/recommendation-feedback/index.ts`
- `src/hooks/useProductRecommendations.ts`
- `src/components/shared/RecommendationPanel.tsx`
- `src/components/dashboard/RecommendationOpportunitiesWidget.tsx`

**Modificados:**
- `supabase/functions/suggest-products-for-entity/index.ts` — reescrita completa
- `src/components/crm/LeadDetailWithSidebar.tsx` — trocar `ProductSuggestionsCard` por `RecommendationPanel`
- `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` — adicionar `RecommendationPanel`
- `src/components/companies/CompanyDetailWithSidebar.tsx` — adicionar `RecommendationPanel`

## Notas Técnicas

- Usa **Lovable AI Gateway** (não Anthropic) — `LOVABLE_API_KEY` já configurado
- Views materializadas precisam de refresh periódico — a função `refresh_recommendation_views()` pode ser chamada manualmente ou via cron
- Multi-tenant seguro: todas as queries filtram por `workspace_id` + RLS
- Graceful degradation: se não houver dados de compra, o sistema recorre à estratégia de perfil + IA

