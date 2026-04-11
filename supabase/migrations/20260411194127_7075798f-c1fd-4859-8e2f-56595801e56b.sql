
-- 1. Insert "Tecnologia" category for each workspace that has any of the 3 old categories
INSERT INTO c2c_categories (workspace_id, name, slug, icon)
SELECT DISTINCT workspace_id, 'Tecnologia', 'tecnologia', 'Cpu'
FROM c2c_categories
WHERE name IN ('Electrónica', 'Informática', 'Telemóveis')
ON CONFLICT DO NOTHING;

-- 2. Update listings: reassign category_id from old categories to the new "Tecnologia" category in the same workspace
UPDATE c2c_listings l
SET category_id = t.id
FROM c2c_categories old_cat,
     c2c_categories t
WHERE l.category_id = old_cat.id
  AND old_cat.name IN ('Electrónica', 'Informática', 'Telemóveis')
  AND t.workspace_id = old_cat.workspace_id
  AND t.slug = 'tecnologia'
  AND t.name = 'Tecnologia';

-- 3. Delete the old categories
DELETE FROM c2c_categories
WHERE name IN ('Electrónica', 'Informática', 'Telemóveis');
