

# Sistema Automatizado de Templates de Email B2B

## Problema Atual

O portal B2B só tem **1 template**: `client_invitation`. Falta cobertura para todo o ciclo de vida das encomendas e interações com clientes. Cada email é enviado manualmente ou não é enviado de todo.

## Plano

### 1. Novos Tipos de Template

Adicionar à tabela `workspace_email_templates` os seguintes tipos (migração SQL para expandir os `template_type` aceites):

| Template | Trigger Automático |
|---|---|
| `order_confirmation` | Cliente submete encomenda |
| `order_approved` | Admin aprova encomenda |
| `order_rejected` | Admin rejeita encomenda |
| `order_shipped` | Status muda para "shipped" |
| `order_delivered` | Status muda para "delivered" |
| `payment_reminder` | 3 dias antes do vencimento |
| `welcome_client` | Primeiro login do cliente |
| `price_list_update` | Preços atualizados no catálogo |
| `reorder_reminder` | 30 dias sem encomenda |
| `account_summary` | Resumo mensal automático |

### 2. Editor de Templates Expandido

Substituir a secção "Emails" na página do Portal B2B por um sistema completo:

- **Lista de todos os templates** com status (ativo/inativo), preview e toggle de envio automático
- **Editor inline** para cada template: assunto, corpo com variáveis (`{{client_name}}`, `{{order_number}}`, `{{total}}`, `{{tracking_url}}`), cores herdadas do branding
- **Preview em tempo real** com dados de exemplo
- **Botão "Enviar Teste"** para o admin receber o email no próprio email

**Ficheiro**: Novo `src/components/b2b-portal/B2BEmailTemplatesManager.tsx`

### 3. Motor de Envio Automático

Expandir as edge functions existentes para disparar emails nos momentos certos:

- **`order-note-submit`**: Após submissão → enviar `order_confirmation` ao cliente
- **`order-note-notify`**: Após aprovação/rejeição → enviar `order_approved` ou `order_rejected`
- **Nova lógica**: No update de status de encomenda → enviar `order_shipped` / `order_delivered`
- **Templates default**: Cada tipo tem um template default profissional, mesmo sem personalização

Criar **`supabase/functions/b2b-send-lifecycle-email/index.ts`** — função genérica que:
1. Recebe `{ workspaceId, templateType, recipientEmail, variables }`
2. Busca o template customizado ou usa o default
3. Substitui variáveis e envia via Resend

### 4. Dashboard de Emails no Portal B2B

Na tab "Emails" do `B2BPortalSettingsPage`:

- **Grid de templates** com cards para cada tipo, mostrando: nome, descrição, status (ativo/desativado), último envio, total enviados
- **Toggle de automação** por template: ativar/desativar envio automático
- **Variáveis disponíveis** listadas por template
- **Indicador "Personalizado"** vs "Default" para cada template

### Ficheiros

| Ficheiro | Ação |
|---|---|
| Migração SQL | **Criar** — Novos template_types e campos (subject, body_template, is_auto, variables_schema) |
| `src/components/b2b-portal/B2BEmailTemplatesManager.tsx` | **Criar** — UI completa de gestão |
| `src/components/b2b-portal/B2BEmailTemplateEditor.tsx` | **Criar** — Editor individual com preview |
| `supabase/functions/b2b-send-lifecycle-email/index.ts` | **Criar** — Motor genérico de envio |
| `supabase/functions/order-note-submit/index.ts` | **Editar** — Trigger order_confirmation |
| `supabase/functions/order-note-notify/index.ts` | **Editar** — Trigger approved/rejected |
| `src/pages/B2BPortalSettingsPage.tsx` | **Editar** — Substituir tab Emails |
| `src/hooks/useB2BEmailTemplates.ts` | **Criar** — CRUD de templates |

### Detalhe Técnico

```text
-- Nova tabela ou expansão da existente
ALTER TABLE workspace_email_templates 
  ADD COLUMN IF NOT EXISTS subject_template text,
  ADD COLUMN IF NOT EXISTS body_template text,
  ADD COLUMN IF NOT EXISTS is_auto_send boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS variables_schema jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS send_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

Variáveis por template:
  order_confirmation → {{client_name}}, {{order_number}}, {{total}}, {{items_count}}
  order_approved     → {{client_name}}, {{order_number}}, {{estimated_delivery}}
  order_shipped      → {{client_name}}, {{order_number}}, {{tracking_url}}
  payment_reminder   → {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}
  reorder_reminder   → {{client_name}}, {{last_order_date}}, {{top_products}}
```

O sistema operará autonomamente: quando uma encomenda é submetida, aprovada, expedida ou entregue, o email correspondente é enviado automaticamente se o template estiver ativo.

