

# Corrigir Stripe Sync

## Diagnóstico

Dois problemas impedem o Stripe Sync de funcionar:

### 1. Mismatch no nome do parâmetro
- **Frontend** envia: `{ workspace_id: ws.workspaceId }`
- **Edge function** espera: `const { workspaceId } = await req.json()`
- Resultado: `workspaceId` é sempre `undefined` → erro "Workspace ID is required"

### 2. Lógica de sync não procura clientes no Stripe
A edge function `check-subscription` só verifica o Stripe se já existir um `stripe_subscription_id` na BD. Como **todos os 10 workspaces têm `stripe_customer_id` e `stripe_subscription_id` a NULL**, a função nunca contacta o Stripe — simplesmente devolve os dados locais sem vincular nada.

Para o sync funcionar de verdade, precisa de:
1. Procurar o cliente no Stripe pelo email do owner do workspace
2. Se encontrar, obter a subscrição activa
3. Guardar `stripe_customer_id` e `stripe_subscription_id` na BD

## Alterações

| Ficheiro | Acção |
|---|---|
| `supabase/functions/check-subscription/index.ts` | Corrigir nome do parâmetro (`workspace_id`); adicionar lookup de cliente Stripe por email do owner quando não há IDs |
| `src/components/super-admin/BillingSection.tsx` | Nenhuma alteração necessária (já envia `workspace_id` correctamente) |

### Detalhe da Edge Function

1. **Aceitar ambos os nomes**: `const workspaceId = body.workspace_id || body.workspaceId`

2. **Novo bloco de lookup** quando não há `stripe_subscription_id`:
   - Obter o owner do workspace via `workspace_members` (role = owner) → `profiles.email`
   - Chamar `stripe.customers.list({ email })` para encontrar o cliente
   - Se encontrar, chamar `stripe.subscriptions.list({ customer, status: "active" })` 
   - Guardar `stripe_customer_id` e `stripe_subscription_id` em `workspace_subscriptions`
   - Actualizar `workspace_plans` se o plano Stripe diferir do local

3. **Manter fallback** existente: se não encontrar nada no Stripe, devolver dados locais sem erro

### Fluxo resultante

```text
Sync clicado
  → check-subscription(workspace_id)
  → Ler workspace_subscriptions
  → Se tem stripe_subscription_id → verificar no Stripe (já existe)
  → Se NÃO tem → obter email do owner
    → stripe.customers.list(email)
    → Se encontrou → stripe.subscriptions.list(customer)
      → Guardar IDs na BD
      → Devolver plano Stripe
    → Se não → devolver dados locais
```

