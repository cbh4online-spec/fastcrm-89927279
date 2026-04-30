-- Creditar manualmente os 1000 créditos pagos via pi_3TRyCwQpSN9dntDn0QR7Jmf0
UPDATE public.credit_wallets
SET balance = balance + 1000,
    updated_at = now()
WHERE workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7';

-- Lançamento no ledger para auditoria
INSERT INTO public.credit_ledger (
  workspace_id, user_id, action_key, module,
  credits_amount, direction, status, description,
  reference_type, reference_id, metadata
) VALUES (
  '0662fc16-6286-4156-a908-08c7dfec0fb7',
  '6f5c7fad-6ed3-42ee-811e-f56caec5ad66',
  'credit_purchase',
  'billing',
  1000,
  'credit',
  'completed',
  'Compra de 1000 créditos (recuperação manual - Stripe pi_3TRyCwQpSN9dntDn0QR7Jmf0)',
  'purchase',
  '14efa93d-384c-4197-890d-ba47068f7ebd',
  jsonb_build_object('payment_intent_id','pi_3TRyCwQpSN9dntDn0QR7Jmf0','amount_paid',69.00,'manual_recovery',true)
);