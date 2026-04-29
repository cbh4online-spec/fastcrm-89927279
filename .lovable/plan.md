## Diagnóstico

A plataforma já tem duas camadas de permissões parcialmente construídas, mas **nenhuma cobre Produtos ao detalhe e nenhuma é efectivamente aplicada nos formulários**:

- `field_permissions` (workspace_id, object_key, role, field_key, permission_level: hidden/view/edit) — usada pelo diálogo "Permissões por Campo" em Definições → Segurança. Para Produtos só lista 5 campos (`name`, `price`, `cost`, `margin`, `description`) — desfasado das ~80 colunas reais (`base_price`, `direct_cost`, `target_margin_pct`, `stock_quantity`, `barcode`, etc.).
- `profile_field_permissions` (por sales_function) — paralela e usada pelo `useFieldPermissions` em algumas páginas.
- `object_permissions` — controla CRUD por role/objecto, já cobre Produtos corretamente.
- Os formulários de Produto (`CreateProductDialog`, `ProductDetailDialog`, `MQPCWizard`, `MobileProductDetailSheet`) **não consultam `field_permissions`** — qualquer regra definida hoje não tem efeito real.

## Decisões de produto e UX

1. **Catálogo de campos completo** — registar todos os campos editáveis de Produto, agrupados por secção lógica:
   - Identificação: `name`, `sku`, `barcode`, `category`, `line`, `tags`, `brand_logo_url`, `product_type`, `status`
   - Comercial: `short_description`, `commercial_description`, `benefits`, `conditions`, `demo_video_url`
   - Preço: `base_price`, `currency`, `tax_rate_estimate_pct`, `tax_included`, `setup_fee`, `recurring_fee`, `billing_type`, `billing_frequency`, `competitor_price_low`, `competitor_source`
   - Custos e margem: `direct_cost`, `operational_cost`, `target_margin_pct`, `commission_default`, `labor_hours`, `labor_hourly_rate`, `labor_included_in_price`, `labor_notes`
   - Stock e logística: `stock_status`, `stock_quantity`, `track_stock`, `low_stock_threshold`, `min_order_quantity`, `order_multiple`, `pack_size`, `weight`, `delivery_estimate`, `delivery_notes`, `delivery_mode`
   - Conteúdo: `images`, `primary_image_index`, `specifications`
   - Loja / publicação: `store_published`, `store_featured`, `store_visibility`, `store_category_id`, `store_sort_order`, `b2b_published`, `sheet_published`, `sheet_slug`, `business_types`
   - Consumo (serviços): `consumption_model`, `included_quantity`, `unit_name`, `unit_duration`, `validity_days`, `total_units`, `recommended_frequency`, `typical_duration_days`, `is_trackable`
   - Bundle: `bundle_price_mode`
2. **Diálogo dedicado para Produtos** — criar uma nova vista "Permissões — Produtos" com:
   - Selector de role (owner sempre `edit`, bloqueado).
   - Pesquisa de campo + filtro por secção.
   - Por linha (campo): radio Oculto / Ver / Editar (mantém modelo `permission_level`).
   - Acções rápidas por secção: "Tudo Editar / Ver / Ocultar".
   - Botão "Aplicar a outras roles" (copiar configuração da role activa).
   - Indicador de alterações pendentes + Guardar/Reverter.
3. **Aplicação real nos formulários de Produto** — criar hook `useProductFieldPermissions(role)` que devolve `getLevel(field)` e helpers `isHidden(field)` / `isReadOnly(field)`. Integrar em:
   - `CreateProductDialog` e `ProductDetailDialog` (web)
   - `MQPCWizard` / `MQPCStepDetails` (mobile quick-create)
   - `MobileProductDetailSheet`
   - Cada campo respeita: `hidden` (não renderiza), `view` (renderiza desativado), `edit` (normal).
4. **Defesa server-side** — trigger PostgreSQL `validate_product_field_permissions` em INSERT/UPDATE de `products`: para cada coluna alterada, verificar `field_permissions` da role do utilizador. Se `hidden` ou `view`, rejeitar a alteração (excepto owner/admin/super_admin). Garante que nenhum cliente pode contornar a UI.
5. **Auditoria** — registar alterações ao `field_permissions` em `activity_logs` (quem, quando, antes/depois) via trigger.

## Estrutura técnica

- **DB (migração)**:
  - Tabela `field_catalog` (workspace-agnóstica, seed): `object_key`, `field_key`, `label`, `section`, `data_type`, `sort_order`. Permite descobrir/expandir campos sem hard-code no frontend.
  - Trigger `tg_products_field_permissions` em `products` BEFORE INSERT/UPDATE.
  - Função `get_user_role_in_workspace(uuid, uuid)` (já pode existir; reutilizar).
  - Trigger `tg_field_permissions_audit` para `activity_logs`.
- **Frontend**:
  - `src/config/productFieldsCatalog.ts` — fonte única dos campos com secções e labels (também usada para popular `field_catalog`).
  - `src/hooks/useProductFieldPermissions.ts` — query `field_permissions` filtrada por role corrente + helpers.
  - `src/components/settings/security/ProductFieldPermissionsDialog.tsx` — novo diálogo dedicado com pesquisa, secções colapsáveis, copy entre roles.
  - Atualizar `FieldPermissionsDialog.tsx` para abrir o novo diálogo quando `selectedObject === "products"` (mantém os outros objectos como estão por agora).
  - Wrappers `<PermissionField level=...>` para reuso nos formulários de Produto.

## Plano de implementação

1. Migração: criar `field_catalog`, fazer seed dos campos de Produto, criar trigger de validação em `products` e trigger de auditoria em `field_permissions`.
2. Criar `productFieldsCatalog.ts` (espelho do seed, para UI).
3. Criar `useProductFieldPermissions` hook.
4. Construir `ProductFieldPermissionsDialog` com pesquisa, secções, ações em massa, copy entre roles.
5. Ligar o novo diálogo a partir de Definições → Segurança (e do botão "Permissões por Campo" quando o objecto é Produtos).
6. Integrar permissões em `CreateProductDialog`, `ProductDetailDialog`, `MQPCWizard`, `MobileProductDetailSheet` (campo a campo).
7. QA: validar com roles diferentes (admin, agent, viewer) — criar produto, editar, ver lista; validar mobile; validar que UPDATE bloqueado server-side devolve mensagem clara.

## Critérios de aceitação

- Admin vê todos os campos de Produto no diálogo, agrupados por secção, com pesquisa.
- Alterar para `hidden` esconde imediatamente o campo nos 4 formulários de Produto após refresh.
- Alterar para `view` torna o campo apenas leitura.
- Tentativa de UPDATE via API a um campo `hidden`/`view` é rejeitada pelo trigger.
- Owner ignora restrições; super_admin idem.
- Alterações no diálogo aparecem em `activity_logs`.
- Sem regressões nos outros objectos (Empresas, Contactos, Leads, Oportunidades, Propostas) — diálogo antigo continua disponível.

## Riscos e pontos por validar

- **Performance do trigger** em UPDATE de produtos — mitigar lendo `field_permissions` numa única query e iterando só sobre colunas em `OLD IS DISTINCT FROM NEW`.
- **Compatibilidade com importadores em massa** (ex.: `Product Import Pipeline`) — owner/admin não são afectados; importadores correm como service_role e devem continuar a passar (trigger ignora service_role).
- **Coexistência** com `profile_field_permissions` (por sales_function) — manter ambos por agora; alinhar numa fase 2.
- Confirmar com o utilizador se quer também aplicar este nível de detalhe a Empresas/Contactos/etc. agora, ou apenas Produtos primeiro (assumido **apenas Produtos** nesta entrega).
