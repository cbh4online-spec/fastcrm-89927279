// Shared select column constants for Supabase queries
// Avoids .select("*") — only fetches columns actually used by hooks/components

export const LEADS_SELECT_COLUMNS = `
  id, workspace_id, name, email, phone, source, status, tags,
  created_at, updated_at, last_contact_at,
  ai_temperature, lead_score, ai_next_action, ai_next_action_type,
  ai_insight, ai_lead_type, estimated_value, conversion_probability,
  ai_analyzed_at, assigned_to, automation_active, company_name,
  address, address_number, address_floor, city, county, parish, region,
  postal_code, country, tax_id,
  website, business_category, cae_description, capital_social,
  legal_nature, external_email, external_username, linkedin_url,
  facebook_url, instagram_url, twitter_url, fax, company_status,
  services, cae_codes, lead_type, avatar_url, notes,
  instagram_followers_count, instagram_following_count, instagram_posts_count,
  instagram_bio, instagram_external_url, instagram_category, instagram_is_verified,
  instagram_is_business, instagram_enriched_at, inferred_type, inferred_profession,
  inferred_specialty, inferred_workplace, confidence_score, lead_score_explanation,
  lead_score_factors, prospecting_profile_id, industry, number_of_employees,
   annual_revenue, contact_person, contact_person_role, founding_date,
   about, activity_description, racius_url, external_instagram_id,
   external_whatsapp_id, icp_fit_score, engagement_score, pare_score, created_by,
   youtube_url, tiktok_url, pinterest_url, whatsapp_url,
   is_blocked, block_reason, archived_at, archive_reason
`;

export const ACTIVITIES_SELECT_COLUMNS = `
  id, workspace_id, entity_type, entity_id, activity_type,
  title, description, metadata, created_at, performed_by,
  updated_at, company_id, contact_id, lead_id, opportunity_id,
  conversation_id, automation_rule_id
`;

export const CHANGE_EVENTS_SELECT_COLUMNS = `
  id, workspace_id, change_type, entity_kind, entity_id,
  old_value, new_value, created_at
`;

export const KPI_SNAPSHOTS_SELECT_COLUMNS = `
  id, workspace_id, metric_key, metric_value, snapshot_date
`;

export const COMPANY_AUDIT_LOG_SELECT_COLUMNS = `
  id, workspace_id, company_id, changed_by, changed_at,
  field_name, old_value, new_value
`;

export const LEAD_AUDIT_LOG_SELECT_COLUMNS = `
  id, workspace_id, lead_id, changed_by, changed_at,
  field_name, old_value, new_value
`;

export const COMPANY_DUPLICATE_CHECK_COLUMNS = `
  id, name, email, website, tax_id, workspace_id
`;

export const COMPANY_DUPLICATE_GROUPS_COLUMNS = `
  id, name, email, website, tax_id, workspace_id,
  created_at, industry, size, deleted_at, domain
`;

export const CLIENT_TICKET_SELECT_COLUMNS = `
  id, workspace_id, subject, description, type, priority, status,
  client_user_id, company_id, assigned_to, tags, source,
  satisfaction_rating, satisfaction_comment,
  created_at, updated_at, resolved_at, closed_at
`;

// Forecasts & Reports — per-table selects
export const FORECAST_OPPORTUNITIES_SELECT = `
  id, value, status, probability, updated_at, created_at, expected_close_date, stage_id, workspace_id
`;

export const FORECAST_CONTACTS_SELECT = `
  id, name, email, client_status, last_contact_at, created_at, updated_at, workspace_id, total_revenue
`;

export const FORECAST_CONTACT_PRODUCTS_SELECT = `
  id, product_id, contact_id, company_id, workspace_id, status,
  purchased_quantity, consumed_quantity, acquisition_date, expiry_date,
  total_value, quantity, unit_price
`;

export const FORECAST_CONTACT_PRODUCTS_WITH_PRODUCT_SELECT = `
  id, product_id, contact_id, company_id, workspace_id, status,
  purchased_quantity, consumed_quantity, acquisition_date, expiry_date,
  total_value, quantity, unit_price,
  products(id, name, consumption_model)
`;

export const FORECAST_PRODUCTS_SELECT = `
  id, name, sku, category, price, workspace_id, consumption_model
`;
