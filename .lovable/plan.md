

# Fix: Botão "Aceitar Proposta" não funciona em todos os workspaces

## Problema
O botão "Aceitar Proposta" na página pública (`/p/{slug}`) invoca sempre o `proposal-checkout` edge function, que:
1. Usa o `STRIPE_SECRET_KEY` global em vez do `workspace_stripe_config` específico de cada workspace
2. Falha silenciosamente se o workspace não tem Stripe configurado
3. Não oferece alternativa para aceitar sem pagamento

## Solução

### 1. Edge Function `proposal-checkout/index.ts`
- Substituir `Deno.env.get("STRIPE_SECRET_KEY")` por leitura do `workspace_stripe_config` usando o `workspace_id` da proposta (padrão já usado em `create-store-checkout`)
- Se o workspace não tiver Stripe configurado, marcar a proposta como `accepted` diretamente (sem checkout) e retornar `{ accepted: true }` em vez de erro

### 2. Página pública `PublicProposalPage.tsx`
- No `handleCheckout`, tratar a resposta `{ accepted: true }` (sem URL de Stripe) — atualizar estado local para mostrar confirmação
- Renomear para `handleAccept` para refletir que pode aceitar com ou sem pagamento

### Fluxo resultante
1. Cliente clica "Aceitar Proposta"
2. Edge function verifica se workspace tem Stripe ativo
   - **Com Stripe**: Cria checkout session e redireciona (comportamento atual)
   - **Sem Stripe**: Marca proposta como `accepted`, regista log de atividade, retorna `{ accepted: true }`
3. Frontend mostra confirmação de aceitação

### Ficheiros a alterar
- `supabase/functions/proposal-checkout/index.ts` — usar `workspace_stripe_config`, fallback para aceitação direta
- `src/pages/PublicProposalPage.tsx` — tratar resposta sem URL de checkout

