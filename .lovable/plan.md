# Corrigir «Não foi possível guardar a ligação» (WAScript)

## Diagnóstico (confirmado na base de dados)
- A tabela onde a ligação WAScript é guardada (`whatsapp_wascript_connections`) **não existe** — a migração nunca foi criada. Por isso o botão «Guardar» falha sempre, e também o envio, o webhook de receção, as etiquetas e as notas.
- A lista de fornecedores permitidos em `whatsapp_provider_instances.provider_name` não inclui `wascript`, por isso «Usar como principal» também falharia a seguir.

## O que vou fazer
1. Migração nova:
   - Criar `public.whatsapp_wascript_connections`: `id`, `workspace_id` (único, uma ligação por organização), `api_token`, `webhook_token` (aleatório por omissão, único), `status` (`connected|error|disconnected`), `last_error`, `last_checked_at`, `last_inbound_at`, `connected_by`, `created_at`, `updated_at`.
   - RLS ativo **sem políticas para utilizadores** e sem GRANT a `anon`/`authenticated` (o token fica só no servidor); GRANT total a `service_role`.
   - Alargar o CHECK de `provider_name` para incluir `wascript`.
2. Pequena melhoria na função `wascript-manage`: registar o erro técnico no log quando o guardar falhar (sem token), para diagnóstico futuro.
3. Validar: chamar a função com «status» e confirmar que já não falha; pedir-lhe para colar o token e carregar em «Guardar».

## Critérios de aceitação
- Guardar o token mostra o estado «Ligada» (ou o aviso de WhatsApp Web fechado).
- O endereço do webhook aparece para gestores.
- «Usar como principal» funciona sem erro.

## Riscos
- Nenhum dado existente é afetado (tabela nova; CHECK apenas alargado).
