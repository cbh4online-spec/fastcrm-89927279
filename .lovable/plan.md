
Objetivo: desbloquear a publicação (frontend + backend), forçar um redeploy limpo e confirmar produção.

Estado atual já verificado:
1) Não encontrei erros óbvios de conflito de código (sem markers de merge; import duplicado crítico no `chat-widget` já não existe).
2) Ainda há inconsistência de imports em 10 Edge Functions (9 com `npm:@supabase/supabase-js@2` e 1 com `jsr:@supabase/supabase-js@2`), enquanto o padrão do projeto já está no import map (`@supabase/supabase-js`).
3) Não há `deno.lock` em `supabase/functions` (bom para evitar lock incompatível).
4) Nos logs do preview, chamadas backend observadas estão a responder 200.
5) Há warning React de keys duplicadas em `SidebarV1` (não costuma bloquear deploy, mas é ruído técnico).
6) Os dois domínios públicos que validaste (`fastcrm.lovable.app` e `fastcrm.metodopare.ai`) estão a servir conteúdo; falta garantir que é a versão mais recente.

Plano de execução (implementação):
1. Confirmar erro pendente de build/deploy
- Ler logs de deploy/execução no ambiente de teste e live focando funções alteradas recentemente.
- Identificar função exata que falha (se existir) + deployment id.

2. Corrigir conflitos que podem bloquear publicação
- Normalizar os 10 ficheiros restantes para o padrão único:
  - `import { createClient } from "@supabase/supabase-js"`
  - trocar `serve(...)` legado por `Deno.serve(...)` nos 9 ficheiros antigos (para uniformizar runtime).
- Corrigir também warning de key duplicada no sidebar (hardening, não bloqueante, mas evita regressões de UI).

3. Forçar build/deploy limpo
- Fazer redeploy forçado das funções afetadas em lote.
- Validar imediatamente nos logs que todas sobem sem erro.
- Se houver falha isolada, corrigir e redeploy incremental até 100%.

4. Garantir que as alterações mais recentes entram no deploy
- Executar smoke checks nas funções críticas (incluindo `check-subscription` e fluxo relacionado a publish).
- Confirmar que ambos os domínios respondem com a versão atualizada após publicação.
- Para frontend: garantir atualização via publish final (Update) para live.

5. Confirmação final
- Entregar:
  - lista de erros encontrados/corrigidos,
  - funções redeployadas com sucesso,
  - validação dos dois domínios,
  - URL de produção confirmada: `https://fastcrm.lovable.app` (com domínio customizado `https://fastcrm.metodopare.ai` também validado).

Detalhes técnicos (ficheiros alvo da normalização de imports):
- `supabase/functions/b2b-plan-create/index.ts`
- `supabase/functions/b2b-plan-generate-invoice/index.ts`
- `supabase/functions/b2b-plan-generate-order/index.ts`
- `supabase/functions/b2b-plan-notify-cycle/index.ts`
- `supabase/functions/b2b-plan-schedule-run/index.ts`
- `supabase/functions/replenishment-convert-to-cart/index.ts`
- `supabase/functions/replenishment-generate-suggestions/index.ts`
- `supabase/functions/replenishment-send-email/index.ts`
- `supabase/functions/replenishment-send-whatsapp/index.ts`
- `supabase/functions/check-subscription/index.ts`
