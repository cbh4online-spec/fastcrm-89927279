## Diagnóstico

O checkout B2B atual está funcional mas "magro": calcula subtotal + IVA, valida crédito/MOQ e submete encomenda. Falta toda a camada de **otimização de receita** (aumentar ticket médio) e **retenção transacional** (recuperar carrinhos abandonados). O carrinho vive apenas em memória (`useState`) — fecha o browser e perde tudo.

## Decisões de produto

Implementar 8 técnicas, agrupadas em 3 frentes:

**A. Aumentar ticket médio (no checkout/carrinho)**
1. **Quantity breaks (escalonamento)** — descontos por quantidade por SKU/categoria, mostrados inline com "Adiciona +12 unidades e poupas X€".
2. **Free-shipping bar** — barra de progresso "Faltam 35€ para frete grátis".
3. **Cross-sell "Compre frequentemente junto"** — sugestões baseadas no histórico de encomendas do parceiro e em produtos da mesma categoria.
4. **Upsell de variante superior** — quando o cliente escolheu uma variante (ex: 50ml), sugerir 100ml com preço/ml melhor.
5. **Bundles e kits B2B** — packs definidos por gestor (ex: "Kit lançamento") com desconto automático.
6. **Cupões/promoções B2B** — códigos por parceiro/tier/campanha com regras (mín. valor, validade, primeira encomenda, etc.).

**B. Recuperação de carrinhos abandonados**
7. **Persistência do carrinho no servidor** — `partner_carts` com snapshot por utilizador; sobrevive a sessões, sincroniza entre dispositivos.
8. **Sequência de recuperação por email** — após X horas de inatividade com itens, enviar 1º lembrete (24h) → 2º com cupão (72h) → 3º "última oportunidade" (7d). Click no email → carrinho restaurado.

**C. Telemetria**
- Eventos de funnel (`view_catalog`, `add_to_cart`, `view_cart`, `start_checkout`, `complete_order`, `cart_abandoned`, `cart_recovered`) para o gestor B2B medir conversão.

## Estrutura técnica

### Base de dados (migração)

- `partner_quantity_breaks` — `product_id|category_id`, `min_qty`, `discount_pct`, `partner_tier_id?`, `valid_from/until`.
- `partner_bundles` — `name`, `discount_pct|fixed_amount`, `is_active`, `valid_until` + `partner_bundle_items` (`bundle_id`, `product_id`, `qty`).
- `partner_coupons` — `code` (UNIQUE), `discount_type` (pct|fixed|free_shipping), `value`, `min_subtotal`, `max_uses`, `uses_count`, `per_partner_limit`, `valid_from/until`, `applicable_partner_tier_id?`, `first_order_only`, `is_active` + `partner_coupon_redemptions` (audit).
- `partner_shipping_rules` — por workspace: `free_shipping_threshold`, `flat_rate`, `currency`.
- `partner_carts` — `partner_user_id` (UNIQUE), `partner_account_id`, `items_jsonb`, `applied_coupon_code?`, `last_activity_at`, `recovery_stage` (none|first|second|final|recovered|expired), `recovery_token` (UUID).
- `partner_order_headers`: adicionar `discount_code`, `discount_amount` (já existe), `shipping_amount` (já existe), `recovered_from_cart_id?`.
- `partner_order_items`: adicionar `quantity_break_applied_pct`, `bundle_id?`.
- RPC `compute_partner_cart_totals(cart_jsonb, partner_account_id, coupon_code?)` → devolve `{subtotal, quantity_break_savings, bundle_savings, coupon_savings, shipping, tax, total, applied_rules[]}` para ser SSoT entre carrinho/checkout/encomenda.
- RPC `get_partner_recommendations(partner_account_id, current_cart_ids[], limit)` → cross-sell baseado em co-ocorrência em encomendas históricas + fallback por categoria.
- Trigger em `partner_carts` que atualiza `last_activity_at` em qualquer alteração.

### Edge Functions

- `partner-cart-recovery` — cron a cada 30 min: encontra carrinhos com itens cujo `last_activity_at` cruzou os limites (24h/72h/7d) e `recovery_stage` é o anterior; usa o sistema de email transacional já configurado, gera URL `/partner/cart?recover={token}`, avança `recovery_stage`. 200 OK + fallback se algo falhar.
- `partner-coupon-validate` — valida código no carrinho/checkout (regras + limites de uso) e devolve impacto. Validação client + server.

### Frontend

- `PartnerCartContext` refatorado: lê/escreve em `partner_carts` via debounce (1s) + estado local optimista; carrega carrinho ao montar; rota `/partner/cart?recover=token` chama RPC para restaurar.
- Componentes novos:
  - `FreeShippingBar` (no carrinho e cabeçalho).
  - `QuantityBreakHint` (inline no card e no item do carrinho).
  - `CrossSellRail` (carrossel "Compre também" no carrinho e checkout).
  - `BundleSuggestion` (banner quando o carrinho está perto de completar um bundle).
  - `CouponInput` (no carrinho com validação live).
  - `OrderSummaryBreakdown` (subtotal → poupanças → frete → IVA → total, igual no carrinho e checkout).
- Página `PartnerCheckoutPage`: passa a usar `compute_partner_cart_totals` (mesma fonte do carrinho); mostra todas as poupanças aplicadas; bloqueio se cupão entretanto inválido.
- Admin (rotas internas, não no portal partner):
  - `/admin/partner-center/promotions` — gestão de cupões, brackets, bundles, regras de envio.
  - `/admin/partner-center/abandoned-carts` — lista filtrável, botão "enviar lembrete agora", taxa de recuperação.

### Telemetria

- Tabela `partner_funnel_events` (`workspace_id`, `partner_account_id`, `partner_user_id`, `event_type`, `payload jsonb`, `cart_id?`, `order_id?`).
- Hook `usePartnerFunnel()` — emite eventos via `INSERT` direto (RLS limita a próprio workspace).
- Dashboard B2B existente ganha card "Funnel: catálogo → carrinho → checkout → encomenda" e "Carrinhos recuperados / abandonados".

## Plano de implementação

1. **Migração + RLS** — criar tabelas (`partner_quantity_breaks`, `partner_bundles`, `partner_bundle_items`, `partner_coupons`, `partner_coupon_redemptions`, `partner_shipping_rules`, `partner_carts`, `partner_funnel_events`), adicionar colunas a `partner_order_*`, RLS por `workspace_id` + helper `is_partner_member()`, índices em `last_activity_at` e `recovery_stage`.
2. **RPCs** — `compute_partner_cart_totals`, `get_partner_recommendations`, `validate_partner_coupon`, `restore_partner_cart_by_token`, `apply_partner_quantity_breaks`. Todas `SECURITY DEFINER` + `search_path=public`.
3. **Persistência do carrinho** — refator `PartnerCartContext` com sync server-side debounced; restauro por token.
4. **UI carrinho** — `FreeShippingBar`, `QuantityBreakHint`, `CouponInput`, `OrderSummaryBreakdown`, `CrossSellRail`, `BundleSuggestion`.
5. **UI checkout** — substituir cálculo manual de subtotal/IVA pela RPC SSoT; mostrar breakdown completo; voltar ao carrinho se cupão inválido.
6. **Edge function de recuperação** + cron pg_cron a cada 30 min; templates de email (3 fases) usando o sistema transacional já configurado.
7. **Admin** — páginas de promoções e abandoned carts.
8. **Telemetria** — emitir eventos em pontos-chave; cards no dashboard B2B.

## Critérios de aceitação

- Adicionar item recalcula em <300 ms o resumo (poupanças, frete, total) com a mesma RPC usada no checkout.
- Cupão inválido não permite submeter; cupão válido aparece destacado com economia em €.
- Atingir o threshold de frete grátis remove a linha de envio em tempo real.
- Quantity break: ao aproximar-se de um patamar, o card mostra "+N un = -X%".
- Carrinho persiste após F5/troca de browser/login posterior.
- Email de recuperação chega às 24h/72h/7d se sem atividade; clicar restaura carrinho exato.
- Admin vê lista de carrinhos abandonados com valor total e tempo desde abandono.
- Dashboard B2B mostra taxa de conversão por etapa do funnel e taxa de recuperação.
- RLS impede ver carrinhos/cupões de outros workspaces.
- Submeter encomenda regista poupanças por linha e cupão aplicado em `partner_order_*`.

## Riscos e pontos por validar

- **Empilhamento de descontos**: cupão + quantity break + tier — definir ordem (proposta: tier → quantity break → bundle → cupão sobre o restante). Confirmar regra de negócio.
- **Limites de cupão por parceiro/global**: race conditions em `uses_count` — usar `UPDATE ... RETURNING` atómico.
- **Frequência de recuperação**: 24h/72h/7d são razoáveis para B2B (ciclo mais lento que B2C), mas confirmar com o gestor; deixar configurável em `partner_shipping_rules` ou nova `partner_recovery_config`.
- **Conteúdo dos emails**: precisamos do tom (formal/casual) e se o 2º email deve incluir cupão automático ou só após pedido humano.
- **Cross-sell**: começar só com co-ocorrência (encomendas do próprio parceiro) — escalar para ML/embeddings só se houver volume.
- **GDPR**: tokens de recuperação são URLs auth-bypass — TTL curto (7 dias) e invalidação após uso.

Confirmas o plano (em particular a ordem de descontos e os intervalos 24h/72h/7d) para eu avançar?
