-- O upsert via Data API exige o privilégio SELECT; a leitura efetiva continua limitada pelas políticas RLS.
GRANT SELECT ON public.store_visitor_sessions TO anon;
