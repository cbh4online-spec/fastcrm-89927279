
# Correcao do Consultor IA da Loja

Foram identificados 2 bugs que impedem o funcionamento correto do consultor IA:

---

## Bug 1: workspaceId indefinido no StorePage

Na `StorePage.tsx`, o `workspaceId` e passado ao `StoreAIAdvisor` assim:

```
workspaceId={(allProducts[0] as any).workspace_id}
```

Mas a query de produtos (`useInfiniteStoreProducts`) **nao inclui `workspace_id`** nos campos selecionados. O resultado e que `workspace_id` e sempre `undefined`, e a edge function recebe um valor invalido.

**Solucao:** O `StorePage` ja tem o `wsId` (slug do workspace). Precisamos resolver o `workspace_id` real a partir do slug. A forma mais simples e:
- Adicionar `workspace_id` ao select da `useInfiniteStoreProducts`
- Ou, em alternativa, buscar o workspace ID a partir das store settings que ja sao carregadas (via `usePublicStoreSettings`)

Vou optar por **adicionar `workspace_id` ao select** das queries de produtos (tanto na `useInfiniteStoreProducts` como na `useStoreProducts`), que e a correcao mais direta.

---

## Bug 2: Botoes de sugestao rapida nao funcionam

Os botoes "Qual o melhor produto para mim?" e "O que preciso para comecar?" executam:

```tsx
onClick={() => {
  setInput(q);
  setTimeout(() => sendMessage(), 50);
}}
```

O `sendMessage()` le `input` do estado React, mas `setInput(q)` ainda nao atualizou o estado quando `sendMessage` executa. O `input` continua vazio e a funcao sai imediatamente na verificacao `if (!input.trim())`.

**Solucao:** Modificar `sendMessage` para aceitar um parametro opcional `overrideInput`, ou enviar diretamente a mensagem sem depender do estado.

---

## Ficheiros a modificar

1. **`src/hooks/useStoreProducts.ts`** - Adicionar `workspace_id` ao select das queries de lista de produtos
2. **`src/components/store/StoreAIAdvisor.tsx`** - Corrigir a funcao `sendMessage` para aceitar texto direto e corrigir os botoes de sugestao

---

## Detalhe tecnico

### useStoreProducts.ts
- Linha 56: adicionar `workspace_id` ao select da `useStoreProducts`
- Linha 109: adicionar `workspace_id` ao select da `useInfiniteStoreProducts`

### StoreAIAdvisor.tsx
- Modificar `sendMessage` para aceitar `directInput?: string`
- Usar `directInput || input.trim()` em vez de apenas `input.trim()`
- Nos botoes de sugestao, chamar `sendMessage(q)` diretamente em vez de `setInput` + `setTimeout`
