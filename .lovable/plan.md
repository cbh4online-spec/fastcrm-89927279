
# Plano: Corrigir Moeda nos Itens da Proposta

## Problema Identificado

O componente `POSProposalItemsEditor` utiliza `EUR` como moeda por defeito na função `formatPrice`, ignorando a moeda real configurada na proposta. Quando a proposta é em EUR, deveria mostrar euros (€), mas está a mostrar o formato incorreto.

### Código Actual (Problemático)

```typescript
// POSProposalItemsEditor.tsx - linha 100
const formatPrice = (price: number, currency = "EUR") => {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(price);
};
```

O problema é que a moeda da proposta (`proposal.currency`) não está a ser passada para o `POSProposalItemsEditor`. O componente está a usar o valor por defeito `EUR`, mas não está a formatá-lo correctamente em todas as chamadas.

Além disso, o componente não recebe a prop `currency` do `ProposalDetailDialog`, que é onde a proposta é carregada e onde `proposal.currency` está disponível.

## Solução

1. Adicionar a prop `currency` à interface `POSProposalItemsEditorProps`
2. Passar `proposal.currency` quando o componente é utilizado no `ProposalDetailDialog`
3. Utilizar a prop `currency` em todas as chamadas de `formatPrice`

## Alterações Necessárias

### Ficheiro 1: `src/components/proposals/POSProposalItemsEditor.tsx`

**Alteração na interface (linhas 49-52):**

```typescript
interface POSProposalItemsEditorProps {
  proposalId: string;
  currency?: string;  // Adicionar esta prop
  onSaved?: () => void;
}
```

**Alteração na assinatura da função (linha 54):**

```typescript
export function POSProposalItemsEditor({ proposalId, currency = "EUR", onSaved }: POSProposalItemsEditorProps) {
```

**Alteração na função formatPrice (linhas 100-105):**

```typescript
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: currency,  // Usar a prop currency
  }).format(price);
};
```

### Ficheiro 2: `src/components/proposals/ProposalDetailDialog.tsx`

**Alteração na chamada do componente (linhas 486-493):**

```typescript
<POSProposalItemsEditor 
  proposalId={proposalId}
  currency={proposal?.currency || "EUR"}  // Adicionar esta prop
  onSaved={async () => {
    await queryClient.refetchQueries({ 
      queryKey: ["proposal", proposalId] 
    });
  }}
/>
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/POSProposalItemsEditor.tsx` | Adicionar prop `currency` e usá-la na função `formatPrice` |
| `src/components/proposals/ProposalDetailDialog.tsx` | Passar `proposal?.currency` para o `POSProposalItemsEditor` |

## Comportamento Esperado

1. Proposta em EUR → Preços formatados com €
2. Proposta em BRL → Preços formatados com R$
3. Proposta em USD → Preços formatados com $
4. A moeda é determinada pela configuração da proposta, não pelo valor por defeito

## Complexidade

Muito baixa - apenas adicionar uma prop e passá-la através da hierarquia de componentes.
