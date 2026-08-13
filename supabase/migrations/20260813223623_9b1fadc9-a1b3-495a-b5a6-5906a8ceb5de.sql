-- Public-safe projection of store settings for the storefront (no tokens/emails).
create or replace view public.public_store_settings
with (security_invoker = off) as
select
  s.id,
  s.workspace_id,
  s.store_name,
  s.store_description,
  s.logo_url,
  s.banner_url,
  s.primary_color,
  s.accent_color,
  s.footer_text,
  s.show_categories,
  s.show_search,
  s.store_slug,
  s.custom_domain,
  s.prices_include_vat,
  s.vat_rate,
  s.c2c_enabled,
  s.c2c_allow_mixed_cart,
  s.payment_methods,
  s.bank_transfer_details,
  s.facebook_pixel_id,
  s.product_page_config,
  s.created_at,
  s.updated_at
from public.store_settings s;

revoke all on public.public_store_settings from anon, authenticated;
grant select on public.public_store_settings to anon, authenticated;