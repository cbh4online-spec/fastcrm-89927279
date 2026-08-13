update public.products
set store_published = true,
    sheet_published = true,
    published_at = coalesce(published_at, now())
where id = '918dafb9-1785-4203-a2d6-0d26e20647eb';