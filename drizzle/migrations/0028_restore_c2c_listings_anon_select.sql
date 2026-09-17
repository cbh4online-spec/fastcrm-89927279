-- A leitura pública de anúncios já está limitada por RLS a activos+aprovados;
-- restaurar o SELECT ao nível da tabela para anon evita quebrar consultas "select *".
GRANT SELECT ON public.c2c_listings TO anon;