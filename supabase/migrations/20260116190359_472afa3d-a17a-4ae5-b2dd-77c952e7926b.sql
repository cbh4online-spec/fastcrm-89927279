-- Insert marketplace modules from SAMPLE_MODULES
-- This ensures modules are available in the database for workspace subscriptions

INSERT INTO marketplace_modules (
  id, slug, name, tagline, description, category, icon, 
  target_audience, expected_results, use_cases,
  internal_type, status, version, embedded_config, permissions, pricing,
  publisher, is_featured, is_new, rating, reviews_count, installs_count,
  created_at, updated_at, published_at
) VALUES 
-- IMO AI
(
  gen_random_uuid(), 'imo-ai', 'IMO AI', 
  'Inteligência artificial para imobiliárias',
  'Automatize a qualificação de leads imobiliários, gere descrições de imóveis e responda a clientes 24/7 com IA especializada no setor.',
  'real_estate', 'Home',
  'Agências imobiliárias, corretores e promotores',
  '["80% menos tempo em qualificação de leads", "Respostas instantâneas 24/7", "Descrições de imóveis em segundos"]'::jsonb,
  '["Qualificar leads automaticamente", "Gerar descrições de imóveis", "Responder a perguntas frequentes", "Agendar visitas automaticamente"]'::jsonb,
  'embedded_app', 'active', '2.1.0',
  '{"app_url": "https://imo-ai.fastcrm.app", "access_method": "embed", "sso_enabled": true, "sso_provider": "jwt", "context_includes": {"workspace_id": true, "user_id": true, "user_email": true, "user_role": true, "permissions": true, "theme": true, "language": true}, "iframe_settings": {"allow_fullscreen": true, "allow_camera": false, "allow_microphone": true, "sandbox_flags": ["allow-scripts", "allow-same-origin", "allow-forms"]}}'::jsonb,
  '{"data_permissions": [{"entity": "leads", "read": true, "write": true, "delete": false}, {"entity": "contacts", "read": true, "write": true, "delete": false}, {"entity": "opportunities", "read": true, "write": true, "delete": false}, {"entity": "products", "read": true, "write": false, "delete": false}], "workspace_isolation": true, "can_send_emails": true, "can_send_whatsapp": true, "can_create_activities": true, "can_trigger_automations": true}'::jsonb,
  '{"type": "credits", "base_price": 49, "currency": "EUR", "credits_included": 1000, "price_per_credit": 0.05, "trial_days": 14, "trial_credits": 100}'::jsonb,
  'FastCRM', true, false, 4.8, 127, 1250,
  '2024-01-15T00:00:00Z', '2025-01-10T00:00:00Z', '2024-02-01T00:00:00Z'
),
-- Lead Enricher Pro
(
  gen_random_uuid(), 'lead-enricher', 'Lead Enricher Pro',
  'Enriqueça leads com dados empresariais',
  'Obtenha automaticamente informações completas sobre empresas: NIF, CAE, dimensão, contactos e redes sociais a partir de um simples email ou domínio.',
  'prospecting', 'Search',
  'Equipas de vendas B2B e marketing',
  '["Dados completos em segundos", "90% de precisão nos dados", "+40% conversão com leads qualificados"]'::jsonb,
  '["Enriquecer leads de formulários", "Completar dados de empresas", "Validar informações de contacto", "Identificar decisores"]'::jsonb,
  'ai_service', 'active', '1.5.0',
  NULL,
  '{"data_permissions": [{"entity": "leads", "read": true, "write": true, "delete": false}, {"entity": "contacts", "read": true, "write": true, "delete": false}, {"entity": "companies", "read": true, "write": true, "delete": false}], "workspace_isolation": true, "can_send_emails": false, "can_send_whatsapp": false, "can_create_activities": true, "can_trigger_automations": true}'::jsonb,
  '{"type": "usage_based", "base_price": 29, "currency": "EUR", "usage_unit": "enriquecimento", "price_per_unit": 0.10, "included_units": 200, "trial_days": 7, "trial_credits": 50}'::jsonb,
  'FastCRM', true, true, 4.6, 89, 890,
  '2024-06-01T00:00:00Z', '2025-01-12T00:00:00Z', '2024-06-15T00:00:00Z'
),
-- WhatsApp Business API
(
  gen_random_uuid(), 'whatsapp-business', 'WhatsApp Business API',
  'WhatsApp oficial para empresas',
  'Conecte o WhatsApp Business API ao seu CRM. Envie mensagens em massa, automatize respostas e mantenha conversas organizadas.',
  'communication', 'MessageSquare',
  'Empresas com alto volume de comunicação',
  '["Mensagens ilimitadas", "Templates aprovados pelo WhatsApp", "Histórico completo no CRM"]'::jsonb,
  '["Enviar notificações de pedidos", "Follow-ups automáticos", "Suporte ao cliente", "Campanhas de marketing"]'::jsonb,
  'connector', 'active', '3.0.0',
  NULL,
  '{"data_permissions": [{"entity": "conversations", "read": true, "write": true, "delete": false}, {"entity": "contacts", "read": true, "write": true, "delete": false}, {"entity": "templates", "read": true, "write": false, "delete": false}], "workspace_isolation": true, "can_send_emails": false, "can_send_whatsapp": true, "can_create_activities": true, "can_trigger_automations": true}'::jsonb,
  '{"type": "fixed_monthly", "base_price": 79, "currency": "EUR", "trial_days": 14}'::jsonb,
  'FastCRM', false, false, 4.9, 234, 2100,
  '2023-09-01T00:00:00Z', '2025-01-08T00:00:00Z', '2023-09-15T00:00:00Z'
),
-- AI Sales Coach
(
  gen_random_uuid(), 'ai-sales-coach', 'AI Sales Coach',
  'O seu coach de vendas pessoal com IA',
  'Receba feedback em tempo real sobre suas chamadas de vendas, sugestões de resposta e análise de sentimento do cliente.',
  'ai', 'Brain',
  'Equipas de vendas e gestores comerciais',
  '["+25% taxa de fecho", "Feedback instantâneo", "Formação contínua da equipa"]'::jsonb,
  '["Análise de chamadas", "Sugestões de resposta", "Coaching personalizado", "Previsão de fecho"]'::jsonb,
  'ai_service', 'active', '1.2.0',
  NULL,
  '{"data_permissions": [{"entity": "opportunities", "read": true, "write": true, "delete": false}, {"entity": "conversations", "read": true, "write": false, "delete": false}], "workspace_isolation": true, "can_send_emails": false, "can_send_whatsapp": false, "can_create_activities": true, "can_trigger_automations": false}'::jsonb,
  '{"type": "credits", "base_price": 99, "currency": "EUR", "credits_included": 500, "price_per_credit": 0.20, "trial_days": 14, "trial_credits": 50}'::jsonb,
  'FastCRM', true, true, 4.7, 45, 320,
  '2024-10-01T00:00:00Z', '2025-01-14T00:00:00Z', '2024-10-15T00:00:00Z'
),
-- Email Marketing Pro
(
  gen_random_uuid(), 'email-campaigns', 'Email Marketing Pro',
  'Campanhas de email que convertem',
  'Crie, envie e analise campanhas de email marketing diretamente do seu CRM. Templates profissionais e automações incluídas.',
  'marketing', 'Mail',
  'Equipas de marketing e vendas',
  '["Campanhas em minutos", "Taxas de abertura +30%", "Automações ilimitadas"]'::jsonb,
  '["Newsletters", "Campanhas promocionais", "Sequências de nurturing", "Emails transacionais"]'::jsonb,
  'native_feature', 'active', '2.0.0',
  NULL,
  '{"data_permissions": [{"entity": "contacts", "read": true, "write": false, "delete": false}, {"entity": "leads", "read": true, "write": false, "delete": false}, {"entity": "templates", "read": true, "write": true, "delete": true}], "workspace_isolation": true, "can_send_emails": true, "can_send_whatsapp": false, "can_create_activities": true, "can_trigger_automations": true}'::jsonb,
  '{"type": "usage_based", "base_price": 19, "currency": "EUR", "usage_unit": "email", "price_per_unit": 0.001, "included_units": 5000, "trial_days": 14}'::jsonb,
  'FastCRM', false, false, 4.5, 178, 1560,
  '2023-06-01T00:00:00Z', '2025-01-05T00:00:00Z', '2023-06-15T00:00:00Z'
),
-- Zapier
(
  gen_random_uuid(), 'zapier-integration', 'Zapier',
  'Conecte milhares de aplicações',
  'Integre o FastCRM com mais de 5000 aplicações através do Zapier. Automatize fluxos de trabalho sem código.',
  'integrations', 'Zap',
  'Qualquer utilizador que precise de integrações',
  '["5000+ integrações disponíveis", "Sem necessidade de código", "Configuração em minutos"]'::jsonb,
  '["Sincronizar com Google Sheets", "Notificações no Slack", "Criar tarefas no Asana", "Adicionar a listas de email"]'::jsonb,
  'connector', 'active', '1.0.0',
  NULL,
  '{"data_permissions": [{"entity": "leads", "read": true, "write": true, "delete": false}, {"entity": "contacts", "read": true, "write": true, "delete": false}, {"entity": "companies", "read": true, "write": true, "delete": false}, {"entity": "opportunities", "read": true, "write": true, "delete": false}], "workspace_isolation": true, "can_send_emails": false, "can_send_whatsapp": false, "can_create_activities": true, "can_trigger_automations": true}'::jsonb,
  '{"type": "free", "base_price": 0, "currency": "EUR"}'::jsonb,
  'Zapier', false, false, 4.4, 312, 3200,
  '2023-03-01T00:00:00Z', '2024-12-20T00:00:00Z', '2023-03-15T00:00:00Z'
),
-- Google Local Services
(
  gen_random_uuid(), 'google-local-services', 'Google Local Services',
  'Prospecção inteligente com dados do Google Places',
  'Pesquise e importe dados de empresas locais diretamente do Google. Obtenha automaticamente nome, rating, avaliações, morada, telefone, website, horários, serviços e imagens para enriquecer os seus leads e contactos.',
  'prospecting', 'MapPin',
  'Equipas de vendas B2B, agências de marketing local e empresas de serviços',
  '["Prospecção 10x mais rápida", "Dados de contacto verificados pelo Google", "Enriquecimento automático de leads", "+50% mais leads qualificados por mês"]'::jsonb,
  '["Encontrar empresas por localização e setor", "Enriquecer leads com dados do Google", "Analisar concorrência local", "Importar avaliações e ratings", "Descobrir serviços oferecidos"]'::jsonb,
  'connector', 'active', '1.0.0',
  NULL,
  '{"data_permissions": [{"entity": "leads", "read": true, "write": true, "delete": false}, {"entity": "contacts", "read": true, "write": true, "delete": false}, {"entity": "companies", "read": true, "write": true, "delete": false}], "workspace_isolation": true, "can_send_emails": false, "can_send_whatsapp": false, "can_create_activities": true, "can_trigger_automations": true}'::jsonb,
  '{"type": "credits", "base_price": 39, "currency": "EUR", "usage_unit": "pesquisa", "price_per_unit": 0.05, "credits_included": 500, "price_per_credit": 0.08, "trial_days": 7, "trial_credits": 50}'::jsonb,
  'FastCRM', true, true, 4.7, 42, 380,
  '2025-01-10T00:00:00Z', '2025-01-16T00:00:00Z', '2025-01-15T00:00:00Z'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  target_audience = EXCLUDED.target_audience,
  expected_results = EXCLUDED.expected_results,
  use_cases = EXCLUDED.use_cases,
  internal_type = EXCLUDED.internal_type,
  status = EXCLUDED.status,
  version = EXCLUDED.version,
  embedded_config = EXCLUDED.embedded_config,
  permissions = EXCLUDED.permissions,
  pricing = EXCLUDED.pricing,
  publisher = EXCLUDED.publisher,
  is_featured = EXCLUDED.is_featured,
  is_new = EXCLUDED.is_new,
  rating = EXCLUDED.rating,
  reviews_count = EXCLUDED.reviews_count,
  installs_count = EXCLUDED.installs_count,
  updated_at = now();