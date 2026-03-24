INSERT INTO marketplace_modules (slug, name, tagline, description, category, status, pricing_model, icon, manifest_json)
VALUES 
  ('metodo-vision', 'Método Vision', 'Planeamento estratégico com metodologia Vision', 'Planeamento estratégico com metodologia Vision: visão, missão, valores, OKRs, sprints e accountability.', 'strategy', 'active', 'free', 'Target', '{"objects":[],"settings_pages":[],"feature_flags":["metodo_vision"]}'),
  ('security-ops', 'Security Ops', 'Gestão completa de segurança electrónica', 'Gestão completa de segurança electrónica: sites, clientes, parceiros, contratos e manutenção.', 'operations', 'active', 'free', 'Shield', '{"objects":[],"settings_pages":[],"feature_flags":["security_ops"]}')
ON CONFLICT (slug) DO NOTHING;