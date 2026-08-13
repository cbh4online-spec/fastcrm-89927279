update public.store_settings
set store_slug = 'metodopare'
where workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f'
  and store_slug is null
  and not exists (select 1 from public.store_settings s2 where s2.store_slug = 'metodopare');