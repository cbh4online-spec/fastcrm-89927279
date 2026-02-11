
# Enviar Email de Teste ao Vendedor Strongadget

## O que vai ser feito

Criar uma edge function utilitaria `send-c2c-seller-email` que permite enviar (ou reenviar) o email de confirmacao a qualquer vendedor C2C aprovado.

## Dados do email de teste

- **Destinatario**: strongadget@gmail.com (Strongadget)
- **Link no email**: `https://fastcrm.metodopare.ai/c2c/metodopare/seller/b4500cb5-3a74-4f7e-b4dc-d48bd528054e`
- **Assunto**: "Conta ativada - Bem-vindo ao METODOPARE!"

## Alteracoes tecnicas

### 1. Nova edge function: `supabase/functions/send-c2c-seller-email/index.ts`

Funcao simples que:
- Recebe `seller_id` e `workspace_id` no body
- Busca os dados do vendedor, workspace e store_settings
- Reutiliza o mesmo template HTML de confirmacao (copiado do activate)
- Envia o email via Resend

### 2. Testar imediatamente

Apos deploy, chamar a funcao com os dados do Strongadget para enviar o email de teste.

### Ficheiros a criar

- `supabase/functions/send-c2c-seller-email/index.ts` (nova edge function)
