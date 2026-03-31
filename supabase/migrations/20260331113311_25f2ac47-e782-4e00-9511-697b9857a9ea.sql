
-- Register hr-management module in marketplace_modules
INSERT INTO public.marketplace_modules (slug, name, tagline, description, category, icon, internal_type, status, version, is_featured, is_new)
VALUES (
  'hr-management',
  'Recursos Humanos',
  'Gestão completa de RH: funcionários, ponto, turnos e ausências',
  'Módulo de gestão de recursos humanos com controlo de ponto via QR, gestão de turnos, férias e ausências, e dashboard analítico.',
  'operations',
  'Users',
  'embedded',
  'active',
  '1.0.0',
  false,
  true
);

-- Auto-activate for all existing workspaces
INSERT INTO public.workspace_modules (workspace_id, module_id, status, subscribed_by)
SELECT w.id, mm.id, 'active', '444ba746-3e86-4283-a363-ad2b27b81dc9'
FROM workspaces w
CROSS JOIN marketplace_modules mm
WHERE mm.slug = 'hr-management'
ON CONFLICT DO NOTHING;
