-- Remover importação SAF-T 2023 presa em "uploaded" (análise nunca completou)
DELETE FROM public.saft_import_items WHERE import_id = '783e4537-75cf-429c-8de5-fdc53525394f';
DELETE FROM public.saft_imports WHERE id = '783e4537-75cf-429c-8de5-fdc53525394f';