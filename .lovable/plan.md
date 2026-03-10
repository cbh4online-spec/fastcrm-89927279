

## Plan: Abrir checkout quando créditos insuficientes

### Problema
Quando o utilizador não tem créditos suficientes, o dialog mostra apenas um aviso e o botão "Confirmar" fica desativado. Não há forma de comprar créditos diretamente.

### Solução
Modificar o `CreditConfirmDialog` para, quando `!affordable`, substituir o botão "Confirmar" por um botão "Comprar Créditos" que abre o painel de compra ou redireciona para o checkout do pacote mais adequado.

### Alterações

**1. `CreditConfirmDialog.tsx`**
- Importar `useCreditPurchase` e `useState`
- Quando `!affordable`: mostrar os pacotes de créditos disponíveis inline (mini-cards) com botão de compra para cada
- O botão principal muda de "Confirmar" para "Comprar Créditos" — ao clicar, invoca `purchaseCredits.mutate(packageId)` do pacote mais barato que cubra o custo
- Manter o comportamento atual quando `affordable`

**2. Fluxo UX**
- Dialog abre → saldo insuficiente → mostra pacotes disponíveis com preços
- Utilizador clica "Comprar Créditos" → abre Stripe Checkout numa nova tab
- Ao voltar do Stripe, o saldo é atualizado automaticamente (já implementado via `useCreditPurchase`)

### Ficheiros a alterar
- `src/components/funnels/credits/CreditConfirmDialog.tsx` — adicionar lógica de compra quando saldo insuficiente

