
# Plano: Toggle de Itens em Propostas (Habilitar/Desabilitar)

## Objetivo

Adicionar a funcionalidade de habilitar/desabilitar itens em propostas sem os remover, similar ao modelo HAPTIC referenciado. Esta funcionalidade sera util tanto para:

1. **Vista Interna** - A equipa pode activar/desactivar itens durante a gestao
2. **Vista Cliente (Proposta Digital)** - O cliente pode desmarcar itens que nao pretende

---

## Estrutura da Funcionalidade

### Comportamento Esperado

| Contexto | Comportamento |
|----------|---------------|
| Item Habilitado | Aparece na tabela normalmente, incluido nos totais |
| Item Desabilitado | Aparece com opacidade reduzida, riscado, excluido dos totais |
| Toggle Interno | Equipa pode alternar via Switch |
| Toggle Cliente | Cliente pode alternar via Switch na pagina publica |

---

## Alteracoes Tecnicas

### Fase 1: Base de Dados

Adicionar campo `is_enabled` a tabela `proposal_items`:

```sql
ALTER TABLE proposal_items 
ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;
```

### Fase 2: Actualizar Hook useProposalItems

Modificar `useUpdateProposalItems` para incluir o campo `is_enabled`:

```typescript
// src/hooks/useProposals.ts
items: Array<{
  id?: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  position: number;
  is_enabled?: boolean; // Novo campo
}>;
```

### Fase 3: Novo Hook para Toggle Individual

Criar hook `useToggleProposalItem` para alternar o estado de um item especifico:

```typescript
export function useToggleProposalItem() {
  return useMutation({
    mutationFn: async ({ itemId, isEnabled }: { itemId: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from("proposal_items")
        .update({ is_enabled: isEnabled })
        .eq("id", itemId);
      if (error) throw error;
      return { itemId, isEnabled };
    },
    // invalidate queries
  });
}
```

### Fase 4: Actualizar ProposalInternalView

Modificar a tabela de itens para incluir Switch funcional:

- Adicionar coluna "Activo" com Switch
- Itens desabilitados aparecem com opacidade reduzida e texto riscado
- Recalcular totais apenas com itens habilitados

```text
| Item           | Status | Qtd. | Preco | Subtotal | Activo |
|----------------|--------|------|-------|----------|--------|
| Servico A      | -      | 10   | 200€  | 2.000€   |  [●]   |
| Servico B      | -      | 5    | 150€  | 750€     |  [●]   |
| Produto X      | -      | 2    | 500€  | 1.000€   |  [○]   |  <- Desabilitado
```

### Fase 5: Actualizar ProposalClientDocument

Modificar a tabela de itens para:

- Mostrar apenas itens habilitados por defeito
- OU mostrar todos com indicacao visual de desabilitado

### Fase 6: Pagina Publica (Cliente)

Modificar `PublicProposalPage.tsx` para:

- Permitir ao cliente alternar itens via Switch
- Recalcular totais em tempo real
- Guardar alteracoes quando cliente aceita proposta

---

## Detalhes de Implementacao

### Interface Visual do Toggle

```text
+-----------------------------------------------------------+
| Item                       | Qtd | Preco | Total | Activo |
+-----------------------------------------------------------+
| Servico Premium            | 1   | 500€  | 500€  |  [●]   |
+-----------------------------------------------------------+
| Servico Basico             | 1   | 200€  | 200€  |  [○]   |
| (linha com opacidade 50%, texto riscado)                   |
+-----------------------------------------------------------+
|                                  Subtotal:         500€   |
|                                  (apenas itens activos)   |
+-----------------------------------------------------------+
```

### Logica de Calculo de Totais

```typescript
const enabledItems = items.filter(item => item.is_enabled !== false);
const itemsTotal = enabledItems.reduce((sum, item) => sum + item.total_price, 0);
```

---

## Ficheiros a Modificar/Criar

| Tipo | Ficheiro | Accao |
|------|----------|-------|
| DB | `proposal_items` | Adicionar coluna `is_enabled` |
| Editar | `src/hooks/useProposals.ts` | Adicionar hook toggle, actualizar tipos |
| Editar | `src/components/proposals/ProposalInternalView.tsx` | Adicionar Switch, logica visual |
| Editar | `src/components/proposals/ProposalClientDocument.tsx` | Filtrar/exibir itens desabilitados |
| Editar | `src/pages/PublicProposalPage.tsx` | Permitir toggle pelo cliente |
| Editar | `src/components/proposals/ProposalDetailDialog.tsx` | Passar handlers para toggle |

---

## Resultado Esperado

1. Campo `is_enabled` na tabela de itens
2. Vista Interna com Switch funcional por item
3. Itens desabilitados aparecem com estilo visual diferenciado
4. Totais recalculados automaticamente (apenas itens activos)
5. Cliente pode desmarcar itens na proposta digital
6. Alteracoes persistidas na base de dados
