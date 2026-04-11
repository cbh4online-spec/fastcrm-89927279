INSERT INTO c2c_categories (workspace_id, name, slug, icon)
SELECT DISTINCT workspace_id, 'Animais', 'animais', 'PawPrint'
FROM c2c_categories
ON CONFLICT DO NOTHING;