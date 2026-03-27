

## Inserir Links de Pagamento no Compositor de Email

Permitir que, ao compor um email, o utilizador possa selecionar um produto/serviço/curso do catálogo e inserir automaticamente um link de pagamento Stripe no corpo do email.

---

### Arquitetura

1. **Edge Function `create-payment-link`** — Recebe `productId` + `workspaceId`, busca o produto na tabela `products`, cria um Stripe Payment Link (ou Checkout Session com `mode: "payment"`) e devolve a URL
2. **Componente `InsertPaymentLinkDialog`** — Dialog que lista produtos do workspace com pesquisa, mostra preço, e ao selecionar gera o link via edge function e insere no body do email
3. **Integração no `ComposeEmailDialog`** — Novo botão na toolbar (ícone `CreditCard`) que abre o dialog

### Alterações

| Ficheiro | O que muda |
|---|---|
| `supabase/functions/create-payment-link/index.ts` | **Novo** — Cria Stripe Payment Link para um produto, usando `STRIPE_SECRET_KEY` (já disponível). Busca `base_price` e `name` da tabela `products`. Retorna URL do pagamento |
| `src/components/email/InsertPaymentLinkDialog.tsx` | **Novo** — Dialog com lista de produtos do workspace (query à tabela `products`), campo de pesquisa, preço, botão "Inserir Link". Chama a edge function e devolve a URL formatada |
| `src/components/email/ComposeEmailDialog.tsx` | Adicionar botão `CreditCard` na toolbar que abre `InsertPaymentLinkDialog`. Ao receber URL, inserir bloco HTML formatado no body (card com nome do produto, preço e botão "Pagar Agora") |

### Fluxo

1. Utilizador clica no ícone de pagamento na toolbar
2. Dialog abre com lista de produtos do workspace (filtráveis por nome)
3. Seleciona produto → edge function cria Payment Link no Stripe
4. URL é devolvida e inserida no email como bloco HTML estilizado:
   ```
   ┌─────────────────────────────┐
   │  💳 Produto XYZ             │
   │  Valor: €99,00              │
   │  [  Pagar Agora  ]          │
   └─────────────────────────────┘
   ```
5. Destinatário recebe email com botão clicável para pagar

### Edge Function — `create-payment-link`

- Autentica o utilizador via JWT
- Busca produto na tabela `products` por ID + workspace_id
- Cria `stripe.paymentLinks.create()` com price inline (`price_data`) para one-off, ou usa preço existente se o produto tiver `stripe_price_id`
- Retorna `{ url, productName, price }`
- Usa `STRIPE_SECRET_KEY` já configurado

