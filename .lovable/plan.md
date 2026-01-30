
# Plano: Corrigir Gravacao de Itens e Implementar Tracking de Vendas

## Problema Identificado

### 1. Propostas com Preco mas Sem Itens

Ao criar uma proposta no `CreateProposalDialog`, o utilizador adiciona produtos no tab "Produtos" (POSProposalBuilder), mas quando clica em guardar, a funcao `handleSave` **nao guarda os `cartItems` na tabela `proposal_items`**:

```text
CreateProposalDialog.tsx (linha 226-240):
handleSave() {
  createProposal.mutateAsync({
    opportunity_id: oppId,
    title,
    content_blocks: blocks,
    price: parseFloat(price),  // <-- So guarda o preco total
    ...
  });
  // FALTA: Guardar os cartItems na proposal_items
}
```

O preco de 97 euros existe porque o sistema calcula o total do carrinho, mas os itens individuais nunca sao persistidos na base de dados.

### 2. Falta de Tracking Pos-Venda

Quando uma proposta e aceite e paga (via `proposal-webhook`):
- A proposta e marcada como `accepted`
- A oportunidade e marcada como `won`
- Registos de actividade sao criados

**O que falta:**
- Criar registos na tabela `contact_products` (produtos adquiridos pelo cliente)
- Actualizar estatisticas de vendas dos produtos
- Permitir tracking de consumo/utilizacao dos produtos vendidos

---

## Estrutura de Dados Existente

```text
proposals
  - id, price, status, opportunity_id, contact_id, company_id
  
proposal_items
  - id, proposal_id, product_id, name, quantity, unit_price, total_price
  
contact_products (produtos adquiridos)
  - id, contact_id/company_id, product_id, quantity, unit_price, total_value
  - status: active/expired/consumed
  - acquisition_date, expiry_date
  - consumed_quantity, purchased_quantity
  
consumption_logs (registo de consumo)
  - id, contact_id/company_id, product_id, acquired_product_id
  - quantity, consumption_date
```

---

## Solucao Proposta

### Fase 1: Gravar Itens ao Criar Proposta

**Ficheiro:** `src/components/proposals/CreateProposalDialog.tsx`

Modificar a funcao `handleSave`:

```text
const handleSave = async () => {
  // 1. Criar proposta
  const proposal = await createProposal.mutateAsync({...});
  
  // 2. Gravar itens do carrinho (NOVO)
  if (cartItems.length > 0) {
    await updateProposalItems.mutateAsync({
      proposalId: proposal.id,
      items: cartItems.map((item, idx) => ({
        product_id: item.product.id,
        name: item.product.name,
        description: item.product.short_description,
        quantity: item.quantity,
        unit_price: item.priceOverride ?? item.product.base_price ?? 0,
        position: idx,
      })),
    });
  }
};
```

Importar o hook `useUpdateProposalItems` de `@/hooks/useProposals`.

### Fase 2: Tracking de Produtos Vendidos (Backend)

**Ficheiro:** `supabase/functions/proposal-webhook/index.ts`

Adicionar apos marcacao da proposta como aceite:

```text
// Buscar itens da proposta
const { data: proposalItems } = await supabaseClient
  .from("proposal_items")
  .select("*")
  .eq("proposal_id", proposalId)
  .eq("is_enabled", true);

// Criar registos de produtos adquiridos para cada item
if (proposalItems && proposalItems.length > 0) {
  const contactId = proposal.contact_id || opportunity?.contact_id;
  const companyId = proposal.company_id || opportunity?.company_id;
  
  for (const item of proposalItems) {
    await supabaseClient.from("contact_products").insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      company_id: companyId,
      product_id: item.product_id,
      quantity: item.quantity,
      purchased_quantity: item.quantity,
      unit_price: item.unit_price,
      total_value: item.total_price,
      acquisition_date: new Date().toISOString().split('T')[0],
      status: "active",
      notes: `Adquirido via proposta: ${proposal.title}`,
    });
  }
}
```

### Fase 3: Checkout Stripe com Itens Detalhados

**Ficheiro:** `supabase/functions/proposal-checkout/index.ts`

Modificar para enviar itens individuais ao Stripe em vez de um item unico:

```text
// Antes: 1 item generico com valor total
// Depois: Lista de produtos reais

const { data: proposalItems } = await supabaseClient
  .from("proposal_items")
  .select("name, description, quantity, unit_price")
  .eq("proposal_id", proposalId)
  .eq("is_enabled", true);

const lineItems = proposalItems?.map(item => ({
  price_data: {
    currency: proposal.currency?.toLowerCase() || "eur",
    product_data: {
      name: item.name,
      description: item.description || undefined,
    },
    unit_amount: Math.round(item.unit_price * 100),
  },
  quantity: item.quantity,
})) || [];

// Fallback se nao houver itens
if (lineItems.length === 0) {
  lineItems.push({
    price_data: {
      currency: proposal.currency?.toLowerCase() || "eur",
      product_data: { name: proposal.title },
      unit_amount: Math.round(proposal.price * 100),
    },
    quantity: 1,
  });
}

const session = await stripe.checkout.sessions.create({
  line_items: lineItems,
  // ...resto igual
});
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/proposals/CreateProposalDialog.tsx` | Chamar `useUpdateProposalItems` apos criar proposta |
| `supabase/functions/proposal-checkout/index.ts` | Enviar itens individuais ao Stripe |
| `supabase/functions/proposal-webhook/index.ts` | Criar `contact_products` ao aceitar proposta |

---

## Fluxo Apos Implementacao

```text
1. CRIAR PROPOSTA
   Utilizador adiciona produtos no carrinho
   -> Proposta criada com preco total
   -> proposal_items criados com cada produto

2. PUBLICAR E PARTILHAR
   Cliente ve proposta com lista de produtos
   Cliente pode activar/desactivar itens opcionais

3. CHECKOUT STRIPE
   Stripe recebe lista de produtos individuais
   Recibo detalha cada item comprado

4. PAGAMENTO CONCLUIDO (Webhook)
   Proposta marcada como aceite
   Oportunidade marcada como ganha
   Para cada item:
     -> Cria registo em contact_products
     -> Produto fica associado ao cliente
   
5. POS-VENDA
   Na ficha do cliente: Lista de produtos adquiridos
   Tracking de consumo (sessoes usadas, etc.)
   Historico completo de compras
```

---

## Impacto nos Relatorios

Com os `contact_products` a serem criados automaticamente:

- **Ficha de Cliente**: Mostra produtos adquiridos
- **Produto Stats**: Contagem de vendas actualizada
- **Historico**: Timeline de aquisicoes
- **Consumo**: Tracking de sessoes/unidades usadas

---

## Prioridade de Implementacao

1. **Critico** - Gravar `proposal_items` ao criar proposta
2. **Alto** - Criar `contact_products` no webhook
3. **Medio** - Checkout Stripe com itens detalhados
