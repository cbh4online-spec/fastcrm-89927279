# Integração ifthenpay — Workspace Pharliss

## Diagnóstico

A ifthenpay é um agregador de pagamentos PT que oferece Multibanco (referência), MB WAY, Payshop, Cartão de Crédito e Pix. A integração assenta em 3 pilares:

1. **Geração de pedido de pagamento** (server-to-server, com chaves específicas por método).
2. **Callback anti-phishing** (GET enviado pela ifthenpay quando o pagamento é confirmado).
3. **Configuração por workspace** (cada workspace pode ter as suas próprias chaves — neste caso, Pharliss).

Ainda não existe nada no FastCRM relacionado com ifthenpay (verifiquei `supabase/functions/` e `src/`). Vamos construir multi-tenant desde o início, para reaproveitar noutros workspaces no futuro.

## Decisões de produto/UX

- **Multi-tenant**: configuração por `workspace_id`, não global. Pharliss será apenas o primeiro a configurar.
- **Métodos suportados na v1**: Multibanco, MB WAY e Cartão de Crédito (Gateway). Payshop e Pix ficam no schema mas desativados por defeito.
- **URL de callback**: enviar à ifthenpay um URL no domínio `fastcrm.metodopare.ai` (mais profissional do que o subdomínio Supabase) com `workspace=pharliss` e `key=<anti_phishing_key>` como query params.
- **Reconciliação**: o callback atualiza diretamente o estado da fatura/encomenda associada via `order_id` (passado como parâmetro `id` no pedido de pagamento).
- **Auditoria**: cada callback (válido ou rejeitado) é registado em `ifthenpay_callback_logs` para auditoria e debug.
- **Fallback**: se o callback chegar para uma referência desconhecida, devolve 200 OK na mesma (a ifthenpay reenvia indefinidamente em caso de erro) e regista em log.

## Estrutura técnica

### Tabelas novas (Supabase, com RLS)

**`ifthenpay_settings`** — uma linha por workspace
- `id` uuid PK
- `workspace_id` uuid UNIQUE (FK workspaces)
- `is_active` boolean default false
- `mb_entidade` text, `mb_subentidade` text (Multibanco)
- `mbway_key` text (MB WAY)
- `cc_key` text (Cartão Crédito Gateway)
- `payshop_key` text, `pix_key` text (futuros)
- `anti_phishing_key` text NOT NULL (gerada por nós, mostrada uma vez)
- `enabled_methods` text[] default `{multibanco,mbway}`
- `expiry_days` int default 3 (validade da referência MB)
- `test_mode` boolean default true
- `created_at`, `updated_at`

RLS: SELECT/INSERT/UPDATE apenas para membros do workspace com role admin. Chaves só visíveis a admins; mascaradas (`****1234`) na UI para outros papéis.

**`ifthenpay_payments`** — pedido de pagamento criado
- `id` uuid PK
- `workspace_id` uuid
- `order_id` uuid (FK opcional para `orders` ou `invoices`)
- `reference_type` text (`order` | `invoice` | `subscription`)
- `reference_id` uuid
- `method` text (`multibanco` | `mbway` | `cc`)
- `amount` numeric
- `currency` text default `EUR`
- `status` text (`pending` | `paid` | `expired` | `cancelled` | `failed`)
- `mb_entidade`, `mb_referencia`, `mb_expiry_date` (apenas se Multibanco)
- `mbway_request_id`, `mbway_phone` (apenas se MB WAY)
- `cc_request_id`, `cc_payment_url` (apenas se Cartão)
- `paid_at` timestamptz
- `metadata` jsonb
- `created_at`

RLS: membros do workspace podem ler; INSERT/UPDATE apenas via service_role (edge functions).

**`ifthenpay_callback_logs`** — auditoria de callbacks
- `id` uuid PK
- `workspace_id` uuid (resolvido após validação)
- `received_at` timestamptz
- `query_params` jsonb (raw)
- `headers` jsonb
- `outcome` text (`accepted` | `rejected_key` | `rejected_unknown_payment` | `error`)
- `payment_id` uuid (FK ifthenpay_payments, nullable)
- `error_message` text

RLS: SELECT para admins do workspace, INSERT só service_role.

### Edge Functions novas

**`ifthenpay-create-payment`** (verify_jwt true)
- Input: `{ workspace_id, reference_type, reference_id, method, amount, customer? }`
- Valida JWT + pertença ao workspace + método ativo nas settings.
- Conforme método:
  - **Multibanco**: chama `https://ifthenpay.com/api/multibanco/reference/init` (JSON com `mbKey`, `orderId`, `amount`, `expiryDays`).
  - **MB WAY**: chama `https://ifthenpay.com/api/spg/payment/mbway` com `MbWayKey`, `orderId`, `amount`, `mobileNumber`.
  - **Cartão**: chama `https://ifthenpay.com/api/creditcard/init/{ccKey}` para obter `paymentUrl` e `requestId`.
- Cria registo em `ifthenpay_payments` com status `pending`.
- Devolve dados ao frontend (referência+entidade, ou URL de pagamento).
- Erros: padrão 200 OK + `{ fallback: true, error }` (regra do projeto).

**`ifthenpay-callback`** (verify_jwt false — validação manual via anti-phishing key)
- URL final: `https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/ifthenpay-callback`
- A ifthenpay chama com query string: `?key=...&orderId=...&amount=...&requestId=...&payment_datetime=...&workspace=pharliss`
- Valida `workspace` → carrega `ifthenpay_settings.anti_phishing_key` → compara com `key` recebido.
- Se key inválida → log `rejected_key` + 200 OK (não revelar detalhes).
- Se válida → procura `ifthenpay_payments` por `orderId` (que coincide com `payments.id`).
- Marca como `paid`, atualiza `paid_at`.
- Atualiza fatura/encomenda associada (`orders.payment_status = 'paid'` ou equivalente em `invoices`).
- Regista em `activity_logs` (`payment_received` via ifthenpay).
- Dispara realtime update para a UI.
- Devolve sempre 200 OK (mesmo em erro interno → log `error` + fallback).

**`ifthenpay-rotate-key`** (verify_jwt true, admin only)
- Gera nova `anti_phishing_key` e devolve novo URL de callback completo para o admin enviar à ifthenpay.

### UI nova

**`/dashboard/settings/integrations/ifthenpay`** (ou tab dentro de Integrations)
- Componente `IfthenpaySettingsPage.tsx`
- Secções:
  1. **Estado** — Ativo/Inativo, modo Teste/Produção
  2. **Chaves por método** — campos password, com botão "Mostrar/Copiar" (apenas admin); cada um com link para a doc da ifthenpay sobre onde obter
  3. **Callback URL** — read-only, com botão "Copiar" e botão "Rodar anti-phishing key"
  4. **Métodos ativos** — checkboxes (MB, MB WAY, Cartão, Payshop, Pix)
  5. **Histórico de callbacks** — tabela `ifthenpay_callback_logs` com filtro/ordenação
  6. **Teste de integração** — botão que cria um pagamento de 0,01€ Multibanco para validar config

**Componente `IfthenpayPaymentSelector.tsx`** (a usar no checkout)
- Mostra os métodos ativos como cards
- Ao escolher, chama `ifthenpay-create-payment` e mostra resultado (referência MB, ou redireciona para Cartão, ou envia pedido MB WAY ao telemóvel)
- Polling opcional ao status (a cada 5s) ou via realtime subscription a `ifthenpay_payments`

### Hooks

- `useIfthenpaySettings(workspaceId)` — get/update via RLS direto.
- `useIfthenpayPayment(paymentId)` — subscribe realtime ao status.
- `useCreateIfthenpayPayment()` — mutation para invocar a edge function.

## Plano de implementação

### Fase 1 — Infra base (para teres o URL para enviar à ifthenpay)
1. Migration: criar `ifthenpay_settings`, `ifthenpay_payments`, `ifthenpay_callback_logs` + RLS.
2. Edge function `ifthenpay-callback` (esqueleto que valida key, faz log, devolve 200 OK).
3. Página `IfthenpaySettingsPage.tsx` (mínima): permitir ao admin gerar a anti-phishing key e ver o URL de callback completo.
4. **Resultado**: já tens o URL e key para enviar à ifthenpay → eles começam a configurar a tua conta.

### Fase 2 — Geração de pagamentos
5. Edge function `ifthenpay-create-payment` (Multibanco + MB WAY).
6. Componente `IfthenpayPaymentSelector` integrado no checkout existente do Pharliss.
7. Realtime subscription para atualizar UI quando o callback marcar como pago.

### Fase 3 — Reconciliação completa
8. Atualizar `orders` / `invoices` automaticamente quando o callback chega.
9. Disparar email/notificação de pagamento recebido.
10. Histórico de callbacks na UI + botão de teste 0,01€.

### Fase 4 — Cartão de Crédito + extras
11. Adicionar método Cartão (redirect flow).
12. Suporte a reembolsos (API `/refund` da ifthenpay).
13. Webhook reverso para subscrições recorrentes (se aplicável).

## Critérios de aceitação

- Admin do Pharliss consegue configurar todas as chaves e gerar/rotar a anti-phishing key.
- URL de callback funciona: testes simulados com `key` correta → 200 OK + payment marcado pago; com `key` errada → 200 OK + log `rejected_key`, sem alterações.
- Cliente final no checkout vê os métodos ativos, escolhe Multibanco → recebe Entidade+Referência+Valor; escolhe MB WAY → recebe pedido no telemóvel; escolhe Cartão → redireciona para gateway.
- Após pagamento real (modo teste ifthenpay), a fatura passa a "Paga" automaticamente em <10s.
- Todos os callbacks ficam em `ifthenpay_callback_logs` (mesmo os rejeitados).
- RLS impede que admin de outro workspace veja chaves do Pharliss.
- Nenhum segredo aparece em `console.log`.

## Riscos e pontos por validar

- **Doc oficial ifthenpay** — confirmar URLs exatos das APIs (variam ligeiramente por método). Pode ser preciso afinar payloads na Fase 2.
- **Order ID format** — a ifthenpay aceita até 15 chars no `orderId` para Multibanco. Vamos usar um short-hash do UUID, não o UUID completo.
- **Modelo de fatura/encomenda no Pharliss** — preciso confirmar se ligamos a `orders`, `invoices` ou ambos. Atualmente o plano usa `reference_type` polimórfico para suportar os dois.
- **Domínio do callback** — recomendo `https://fastcrm.metodopare.ai/functions/v1/ifthenpay-callback` mas requer rewrite/proxy no frontend host. Alternativa imediata: usar o URL Supabase nativo (`eumnfkccyvlyoyjchiwe.supabase.co`).
- **Idempotência** — a ifthenpay pode reenviar callbacks; o handler tem de ser idempotente (já previsto: se `status='paid'`, ignora silenciosamente mas regista log).
- **Modo de teste** — a ifthenpay disponibiliza chaves de sandbox. Convém arrancarmos em `test_mode=true` até validares end-to-end.

## URL final a enviar à ifthenpay (após Fase 1)

```
https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/ifthenpay-callback?workspace=pharliss&key=<ANTI_PHISHING_KEY_GERADA>
```

(Ou na variante com domínio próprio, se ativarmos rewrite em `fastcrm.metodopare.ai`.)

---

Aprovas para arrancar pela **Fase 1** (para conseguires enviar já o URL à ifthenpay enquanto eles configuram do lado deles)?
