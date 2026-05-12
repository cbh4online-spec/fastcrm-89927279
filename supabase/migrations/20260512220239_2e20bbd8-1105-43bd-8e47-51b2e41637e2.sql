INSERT INTO public.leadchef_message_templates (workspace_id, name, category, channel, body, variables, is_active, is_default, created_by)
SELECT DISTINCT t.workspace_id,
  'Lista de Compras Demo Bebé 4–6 meses'::text,
  'cooking_class_invite'::text,
  'whatsapp'::text,
  E'🛒 *Lista de Compras Demo Bebé 4–6 meses*\n\n🍚 *Cereais e Legumes Secos*\n☐ Arroz — 200 g\n\n🍎 *Frutas*\n☐ Banana — 30 g\n☐ Maçã — 780 g\n\n🫒 *Gorduras*\n☐ Azeite extra virgem — 6 c. chá\n\n🍼 *Laticínios*\n☐ Leite em pó para lactentes — 150 g\n\n🥬 *Legumes e Ervas Aromáticas*\n☐ Alface — 50 g\n☐ Batata — 300 g\n☐ Cebola — 200 g\n☐ Cenoura — 500 g'::text,
  '[]'::jsonb,
  true,
  true,
  NULL::uuid
FROM public.leadchef_message_templates t
WHERE NOT EXISTS (
  SELECT 1 FROM public.leadchef_message_templates x
  WHERE x.workspace_id = t.workspace_id
    AND x.name = 'Lista de Compras Demo Bebé 4–6 meses'
);