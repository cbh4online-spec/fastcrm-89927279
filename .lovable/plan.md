

# Guardar dados do checkout imediatamente

## Problema Atual
O formulario de checkout tem 2 passos, mas os dados do cliente (nome, telefone, email) so sao guardados no momento final quando o utilizador clica "Pagar com Stripe". Se o cliente preencher os dados e abandonar antes de pagar, o CRM nao captura nada.

## Solucao

Guardar os dados do cliente no CRM (tabela `contacts`) e na tabela `store_abandoned_carts` imediatamente apos o passo 1 (nome + telefone), e atualizar com o email no passo 2 -- tudo antes do redirecionamento para o Stripe.

## Alteracoes

### 1. StoreCheckoutPage.tsx
- No `handleStep1Continue`, apos validacao, fazer um upsert do contacto no backend (nome + telefone) via uma nova chamada a uma edge function ou diretamente via Supabase client
- Guardar o `contactId` retornado no state local
- Registar/atualizar um `store_abandoned_cart` com os items e dados do cliente
- No passo 2, quando o email e preenchido, atualizar o contacto e o carrinho abandonado com o email (via debounce ou on blur)

### 2. Nova Edge Function: `store-capture-lead`
- Recebe: `workspaceId`, `name`, `phone`, `email` (opcional), `cartItems`
- Faz upsert do contacto (por telefone, ja que email pode nao existir ainda)
- Cria/atualiza registo em `store_abandoned_carts` com status `active`
- Retorna `contactId` e `cartId`

### 3. Atualizacao do `create-store-checkout`
- Aceitar `contactId` opcional no body para evitar duplicar o upsert
- Se `contactId` vier preenchido, usar diretamente em vez de procurar novamente

### 4. Fluxo Completo

```text
Passo 1: Nome + Telefone
  |
  v
[Guardar contacto + carrinho abandonado] --> CRM tem o lead
  |
  v
Passo 2: Email + Envio
  |
  v  
[Atualizar contacto com email] --> Lead completo
  |
  v
Clica "Pagar" --> create-store-checkout (usa contactId existente)
  |
  v
Stripe Checkout --> Webhook marca carrinho como "recovered"
```

## Detalhes Tecnicos

### Edge Function `store-capture-lead`
- Upsert por telefone (fallback por email se disponivel)
- Cria registo `store_abandoned_carts` com `session_id` gerado no frontend (UUID)
- Tags automaticas: `["loja-online", "lead-checkout"]`
- Source: `"store_checkout"`

### Frontend (StoreCheckoutPage.tsx)
- Gerar `sessionId` (UUID) no mount do componente
- Chamar `store-capture-lead` no submit do passo 1
- Chamar update no blur do campo email (passo 2)
- Guardar `contactId` no state para passar ao `create-store-checkout`

### Impacto
- Zero friccao para o utilizador (o fluxo visual nao muda)
- O CRM captura leads mesmo com abandono
- O sistema de automacao de carrinho abandonado fica mais preciso (tem dados reais do contacto)

