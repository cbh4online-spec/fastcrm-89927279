# Resolver os achados críticos de segurança antes de publicar

## Diagnóstico (verificado na base de dados)

1. **Perfis visíveis entre workspaces** — a política `Users can view any profile` em `profiles` é `SELECT ... USING (true)` para `authenticated`. Qualquer utilizador autenticado (de qualquer workspace) lê email, nome, avatar e data de nascimento de todos os utilizadores da plataforma.
2. **IBAN/NIF do workspace expostos publicamente** — `workspaces` tem três políticas públicas de SELECT (listagens C2C, bio pages "live", propostas publicadas) que devolvem a **linha inteira**, incluindo `company_iban`, `tax_id`, `billing_email` e `phone`. A `PublicProposalPage` chega a pedir `select("*, company_iban, ...")`.
3. **Códigos de referral enumeráveis** — `Anyone can read referral codes for validation` em `store_referral_codes` é `USING (true)` para todos, expondo `user_id`, `code` e `uses_count` de toda a tabela.

## Decisões

- Manter todas as funcionalidades públicas a funcionar (loja C2C, bio pages, propostas partilhadas, validação de códigos de referral) — muda apenas **o que** é devolvido e a **quem**.
- Nas propostas publicadas, os dados de pagamento (IBAN, info de pagamento) continuam a ser mostrados, mas só através de um acesso dedicado à proposta, nunca por leitura livre da tabela `workspaces`.
- Perfis: visíveis a colegas da mesma workspace e a super admins; nunca entre tenants.

## Plano de implementação

### 1. `profiles` — restringir a colegas de workspace
- Substituir `Users can view any profile` por uma política que permita SELECT quando: é o próprio (`user_id = auth.uid()`), partilha pelo menos uma workspace com quem consulta (função `SECURITY DEFINER` `shares_workspace_with(auth.uid(), user_id)` com `search_path = public`), ou `is_super_admin(auth.uid())`.
- Validar os ecrãs que listam utilizadores (membros, atribuições, gestores, comentários) — todos operam dentro da workspace activa, pelo que continuam a funcionar.

### 2. `workspaces` — deixar de expor colunas financeiras
- Criar uma **view pública** `public_workspaces` (security invoker, sem `company_iban`, `tax_id`, `billing_email`, `phone`, dados fiscais) com as colunas realmente usadas: `id`, `name`, `slug`, `logo_url`, cores/branding.
- Remover as três políticas públicas amplas de `workspaces` (C2C, bio pages, propostas) e conceder leitura pública apenas à view/RPC.
- Apontar as leituras públicas do frontend para a nova view: `PublicLandingPage`, `PublicBioPage`, `PublicBioShortLink`, `StoreOrderTrackingPage`, `StoreWishlistPage`, `C2CSellerRegistration`, `C2CSponsorPortal`, `PartnerLoginPage`, `ClientLoginPage`.
- `PublicProposalPage`: passar a obter proposta + emitente por uma função `SECURITY DEFINER` (`get_public_proposal`) que só devolve dados de pagamento quando a proposta está efectivamente publicada/partilhada.

### 3. `store_referral_codes` — validação sem enumeração
- Remover a política `Anyone can read referral codes for validation`.
- Criar `validate_referral_code(_workspace_id uuid, _code text)` (`SECURITY DEFINER`, `STABLE`, `search_path = public`) que devolve apenas se o código é válido e o `user_id` do dono, para o teste "não podes usar o teu próprio código".
- Actualizar `useApplyReferralCode` em `src/hooks/useStoreReferrals.ts` para usar o RPC. `useMyReferralCode`/`useTopReferrers` mantêm-se (já autenticados e limitados à workspace).

### 4. Validação
- Correr o scan de segurança e confirmar que os três achados desaparecem.
- Testes manuais: loja pública e bio page abrem sem sessão; proposta partilhada mostra IBAN; utilizador de outra workspace não vê perfis alheios; aplicar código de referral continua a funcionar.
- Só depois publicar (inclui as correções de layout da ficha de produto já feitas).

## Notas técnicas

- Todas as funções novas: `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, com `GRANT EXECUTE` a `anon`/`authenticated` conforme o uso.
- A view pública leva `GRANT SELECT` a `anon, authenticated`.
- Sem alterações de dados; apenas políticas, funções, view e as chamadas correspondentes no frontend.

## Riscos por validar

- Algum ecrã pouco usado poderá ler colunas de `workspaces` que deixam de estar acessíveis publicamente — mitigado revendo todas as chamadas listadas e testando as rotas públicas.
