

# Calculo Automatico de Envio CTT no Checkout

## Objetivo

Substituir os metodos de envio com precos fixos por um calculo automatico baseado na tabela de precos CTT 2026, usando o peso total da encomenda. O sistema oferecera as opcoes CTT reais (Correio Azul e Encomenda Postal) com precos calculados dinamicamente.

## Tabela de Precos CTT (2026)

Os precos obtidos do site oficial dos CTT:

### Correio Azul (Pacote Postal - ate 2kg)

| Escalao de peso | Preco |
|---|---|
| Ate 20g | 2,10 EUR |
| 20g - 50g | 2,10 EUR |
| 50g - 100g | 2,10 EUR |
| 100g - 500g | 3,90 EUR |
| 500g - 2kg | 7,80 EUR |

Prazo: ~1 dia util (continente)

### Encomenda Postal (ate 10kg)

| Escalao de peso | T1 | T2 |
|---|---|---|
| Ate 2kg | 8,25 EUR | 9,60 EUR |
| 2kg - 5kg | 10,50 EUR | 12,10 EUR |
| 5kg - 10kg | 15,55 EUR | 17,60 EUR |

Prazo: ~3 dias uteis (continente)

O sistema usara trajeto T1 por defeito (pode ser expandido futuramente).

## O Que Muda

### 1. Garantir que os produtos tem peso

A coluna `weight` ja existe na tabela `products` (tipo `numeric`, em kg). Atualmente nenhum produto tem peso preenchido.

- A criacao de produtos com IA passara a incluir o peso estimado
- O campo de peso sera visivel no formulario de edicao de produtos
- Produtos sem peso usarao um peso estimado por defeito (0.5 kg)

### 2. Nova edge function `calculate-shipping`

Recebe o peso total da encomenda e devolve as opcoes de envio CTT com precos calculados:

```text
Input: { totalWeightKg: 1.2 }
Output: [
  { id: "ctt-azul", name: "CTT Correio Azul", price: 7.80, estimate: "1 dia util", maxWeight: 2 },
  { id: "ctt-encomenda", name: "CTT Encomenda Postal", price: 8.25, estimate: "3 dias uteis", maxWeight: 10 }
]
```

Se o peso exceder 2kg, so aparece Encomenda Postal. Se exceder 10kg, mostra mensagem de contacto.

### 3. Checkout com calculo dinamico

O `StoreCheckoutPage` passara a:
- Calcular o peso total do carrinho (somando `weight * quantity` de cada item)
- Chamar a edge function para obter as opcoes CTT com precos reais
- Mostrar as opcoes com preco calculado em vez do preco fixo dos `shipping_methods`
- Enviar o custo de envio calculado para o `create-store-checkout`

### 4. IA preenche peso na criacao de produtos

O `ai-product-assistant` passara a incluir o campo `weight` (em kg) na resposta, e o `StoreQuickProductDialog` guardara esse valor ao criar o produto.

## Seccao Tecnica

### Ficheiro: `supabase/functions/calculate-shipping/index.ts` (novo)

Tabela de precos CTT hardcoded na funcao. Recebe `totalWeightKg` e opcionalmente `postalCodeOrigin`/`postalCodeDestination` (para futuro calculo T1/T2). Devolve array de opcoes disponiveis com precos.

### Ficheiro: `src/pages/store/StoreCheckoutPage.tsx`

Alteracoes:
- Buscar peso de cada produto do carrinho via query a `products` (campo `weight`)
- Calcular peso total: `sum(weight * quantity)` com fallback de 0.5kg por produto sem peso
- Chamar `calculate-shipping` quando o peso total estiver calculado
- Substituir a listagem de `shippingMethods` estáticos pelas opcoes CTT dinamicas
- Passar o preco calculado para o `create-store-checkout`

### Ficheiro: `supabase/functions/ai-product-assistant/index.ts`

Nos modos `sku-search` e `image-to-product`:
- Adicionar `"weight"` (numero em kg) ao schema de resposta da IA
- A IA estimara o peso com base no tipo de produto identificado

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

- Ler o campo `weight` da resposta da IA
- Mostrar campo de peso no formulario de preview (editavel)
- Incluir `weight` no insert do produto

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/calculate-shipping/index.ts` | Nova edge function com tabela CTT e calculo por peso |
| `src/pages/store/StoreCheckoutPage.tsx` | Calcular peso total, chamar edge function, mostrar opcoes CTT dinamicas |
| `supabase/functions/ai-product-assistant/index.ts` | Adicionar campo weight ao schema de resposta |
| `src/components/store/StoreQuickProductDialog.tsx` | Mostrar e guardar peso do produto |

Nao e necessaria migracao SQL -- a coluna `weight` (numeric) ja existe na tabela `products`.

