# Acelerar Portal B2B (Partner Center)

## Diagnóstico

O ecrã ficar a girar ~5-10s deve-se a uma duplicação grave do hook de autenticação:

- `usePartnerAuth` é instanciado **3× em paralelo** numa carga típica:
  1. Em `PartnerLayout` (sempre presente).
  2. Na página actual (`PartnerDashboardPage`, `PartnerCatalogPage`, etc.).
  3. Indirectamente noutros componentes.

- Cada instância faz por sua conta:
  - `supabase.auth.onAuthStateChange` (listener próprio).
  - `supabase.auth.getSession()`.
  - Query a `partner_users` (com timeout de 8s).

- Resultado: 3 sessões pedidas, 3 queries `partner_users`, 3 listeners. O `loading` do Layout só vira `false` quando a sua própria query terminar — durante esse tempo só vês o spinner do screenshot.
- Existe ainda um timeout de segurança que força `loading=false` aos 10s, o que dá a sensação de “demora sempre quase 10 segundos”.
- Cada navegação entre páginas remonta tudo (estado em `useState`/`useEffect`, sem cache partilhada).

## Solução

Centralizar tudo num **Provider único** dentro de `PartnerRoutes`, e tornar `usePartnerAuth` um simples consumidor desse contexto. O cart já vive num provider — fazemos o mesmo para auth.

## Alterações

1. **Novo** `src/contexts/PartnerAuthContext.tsx`
   - `PartnerAuthProvider` com a lógica que estava em `usePartnerAuth.ts` (1 listener, 1 fetch).
   - Exporta `usePartnerAuth()` que apenas lê o contexto.
   - Mantém o tempo limite de segurança mas reduzido para 6s (suficiente; só protege contra rede partida).

2. **Editar** `src/routes/PartnerRoutes.tsx`
   - Embrulhar tudo em `<PartnerAuthProvider>` por dentro do `PartnerCartProvider`.
   - Adicionar `<Suspense fallback>` com um spinner partilhado (evita ecrã branco entre `lazy()`).

3. **Apagar** o ficheiro `src/hooks/partner/usePartnerAuth.ts`
   - Substituído pelo re-export a partir do contexto.
   - Como assinatura pública é a mesma (`{ partnerUser, loading, signIn, signOut, ... }`), as páginas continuam a funcionar sem alterações.
   - A única chamada que passa `workspaceId` é o `PartnerLoginPage`; alteramos `signIn(email, pass, workspaceId?)` para aceitar o parâmetro extra.

4. **Editar** `src/components/partner/PartnerLayout.tsx`
   - Remove o `usePartnerAuth({ workspaceId: savedWorkspaceId })` repetido — apenas consome o contexto.
   - Move o `fetchBranding` para um hook `useQuery` (`partner-branding-{workspace_id}`) para ficar em cache entre páginas.

5. **Editar** `src/pages/partner/PartnerLoginPage.tsx`
   - Passa `workspaceId` directamente em `signIn()` em vez de no construtor do hook.

## Impacto esperado

- Tempo até interactivo no portal B2B: **~5-10s → < 1s** após cache quente; primeira carga limitada apenas pela latência real do Supabase.
- Navegação entre páginas: sem refetch de `partner_users`, sem novo `getSession`. Praticamente instantânea.
- Menos pedidos paralelos ao backend → também alivia carga em workspaces com muitos parceiros.

## Critérios de aceitação

- Abrir `/partner/dashboard` autenticado mostra o conteúdo em < 1.5s em rede normal.
- Mudar de Dashboard → Catálogo → Carrinho → Conta não dispara novos pedidos a `partner_users`.
- Logout limpa o estado e redirige para `/partner/login`.
- Login com workspace específico continua a funcionar.

## Riscos

- `usePartnerAuth` deixa de aceitar `{ workspaceId }` no construtor; só o `PartnerLoginPage` usava esse parâmetro — migra-se para o `signIn`.
- Se alguma página partner for usada **fora** de `/partner/*`, o `usePartnerAuth` lança erro (não é o caso hoje).

## Não está incluído (pode vir depois)

- Pré-carregar dashboard data em background ao logar.
- Cache offline / persistência do `partnerUser` em `localStorage` para “first paint” instantâneo entre sessões.
