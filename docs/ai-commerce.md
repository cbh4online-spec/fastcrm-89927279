# AI Commerce — arquitetura e operação

O AI Commerce é uma camada **aditiva** sobre o e-commerce existente do FastCRM.
Não existe catálogo, checkout ou pagamento paralelo: os produtos, preços, encomendas
e pagamentos continuam a ser os do FastCRM.

## 1. Modelo de dados

| Tabela | Papel |
| --- | --- |
| `products` | Product Master. Fonte única de nome, SKU, preço, moeda, imagens, SEO. |
| `product_variants` | Variantes/subscrições. Fonte do preço mínimo e das opções expostas. |
| `product_ai_commerce` | 1:1 com o produto. Conteúdo orientado a IA, score e histórico de validação. |
| `ai_commerce_readiness_config` | Pesos, severidade e ativação de critérios **por workspace**. |
| `ai_commerce_settings` | Flags de funcionalidade e estado por canal (JSONB). |
| `commerce_feeds` / `commerce_feed_runs` | Feeds por canal, versão e histórico de geração. |
| `ai_commerce_events` | Funil e receita por canal, com atribuição first/last touch. |
| `store_orders` | Encomenda real. Guarda a atribuição usada na receita. |

Todas as tabelas novas têm RLS por `workspace_id`, `GRANT` explícitos e índices
para as consultas de analytics e deduplicação.

## 2. Readiness score

Motor puro em `src/lib/ai-commerce/readiness.ts` (cópia Deno em
`supabase/functions/_shared/ai-commerce/readiness.ts`).

- 22 critérios em 4 categorias: identificação, comercial, conteúdo, publicação.
- Pesos/severidade/ativação vêm de `ai_commerce_readiness_config` (ecrã "Critérios").
- `isReady` = nenhum critério bloqueante em falta.
- `isCommerceReady` = preço, moeda, disponibilidade e checkout válidos.
- O preço é o **preço efetivo**: `base_price` ou o menor preço de variante ativa.

## 3. Commerce API

Edge Function pública `commerce-api`, versão `v1` (segmento opcional):

```
GET /functions/v1/commerce-api/v1/products?workspace=<slug|uuid>&page=&per_page=
GET /functions/v1/commerce-api/v1/products/{slug}
GET /functions/v1/commerce-api/v1/products/{slug}/variants
GET /functions/v1/commerce-api/v1/categories?workspace=
GET /functions/v1/commerce-api/v1/feed?token=<public_token>
```

Regras:

- Só produtos `status=active`, `store_published=true` e com AI Commerce ativo.
- Nunca expõe custos, margens, fornecedores nem stock exato.
- Filtros por categoria, marca, disponibilidade, idioma e país; paginação com `meta`.
- Rate limiting por IP (`check_rate_limit`, 120/min). `429` quando excedido.
- Estados: `400 workspace_required`/`invalid_*`, `404 workspace_not_found`/`not_found`,
  `422 feed_invalid`, `429 rate_limited`, `500 internal_error`.

## 4. Feed Engine

Pipeline: **Product Master → mapper → validator → serializer → output**.
As regras de cada canal vivem só no adaptador (`openai`, `google`, `meta`, `xml`, `json`, `csv`).

- Produtos com erros do canal são excluídos do output (fail-closed).
- Um feed **sem nenhum produto válido nunca substitui a última versão válida**:
  a execução é registada com `served=false` e a API responde `422`.
- Cada geração válida incrementa `version` e atualiza `last_valid_version`.
- `commerce_feed_runs` guarda `valid_count`, `rejected_count` e um resumo legível dos erros.

## 5. Tracking e atribuição

`src/lib/ai-commerce/tracking.ts` no cliente; `commerce-track` no servidor.

- **First touch** em `localStorage` (nunca sobrescrito); **last touch** em `sessionStorage`.
- O navegador só pode registar eventos de navegação sem valor:
  `visit`, `commerce_page_view`, `product_view`, `product_click`, `add_to_cart`, `checkout_start`.
  A política RLS pública impõe `value`, `order_id` e `customer_id` nulos e `server_verified=false`.
- Eventos com valor (`purchase`, `checkout_completed`, `lead_created`, subscrições)
  passam obrigatoriamente por `commerce-track`, que:
  1. valida a encomenda em `store_orders` (workspace + estado pago);
  2. deriva o valor e a moeda da encomenda, nunca do navegador;
  3. grava `server_verified=true` com `event_id` determinístico (`purchase:<order_id>`);
  4. persiste a atribuição na encomenda quando ainda não está registada.
- Idempotência: índice único parcial `(workspace_id, event_id)` + verificação prévia.
- O consentimento de analytics é respeitado; sem consentimento nada é enviado.
- Nos analytics, **a receita só conta eventos `server_verified`**.

## 6. Segurança

- RLS por `workspace_id` em todas as tabelas da camada; escritas do frontend filtram
  sempre por `workspace_id` além do `id`.
- `commerce-api` e `commerce-track` correm com service role e filtram o workspace
  explicitamente em cada consulta.
- CORS em todas as respostas, incluindo erros; `OPTIONS` tratado.
- Nenhum segredo no código; nenhum dado sensível em logs.

## 7. Testes

- `src/test/ai-commerce/readiness.test.ts` — score base e exclusão de produtos no feed.
- `src/test/ai-commerce/hardening.test.ts` — variantes e preço efetivo, score configurável,
  commerce ready, contagem de rejeitados e resumo de erros do feed.

## 8. Operação

1. Ativar o AI Commerce no separador do produto e completar os campos em falta.
2. Ajustar os critérios em **AI Commerce → Critérios** se o negócio o exigir.
3. Criar o feed do canal e validar a execução em **Feeds** (produtos válidos vs rejeitados).
4. Acompanhar o funil e a receita por canal em **Analytics**, alternando
   entre primeira e última origem.
