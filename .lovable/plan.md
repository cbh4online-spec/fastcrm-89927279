## Diagnóstico

Cada workspace deve poder ligar a sua própria conta de software de faturação (começando pelo **InvoiceXpress**, mas com arquitectura preparada para Moloni, Vendus, etc.). As credenciais devem ser isoladas por workspace, guardadas em segurança no backend (nunca no cliente) e usadas via Edge Function que actua como proxy autenticado.

## Decisões de produto/UX

- Página em **Backoffice → Definições do Workspace → Faturação / Integrações** (`/dashboard/settings/billing-integrations`).
- Lista de integrações activas + botão "Ligar fornecedor".
- Form por provider (InvoiceXpress: `account_name` + `api_key`).
- Botão "Testar ligação" antes de gravar (chama endpoint `/users/me.json` da InvoiceXpress).
- Estado visível: ✅ ligado, ⚠️ erro, 🔌 desligado. Última verificação e mensagem de erro.
- Possibilidade de definir uma integração **default** (a usar quando se gera fatura a partir do CRM).
- Apenas administradores do workspace (role `admin` / `owner`) podem gerir.

## Estrutura técnica

### DB (`workspace_billing_integrations`)
- `id`, `workspace_id`, `provider` (enum: `invoicexpress`, `moloni`, `vendus`, `sage`, `primavera`)
- `account_name` (subdomínio para InvoiceXpress)
- `api_key_encrypted` (texto — guardado apenas server-side via service_role)
- `config` jsonb (séries de documento, NIF emissor, prefixos)
- `is_active`, `is_default`, `last_check_at`, `last_check_status`, `last_check_error`
- RLS: SELECT/UPDATE/DELETE para membros admin do workspace; INSERT idem; **api_key nunca exposto** (campo lido só via Edge Function com service_role).
- View `workspace_billing_integrations_safe` que omite `api_key_encrypted` para o frontend.

### Edge Functions
1. **`billing-integration-test`** — recebe `{provider, account_name, api_key}`, valida JWT + admin do workspace, chama InvoiceXpress `/users/me.json`, devolve `{ok, account_info}`. Não guarda nada.
2. **`billing-integration-save`** — valida JWT + admin, faz teste de ligação, guarda registo (insert/update) com api_key (RLS bypass via service_role).
3. **`invoicexpress-proxy`** — proxy genérico autenticado para chamadas server-side futuras (criar fatura, listar clientes). Aceita `{integration_id, method, path, body}`. Resolve api_key do registo, encaminha para `https://{account}.app.invoicexpress.com/api/{path}?api_key=...`.

Todas com CORS, validação Zod, 200 OK + payload de erro (padrão "Resilient Error Patterns").

### Frontend
- `src/hooks/useBillingIntegrations.ts` — list/create/update/delete/test/setDefault.
- `src/pages/settings/BillingIntegrationsPage.tsx` — UI com tabela + dialog de configuração.
- `src/components/settings/billing/InvoiceXpressForm.tsx` — form específico do provider.
- Rota em `routeManifest.ts` + `SettingsRoutes.tsx`.

## Plano de implementação

1. Migração DB (`workspace_billing_integrations` + view + RLS + trigger updated_at).
2. Edge Function `billing-integration-test`.
3. Edge Function `billing-integration-save`.
4. Edge Function `invoicexpress-proxy` (esqueleto pronto a usar em features futuras).
5. Hook `useBillingIntegrations`.
6. Página `BillingIntegrationsPage` com tabela + dialog.
7. Form específico InvoiceXpress (account_name, api_key, série default).
8. Registar rota em `routeManifest.ts` (área `definicoes`/Backoffice) + `SettingsRoutes.tsx`.

## Critérios de aceitação

- Admin consegue adicionar uma conta InvoiceXpress, testar e gravar.
- Cada workspace só vê as suas integrações (verificado por RLS).
- A `api_key` não é devolvida em nenhuma resposta para o cliente.
- Botão "Testar ligação" responde com sucesso/erro claro em < 5s.
- Marcar como default actualiza apenas uma integração por workspace.
- Estados vazio / loading / erro / sem permissão tratados.
- Mobile: tabela vira cards.

## Riscos / pontos por validar

- Encriptação real da `api_key`: para já fica em coluna restrita por RLS + service_role only. Se for crítico, evoluir para `pgsodium`/`vault` em sprint dedicado.
- InvoiceXpress rate limits (não documentados publicamente) — proxy futuro deverá adicionar retry/backoff.
- Multi-conta InvoiceXpress no mesmo workspace: suportado (várias linhas), apenas uma `is_default`.
