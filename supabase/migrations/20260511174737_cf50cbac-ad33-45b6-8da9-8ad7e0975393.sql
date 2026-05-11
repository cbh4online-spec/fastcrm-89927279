ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS payment_link_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_link_template text NOT NULL DEFAULT 'Olá {{customer_name}}! 💳 Pode efectuar o pagamento da fatura {{invoice_number}} ({{amount}}) através deste link seguro: {{link}}';
