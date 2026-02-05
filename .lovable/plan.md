
# Plano: Preços Diferenciados por Contacto

## Resumo Executivo

O sistema já possui a infraestrutura de **Escalões de Preço** (`client_price_tiers` e `product_tier_prices`), mas está apenas parcialmente implementado:
- Existe no lado B2B (`client_users.price_tier_id`)  
- **NÃO existe** no lado dos contactos CRM (`contacts` não tem `price_tier_id`)
- O portal B2B mostra sempre o `base_price` sem aplicar descontos de tier

Este plano liga os contactos aos escalões e aplica os preços automaticamente.

## Arquitectura Actual vs. Proposta

```text
ACTUAL:
┌─────────────────────────────────────────────────────────────────────────┐
│  products.base_price → Catálogo B2B → base_price exibido               │
│                      → Propostas → base_price usado                     │
│                                                                         │
│  client_price_tiers ────┐                                               │
│  product_tier_prices ───┴─→ NÃO UTILIZADO em nenhum lugar              │
│                                                                         │
│  contacts ─────────────────→ SEM campo price_tier_id                    │
└─────────────────────────────────────────────────────────────────────────┘

PROPOSTA:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  contacts.price_tier_id ──┬──→ Propostas: getEffectivePrice()          │
│                           │                                             │
│  client_users.price_tier_id ──→ Portal B2B: preço com desconto         │
│                           │                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  LÓGICA DE PREÇO EFETIVO                                          │  │
│  │  1. Verificar se existe ProductTierPrice específico para produto  │  │
│  │  2. Se sim → usar price_net do tier                               │  │
│  │  3. Se não → aplicar discount_percentage do tier ao base_price   │  │
│  │  4. Se não tem tier → usar base_price                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alterações Necessárias

### 1. Base de Dados

Adicionar coluna `price_tier_id` à tabela `contacts`:

```sql
ALTER TABLE contacts 
ADD COLUMN price_tier_id uuid REFERENCES client_price_tiers(id);

COMMENT ON COLUMN contacts.price_tier_id IS 
  'Escalão de preço atribuído ao contacto para cálculo de descontos';
```

### 2. UI de Gestão - Perfil Comercial do Contacto

Adicionar selector de Escalão de Preço no `CommercialProfileSection.tsx`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Escalão de Preço | Select | Lista de tiers do workspace |

Visual proposto:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Perfil Comercial                                    Cliente A  │
├─────────────────────────────────────────────────────────────────┤
│  Status do Cliente    [Ativo              ▼]                   │
│  Cliente Desde        [2024-01-15         📅]                  │
│  Escalão de Preço     [🏷️ Gold - 15%     ▼]    ← NOVO CAMPO   │
│  Fonte do Lead        [Instagram          ▼]                   │
│  Tags                 [tag1] [tag2] [+]                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Portal B2B - Aplicar Preço do Tier

Modificar `useClientProducts.ts` para buscar e aplicar o tier do cliente:

```typescript
// Antes (actual)
unit_price_net: product.base_price

// Depois (proposta)
const effectivePrice = await getEffectivePrice(
  product.base_price,
  clientUser.tier,           // Dados do tier do cliente
  tierPrice                  // Preço específico do produto para o tier
);
unit_price_net: effectivePrice
```

O catálogo mostrará:
- Preço original riscado (se houver desconto)
- Preço com desconto do tier
- Badge com nome do tier

### 4. Propostas - Pré-carregar Preço do Contacto

Quando um contacto é selecionado para uma proposta:

1. Buscar o `price_tier_id` do contacto/lead associado à oportunidade
2. Para cada produto adicionado ao carrinho, calcular `getEffectivePrice()`
3. Mostrar indicador visual de desconto aplicado

```text
┌─────────────────────────────────────────────────────────────────┐
│  Carrinho da Proposta                                           │
├─────────────────────────────────────────────────────────────────┤
│  Cliente: João Silva (Escalão Gold - 15%)                       │
├─────────────────────────────────────────────────────────────────┤
│  Produto A              Qty: 2    85,00€  [era 100€]    170,00€│
│  Produto B              Qty: 1    42,50€  [era 50€]      42,50€│
├─────────────────────────────────────────────────────────────────┤
│  Total:                                                 212,50€│
│  Desconto Gold aplicado (-15%):                        -37,50€│
└─────────────────────────────────────────────────────────────────┘
```

### 5. Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `(migração SQL)` | Adicionar `price_tier_id` à tabela `contacts` |
| `src/types/contact.ts` ou `ENIContactTypes.ts` | Adicionar tipo `price_tier_id` |
| `src/components/contacts/eni/sections/CommercialProfileSection.tsx` | Adicionar selector de tier |
| `src/hooks/client-portal/useClientProducts.ts` | Aplicar preço do tier aos produtos |
| `src/pages/client/ClientCatalogPage.tsx` | Mostrar preço com desconto e indicador |
| `src/hooks/useProposalItems.ts` | Calcular preços com tier do contacto |
| `src/components/proposals/POSProposalBuilder.tsx` | Passar tier do contacto |
| `src/components/proposals/ProposalCart.tsx` | Mostrar descontos de tier |

### 6. Fluxo de Utilização

```text
ADMINISTRADOR:
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Produtos → Gerir Escalões → Criar "Gold" com 15% desconto          │
│  2. Contactos → Detalhe → Perfil Comercial → Escalão: Gold             │
│  3. Propostas → Selecionar oportunidade do contacto                    │
│     → Produtos já aparecem com preço Gold aplicado                     │
└─────────────────────────────────────────────────────────────────────────┘

CLIENTE B2B:
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Login no Portal B2B                                                │
│  2. Catálogo → Produtos mostram "Preço Gold: 85€" (era 100€)          │
│  3. Adicionar ao carrinho → Preço Gold mantido                         │
│  4. Checkout → Total com desconto aplicado                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Hook de Pricing Unificado

Criar um hook `useContactPricing` para reutilização:

```typescript
export function useContactPricing(contactId: string | undefined) {
  // 1. Buscar price_tier_id do contacto
  // 2. Buscar dados do tier
  // 3. Retornar função getProductPrice(productId, basePrice)
  
  return {
    tier,                    // Dados do tier
    discountPercentage,      // % de desconto
    getProductPrice,         // Função async para preço específico
    getProductPriceSync,     // Função sync para desconto geral
  };
}
```

## Benefícios

1. **Preços personalizados** - Cada cliente vê o seu preço exclusivo
2. **Consistência** - Mesmo preço no CRM e no Portal B2B
3. **Flexibilidade** - Desconto geral do tier OU preço específico por produto
4. **Automação** - Propostas já aplicam desconto sem intervenção manual
5. **Transparência** - Cliente vê claramente o desconto que está a receber

## Considerações Técnicas

### Performance
- Preços de tier são cacheados por React Query
- `getProductPriceSync` usa desconto geral (instantâneo)
- `getProductPrice` consulta preços específicos (async)

### Migração de Dados
- Contactos existentes ficam sem tier (preço base mantido)
- Administrador pode atribuir tiers em massa via edição múltipla
