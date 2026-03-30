insert into storage.buckets (id, name, public) values ('email-assets', 'email-assets', true) on conflict (id) do nothing;

create policy "Public read access for email-assets" on storage.objects for select using (bucket_id = 'email-assets');
create policy "Authenticated upload to email-assets" on storage.objects for insert to authenticated with check (bucket_id = 'email-assets');