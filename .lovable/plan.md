
# Plano: Corrigir Visualização de Todos os Itens e Atualização do Valor Total

## Problemas Identificados

### Problema 1: Nem Todos os Itens São Visíveis
O `ScrollArea` no `ProposalItemsEditor.tsx` tem altura fixa de `h-[400px]` (linha 223). Cada item ocupa aproximadamente 150-180px (nome + quantidade + descrição + badge), então 4 itens podem ocupar ~600-720px, ultrapassando os 400px disponíveis.

O problema é que o scroll pode não estar a funcionar corretamente devido à estrutura CSS do container pai.

### Problema 2: Valor no Header Não Atualiza
O header mostra `proposal.price` (linha 393), que é obtido da query `useProposal(proposalId)`. Este valor só atualiza quando:
1. Os itens são **guardados** na base de dados
2. A query `["proposal", proposalId]` é invalidada

Atualmente, quando se alteram quantidades **localmente**, o total no **footer** do editor atualiza (`calculateTotal()`), mas o header mostra o valor **antigo** porque ainda não foi guardado.

### Problema 3: Após Guardar, o Header Não Refresca
O hook `useUpdateProposalItems` invalida as queries corretas (linhas 597-605):
- `["proposal-items", proposalId]`
- `["proposal", proposalId]`
- `["proposals"]`

No entanto, o `ProposalDetailDialog` não está a reagir ao refresh porque o callback `onSaved` está vazio:
```typescript
<ProposalItemsEditor 
  proposalId={proposalId} 
  onSaved={() => {
    // Optionally switch back to preview after save
  }}
/>
```

---

## Soluções Propostas

### 1. Aumentar Altura do ScrollArea e Melhorar Estrutura
Mudar de altura fixa para altura dinâmica usando `flex-1`:

```typescript
// ProposalItemsEditor.tsx
// De: <ScrollArea className="h-[400px]">
// Para:
<ScrollArea className="flex-1 min-h-0">
```

E garantir que o container pai use flexbox corretamente.

### 2. Mostrar Total Calculado Localmente no Editor (Já Existe)
O footer já mostra `calculateTotal()` que é calculado em tempo real. Isto já funciona. 

O problema é que o utilizador pode estar a olhar para o header (759,70€) e não para o footer do editor.

### 3. Forçar Refetch da Proposta Após Guardar Itens
Adicionar refetch explícito no callback `onSaved`:

```typescript
// ProposalDetailDialog.tsx
<ProposalItemsEditor 
  proposalId={proposalId} 
  onSaved={async () => {
    // Forçar refetch da proposta para atualizar o header
    await queryClient.refetchQueries({ 
      queryKey: ["proposal", proposalId] 
    });
  }}
/>
```

### 4. Mostrar Indicador Visual de "Valor Pendente"
Quando há alterações não guardadas, mostrar no editor que o total ainda não foi sincronizado:

```typescript
{hasChanges && (
  <p className="text-xs text-amber-600">
    (total será atualizado após guardar)
  </p>
)}
```

---

## Ficheiros a Modificar

### 1. `src/components/proposals/ProposalItemsEditor.tsx`
- Mudar `h-[400px]` para altura dinâmica com flexbox
- Adicionar indicador visual quando há alterações não guardadas

### 2. `src/components/proposals/ProposalDetailDialog.tsx`
- Implementar callback `onSaved` para forçar refetch da proposta
- Adicionar `useQueryClient` import

---

## Alterações Técnicas

### ProposalItemsEditor.tsx

```typescript
// Linha 185-186: Container principal
return (
  <div className="flex flex-col h-full space-y-4">

// Linha 223: ScrollArea - usar flex-1 em vez de altura fixa
<ScrollArea className="flex-1 min-h-[200px]">
```

### ProposalDetailDialog.tsx

```typescript
// Adicionar import
import { useQueryClient } from "@tanstack/react-query";

// No componente, adicionar:
const queryClient = useQueryClient();

// Atualizar callback onSaved (linha 614-619):
<ProposalItemsEditor 
  proposalId={proposalId} 
  onSaved={async () => {
    // Forçar refetch para atualizar o header com novo preço
    await queryClient.refetchQueries({ 
      queryKey: ["proposal", proposalId] 
    });
  }}
/>
```

---

## Resultado Esperado

Após as correções:

1. **Todos os 4 itens serão visíveis** - O scroll funcionará corretamente
2. **O valor no header atualiza após guardar** - O refetch forçado sincroniza o preço
3. **Feedback visual claro** - O utilizador sabe quando tem alterações pendentes

---

## Estimativa

- ProposalItemsEditor.tsx: ~5 linhas alteradas
- ProposalDetailDialog.tsx: ~10 linhas alteradas
- **Total: ~15 linhas de alteração**
