

# Plano: Permitir Edicao de Precos na Visao Interna da Proposta

## Problema Identificado

Na pagina de detalhe da proposta (modo visualizacao), a tabela de itens mostra os produtos mas os precos estao apenas em modo de leitura. O utilizador pretende poder alterar os precos unitarios diretamente nesta vista, sem ter que entrar no modo de edicao completo.

### Situacao Atual

```text
+------------------------------------------+
| ProposalDetailDialog (View Mode)          |
|------------------------------------------|
|   ProposalInternalView                   |
|   +------------------------------------+ |
|   | Activo | Item | Qtd | Preco | ... | |
|   +------------------------------------+ |
|   | Switch | Nome | [X] | €100  | ... | | <- Preco apenas texto
|   +------------------------------------+ |
+------------------------------------------+
```

O componente `ProposalInternalView`:
- Recebe `onQuantityChange` nas props mas **nao esta a ser passado** pelo `ProposalDetailDialog`
- O preco e mostrado como texto estatico, sem input editavel
- Nao existe handler para atualizar precos

## Solucao

Adicionar a capacidade de editar precos unitarios diretamente na tabela da visao interna.

```text
+------------------------------------------+
| ProposalDetailDialog (View Mode)          |
|------------------------------------------|
|   ProposalInternalView                   |
|   +------------------------------------+ |
|   | Activo | Item | Qtd | Preco | ... | |
|   +------------------------------------+ |
|   | Switch | Nome | [X] | [100] | ... | | <- Input editavel
|   +------------------------------------+ |
+------------------------------------------+
```

## Alteracoes Necessarias

### 1. Ficheiro: `src/components/proposals/ProposalInternalView.tsx`

**Adicionar nova prop:**
```typescript
interface ProposalInternalViewProps {
  // ... existentes
  onPriceChange?: (itemId: string, price: number) => void;
}
```

**Substituir celula de preco por Input editavel:**
```typescript
<TableCell className="text-right">
  <Input
    type="number"
    step="0.01"
    value={item.unit_price}
    onChange={(e) => onPriceChange?.(item.id, parseFloat(e.target.value) || 0)}
    className="w-24 h-8 text-right"
    disabled={!isEnabled}
  />
</TableCell>
```

### 2. Ficheiro: `src/components/proposals/ProposalDetailDialog.tsx`

**Criar handler para atualizar preco:**
```typescript
const handleItemPriceChange = async (itemId: string, price: number) => {
  // Atualizar o preco do item na base de dados
  await supabase
    .from("proposal_items")
    .update({ unit_price: price })
    .eq("id", itemId);
  
  // Refetch para atualizar a UI
  queryClient.invalidateQueries({ queryKey: ["proposal-items", proposalId] });
};
```

**Passar handler para ProposalInternalView:**
```typescript
<ProposalInternalView
  proposal={proposal}
  items={...}
  onItemToggle={handleItemToggle}
  onQuantityChange={handleQuantityChange}  // Adicionar se nao existir
  onPriceChange={handleItemPriceChange}    // NOVO
/>
```

### 3. Ficheiro: `src/hooks/useProposals.ts`

**Adicionar hook para atualizar item individual (se nao existir):**
```typescript
export function useUpdateProposalItemPrice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, price }: { itemId: string; price: number }) => {
      const { error } = await supabase
        .from("proposal_items")
        .update({ unit_price: price })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: (_, { itemId }) => {
      // Invalidar queries relacionadas
    },
  });
}
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/proposals/ProposalInternalView.tsx` | Adicionar prop `onPriceChange` e converter coluna de preco para Input editavel |
| `src/components/proposals/ProposalDetailDialog.tsx` | Adicionar handler `handleItemPriceChange` e passar para ProposalInternalView; Tambem passar `onQuantityChange` que ja existe na interface |
| `src/hooks/useProposals.ts` | Adicionar mutation para atualizar preco de item individual (opcional - pode usar supabase direto) |

## Comportamento Esperado

1. Utilizador abre detalhe da proposta (modo visualizacao)
2. Na tabela de itens, ve campos editaveis para Quantidade e Preco
3. Ao alterar o preco, o valor e guardado automaticamente
4. Os totais (Subtotal, Margem, Total) sao recalculados em tempo real
5. Nao e necessario entrar no modo "Editar" completo para ajustes rapidos de preco

## Consideracoes de UX

- Inputs aparecem apenas quando o item esta activo
- Debounce opcional para evitar muitas chamadas a BD em alteracoes rapidas
- Feedback visual quando o valor e guardado (opcional)
- Manter consistencia com o estilo do Input de quantidade ja existente

## Complexidade

Baixa/Media - Envolve modificar a interface e adicionar logica de persistencia.

