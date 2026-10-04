UPDATE public.invoices SET issue_date = '2026-08-29' WHERE id = '57665972-cce5-4822-a872-5acc30c6a3a2' AND issue_date = '0008-09-29';
UPDATE public.invoices SET issue_date = make_date(extract(year from due_date)::int, extract(month from issue_date)::int, extract(day from issue_date)::int)
WHERE issue_date < '1900-01-01' AND due_date >= '1900-01-01';