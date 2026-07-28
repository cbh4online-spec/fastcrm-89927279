WITH leg AS (
  SELECT id, issue_date, split_part(invoice_number, '/', 2) AS num
  FROM public.invoices
  WHERE workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7'
    AND saft_import_id IS NULL
    AND invoice_number ~ '^V[0-9]+/[0-9]+$'
), saf AS (
  SELECT issue_date, split_part(saft_invoice_no, '/', 2) AS num
  FROM public.invoices
  WHERE workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7'
    AND saft_import_id IS NOT NULL
), dup AS (
  SELECT l.id FROM leg l
  WHERE EXISTS (SELECT 1 FROM saf s WHERE s.num = l.num AND s.issue_date = l.issue_date)
    AND NOT EXISTS (SELECT 1 FROM public.invoice_payments p WHERE p.invoice_id = l.id)
)
DELETE FROM public.invoices i USING dup WHERE i.id = dup.id;