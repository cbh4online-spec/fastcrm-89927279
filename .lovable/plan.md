

## Links de Pagamento, Email e Alertas no Módulo de Renovações

### Visão geral

Três funcionalidades interligadas para o módulo de renovações: gerar links de pagamento Stripe por contrato, enviar emails de renovação com o compositor interno, e alertas automáticos para o utilizador e para o cliente.

---

### 1. Links de Pagamento Stripe

**Edge Function `create-renewal-payment-link`**
- Recebe `contract_id`, `workspace_id` e opcionalmente `item_ids`
- Busca a chave Stripe do workspace em `workspace_stripe_config` (já existe)
- Cria um `payment_link` ou `checkout session` no Stripe com os itens/valores do contrato
- Retorna o URL do link de pagamento
- Regista um evento `invoice_sent` no `renewal_events`

**UI na RenewalDetailPage**
- Botão "Gerar Link de Pagamento" no header e na tab de Faturação
- Dialog para selecionar itens a cobrar (todos ou específicos)
- Mostra o link gerado com botão de copiar
- Opção de enviar diretamente por email (abre o ComposeEmailDialog com o link embebido)
- Histórico de links gerados na tab Faturação (substitui o placeholder atual)

---

### 2. Integração com Email

**ComposeEmailDialog na RenewalDetailPage**
- Botão "Enviar Email" no header do contrato
- Pré-preenche destinatário com o contacto do contrato
- Contexto da entidade: `entityType: 'contact'`, `entityId: contract.contact_id`
- Subject sugerido: "Renovação — {empresa} — {data_renovação}"

**Template de email de renovação**
- Criação de um template reutilizável para renovações
- Variáveis: nome do cliente, empresa, lista de itens, valor, data de renovação, link de pagamento
- Botão no compositor para inserir o template
- Integração com o link de pagamento gerado

---

### 3. Sistema de Alertas Automáticos

**Edge Function `renewal-alert-email`**
- Recebe `contract_id`, `alert_type` (30d, 15d, 7d, 1d, overdue), `recipients` (user/client/both)
- Envia email formatado ao utilizador (owner do contrato) e/ou ao cliente (contacto do contrato)
- Para o **utilizador**: alerta interno ("Contrato X da empresa Y renova em 7 dias")
- Para o **cliente**: comunicação profissional ("A sua renovação está próxima — clique aqui para renovar")
- Regista o envio para evitar duplicados

**Configuração por contrato**
- Na RenewalDetailPage, nova secção "Alertas" ou dentro da tab Resumo
- Checkboxes: alertas a 30d, 15d, 7d, 1d, no vencimento
- Toggle: enviar ao utilizador / ao cliente / ambos
- Armazenamento em `meta_json` ou nova coluna no `renewal_contracts`

**Integração com scheduler**
- O job `daily-renewal-check` (já existe no Trigger.dev) passa a invocar `renewal-alert-email` quando encontra contratos nos thresholds configurados
- Verificação de dedup para não enviar alertas repetidos

---

### Ficheiros a criar/alterar

| Ficheiro | Ação |
|---|---|
| `supabase/functions/create-renewal-payment-link/index.ts` | **Novo** — edge function Stripe |
| `supabase/functions/renewal-alert-email/index.ts` | **Novo** — edge function alertas |
| `src/pages/RenewalDetailPage.tsx` | Adicionar botões de pagamento, email e configuração de alertas |
| `src/hooks/useRenewals.ts` | Adicionar mutations para pagamento e alertas |
| `src/components/renewals/RenewalPaymentDialog.tsx` | **Novo** — dialog para gerar link de pagamento |
| `src/components/renewals/RenewalAlertSettings.tsx` | **Novo** — configuração de alertas por contrato |
| `src/components/renewals/RenewalBillingTab.tsx` | **Novo** — tab de faturação funcional com histórico |

### Migração de base de dados

- Adicionar coluna `alert_settings` (JSONB) ao `renewal_contracts` para configuração de alertas
- Criar tabela `renewal_payment_links` para histórico de links gerados (contract_id, stripe_url, amount, status, created_at)
- Criar tabela `renewal_alert_log` para dedup de alertas enviados

