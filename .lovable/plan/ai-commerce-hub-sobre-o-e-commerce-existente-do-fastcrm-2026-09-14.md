# AI Commerce Hub sobre o e-commerce existente do FastCRM

## Fase 1 — Auditoria (concluída)

O e-commerce já existe e é extenso. Nada será duplicado.

Já existe e será reutilizado:
- **Produtos**: tabela `products` (142 colunas) com `sku`, `name`, `store_slug`, `short_description`, `commercial_description`, `category`, `subcategory`, `product_type`, `base_price`, `compare_at_price`, `currency`, `tax_included`, `stock_status`, `status`, `images`, `benefits`, `tags`, `search_keywords`, `origin_country`, `billing_type`/`billing_frequency`/`recurring_fee`/`setup_fee`, `product_condition`, `store_published`/`b2b_published`/`sheet_published`, `published_at`.
- **Tabelas satélite**: `product_variants`, `product_images`, `product_categories`, `store_categories`, `product_content_sections`, `product_conversation_faqs`, `product_tier_prices`, `product_inventory`, `product_bundles`, `product_kits`.
- **Loja e checkout**: páginas `/store/:slug/...`, carrinho, `store_orders`, `checkout_sessions`, funis de checkout, cupões, ofertas, pagamentos.
- **Tracking**: `store_tracking_events`, `store_page_views`, `store_abandoned_carts`, PostHog.
- **Publicação**: `ProductPublishingPanel` (B2B / Loja / Ficha pública).

Lacunas reais confirmadas (é isto que vai ser criado):
- não há `brand`, `gtin`, `mpn`, `seo_title`, `seo_description`, `canonical_url`, `checkout_url`, `target_audience`, `use_cases`, `countries`, `languages`, `schema_type`;
- não há camada AI Commerce (campos, score, feeds, canais, logs);
- não existe JSON-LD nas páginas públicas (nenhuma ocorrência de `application/ld+json`);
- não existe API pública de catálogo nem motor de feeds;
- o tracking não distingue origem de motores de IA.

## Fase 2 — Modelo de produto

Migração **aditiva** (sem apagar nem renomear nada):
- em `products`: `brand`, `gtin`, `mpn`, `manufacturer`, `seo_title`, `seo_description`, `canonical_url`, `checkout_url`, `schema_type`, `target_audience`, `problem_solved`, `use_cases[]`, `main_benefits[]`, `features[]`, `countries[]`, `languages[]`, `tax_class`, `activation_fee`;
- campos já existentes com equivalente (preço, stock, imagens, descrições, condição, categoria) **não são recriados** — são lidos das colunas atuais através de uma vista de leitura.

## Fase 3 — Camada AI Commerce

Nova tabela `product_ai_commerce` (1:1 com o produto, isolada por workspace) com `ai_commerce_enabled`, `ai_title`, `ai_short_description`, `ai_long_description`, `ai_category`, `ai_target_audience`, `ai_problem_solved`, `ai_use_cases`, `ai_key_features`, `ai_faq`, `ai_keywords`, `ai_recommendation_context`, `ai_exclusions`, `ai_last_validation`, `ai_readiness_score`.

Nova área no backoffice, com o design system atual: **E-commerce > AI Commerce** com Overview, Readiness, Feeds, Canais, Analytics e Logs. Novo separador "AI Commerce" na ficha do produto.

## Fase 4 — Readiness Score

Motor puro e testável (`src/lib/ai-commerce/readiness.ts`) que valida os 22 critérios pedidos, devolve 0–100, lista os problemas em português e liga cada problema ao campo em falta com CTA "Corrigir". Executado no cliente para pré-visualização e no servidor ao gravar (fonte de verdade).

## Fase 5 e 6 — myMIA e FastCRM

Configuração de marca, categoria, tipo, use cases, público-alvo e contexto de recomendação para os dois produtos, e preparação de variantes (Base/Plus/Personalizado, mensal/anual, com/sem equipamento) e planos (Start/Business/Pro/Enterprise). **Sem inventar preços** — usa-se apenas o que já está na base de dados; onde não existir preço, o produto fica marcado como incompleto no readiness.

## Fase 7 — Commerce API pública

Edge Function `commerce-api` com rotas `products`, `products/{slug}`, `products/{slug}/variants`, `categories`, `feed`. Devolve apenas produtos ativos, publicados e com AI Commerce ativo. Paginação, filtros (idioma, país, categoria, marca, disponibilidade), rate limiting por IP, logs e nenhum campo interno (custos, margens, fornecedores, stock exato).

## Fase 8 — Schema.org

Gerador central que produz JSON-LD a partir da base de dados: `Product`+`Offer`, `SoftwareApplication`, `Service`, `Course`, `Organization`, `BreadcrumbList`, `FAQPage`, conforme `schema_type`. Injetado na página pública de produto. Sem reviews, ratings, preços ou disponibilidade fictícios.

## Fase 9 — Feed Engine

Tabelas `commerce_feeds` e `commerce_feed_runs`. Adaptadores por canal (OpenAI Commerce, Google, Meta, XML genérico, JSON genérico, CSV), cada um com mapper, validator e serializer isolados — as regras externas ficam nos adaptadores, nunca na tabela de produtos. Cada feed mostra estado, última geração, nº de produtos, erros, avisos, URL e ações "Gerar novamente" e "Validar".

## Fase 10 — Tracking e analytics de IA

Tabela `ai_commerce_events` com `source`, `medium`, `campaign`, `referrer`, `landing_page`, `product_id`, `session_id`, `customer_id`, `order_id`, `value`, `currency`, `timestamp`. Reconhecimento de `utm_source=chatgpt`, `utm_medium=ai` e de referrers de assistentes, persistido na sessão até à compra. Dashboard por canal (visitas, vistas de produto, leads, carrinhos, checkouts, compras, conversão, receita) com filtros de período, produto, país, canal e campanha.

## Segurança

RLS em todas as tabelas novas, escopada por `workspace_id`, com GRANTs explícitos; API pública separada da privada e só com campos autorizados; preços sempre validados no servidor; rate limiting e logs; nenhuma chave ou configuração sensível no frontend.

## Fora de âmbito

Sem Shopify, sem nova loja, sem novo checkout, sem migrações destrutivas, sem marcas em hardcode.

## Entrega

No fim: relatório do que foi criado vs. reutilizado, alterações de base de dados, endpoints, componentes, limitações, credenciais ainda necessárias (submissão real a OpenAI/Google/Meta depende de contas e aprovações externas) e próximos passos.
