
CREATE TABLE public.capture_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capture_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read capture_types"
  ON public.capture_types FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.capture_types (key, label, description, icon) VALUES
  ('lead_form', 'Formulário de Lead', 'Captura nome, email e telefone do visitante para criar um lead no CRM', 'file-text'),
  ('email_optin', 'Opt-in de Email', 'Captura apenas o email para subscrição de newsletter ou sequência de emails', 'mail'),
  ('quiz', 'Quiz / Questionário', 'Qualifica o visitante através de perguntas antes de capturar os dados', 'help-circle'),
  ('booking', 'Agendamento', 'Permite ao visitante agendar uma reunião ou consulta directamente', 'calendar'),
  ('phone_call', 'Pedido de Contacto', 'Captura telefone e horário preferido para callback', 'phone'),
  ('download', 'Download de Material', 'Oferece ebook, checklist ou recurso em troca dos dados de contacto', 'download'),
  ('webinar', 'Inscrição Webinar', 'Regista o visitante num webinar ou evento online', 'video'),
  ('trial', 'Pedido de Trial/Demo', 'Formulário para solicitar período experimental ou demonstração do produto', 'play'),
  ('survey', 'Inquérito', 'Recolhe feedback ou dados de mercado através de formulário estruturado', 'clipboard-list'),
  ('whatsapp', 'Captura WhatsApp', 'Inicia conversa no WhatsApp após capturar o número do visitante', 'message-circle'),
  ('checkout', 'Checkout Rápido', 'Captura dados de pagamento para venda directa no funil', 'credit-card'),
  ('waitlist', 'Lista de Espera', 'Regista interesse para produto/serviço ainda não disponível', 'clock');
