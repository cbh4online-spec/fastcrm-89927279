
# Corrigir botoes "Entrar" e "Comecar a Vender" no Marketplace Publico

## Problemas identificados

### 1. Botao "Entrar" redireciona para o onboarding do CRM
O botao "Entrar" no header do marketplace navega para `/login`. Apos login, o `LoginForm` redireciona sempre para `/dashboard`. Como o utilizador nao tem workspace CRM, o `DashboardLayout` envia-o para `/onboarding`.

### 2. Botao "Comecar a Vender" nao faz nada
O botao navega para `/c2c/metodopare/sell` que e uma rota valida (`C2CSellerRegistration`). Contudo, essa pagina usa `useAuth()` e quando o utilizador nao esta autenticado, mostra botoes "Entrar" e "Criar Conta" que novamente apontam para `/login` e `/signup` do CRM -- criando o mesmo ciclo de redirecionamento.

## Solucao

Adicionar suporte a redirecionamento pos-login para que o utilizador volte ao marketplace em vez de ir para o dashboard do CRM.

## Alteracoes tecnicas

### 1. Marketplace Public -- passar parametro de retorno nos links de login

**Ficheiro:** `src/pages/c2c/C2CPublicMarketplace.tsx`

- Alterar o botao "Entrar" no header de `navigate("/login")` para `navigate("/login?redirect=/c2c/{workspaceSlug}")`
- O botao "Vender" ja funciona (`/c2c/{slug}/sell`), nao precisa de alteracao

### 2. Seller Registration -- corrigir botoes de login/signup

**Ficheiro:** `src/pages/c2c/C2CSellerRegistration.tsx`

- Alterar o botao "Entrar" de `navigate("/login")` para `navigate("/login?redirect=/c2c/{workspaceSlug}/sell")`
- Alterar o botao "Criar Conta" de `navigate("/signup")` para `navigate("/signup?redirect=/c2c/{workspaceSlug}/sell")`

### 3. LoginForm -- respeitar parametro redirect

**Ficheiro:** `src/components/auth/LoginForm.tsx`

- Ler o parametro `redirect` da URL usando `useSearchParams()`
- Apos login bem-sucedido, redirecionar para o valor de `redirect` (se existir) em vez de sempre `/dashboard`
- Validar que o redirect comeca com `/` para evitar redirects maliciosos

### 4. SignupForm -- respeitar parametro redirect (se existir)

- Aplicar a mesma logica do LoginForm ao formulario de registo, passando o redirect adiante para que apos confirmar email e fazer login, o utilizador volte ao destino correto

## Resultado esperado

- Visitante clica "Entrar" no marketplace -> faz login -> volta ao marketplace
- Visitante clica "Comecar a Vender" -> ve pagina de registo de vendedor -> se precisar de login, faz login -> volta a pagina de registo de vendedor
