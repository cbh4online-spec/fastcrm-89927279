UPDATE public.invoices
SET status = 'cancelled',
    notes = coalesce(notes,'') || ' | Anulada: duplicada da fatura Stripe (contrato com subscrição Stripe).'
WHERE renewal_contract_id = '4d75e0ac-935b-46d5-a4ec-307dde9352c3'
  AND external_provider IS NULL
  AND id IN ('4a74633b-ead2-466e-aea7-970fc6b2136f','3606a814-fa9b-49d9-b621-0ba9d1eb12af','c77d3e4f-736f-42a1-add2-2e60438423d4','584383e1-29ce-4888-b3a1-2229313440fd');