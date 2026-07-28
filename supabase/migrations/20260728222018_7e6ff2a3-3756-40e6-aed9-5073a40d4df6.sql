-- 1) Recalcular subtotal/IVA/total a partir das linhas, onde o subtotal ficou com o bruto
WITH agg AS (
  SELECT i.id,
         round(sum(it.net_total)::numeric, 2)   AS lnet,
         round(sum(it.gross_total)::numeric, 2) AS lgross
  FROM public.invoices i
  JOIN public.invoice_items it ON it.invoice_id = i.id
  WHERE i.workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7'
    AND i.saft_import_id IS NOT NULL
  GROUP BY i.id
)
UPDATE public.invoices i
SET subtotal = a.lnet,
    tax_amount = round((a.lgross - a.lnet)::numeric, 2),
    total = a.lgross,
    updated_at = now()
FROM agg a
WHERE i.id = a.id
  AND a.lgross > a.lnet
  AND abs(i.subtotal - a.lgross) <= 0.02;

-- 2) Remover duplicados legados (numeração curta) que repetem documentos do SAF-T
WITH leg AS (
  SELECT id, issue_date, total, split_part(invoice_number, '/', 2) AS num
  FROM public.invoices
  WHERE workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7'
    AND saft_import_id IS NULL
    AND invoice_number ~ '^V[0-9]+/[0-9]+$'
), saf AS (
  SELECT issue_date, total, split_part(saft_invoice_no, '/', 2) AS num
  FROM public.invoices
  WHERE workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7'
    AND saft_import_id IS NOT NULL
), dup AS (
  SELECT l.id
  FROM leg l
  WHERE EXISTS (
    SELECT 1 FROM saf s
    WHERE s.num = l.num
      AND s.issue_date = l.issue_date
      AND abs(s.total - l.total) <= 0.02
  )
  AND NOT EXISTS (SELECT 1 FROM public.invoice_payments p WHERE p.invoice_id = l.id)
)
DELETE FROM public.invoices i USING dup WHERE i.id = dup.id;

-- 3) Reconciliar recibos -> amount_paid / status
SELECT public.reconcile_invoice_payments('0662fc16-6286-4156-a908-08c7dfec0fb7'::uuid);