

# Plano: Adicionar Input Editável para Quantidade na Lista de Itens

## Problema Identificado

Atualmente, a quantidade de cada item é mostrada como texto estático entre os botões - e +. Para alterações rápidas de quantidade (ex: de 1 para 10), o utilizador tem que clicar várias vezes nos botões.

### Situação Atual

```text
+----------------------------------------+
| Nome do Produto                        |
| [550.00] €                 [-] 1 [+]   | <- Quantidade é texto
+----------------------------------------+
```

A quantidade está num `<span>` simples:
```typescript
<span className="w-6 text-center text-sm font-medium">
  {item.quantity}
</span>
```

## Solução

Substituir o `<span>` por um `<Input>` editável que permite digitar diretamente a quantidade desejada.

```text
+----------------------------------------+
| Nome do Produto                        |
| [550.00] €                 [-][10][+]  | <- Input editável
+----------------------------------------+
```

## Alterações Necessárias

### Ficheiro: `src/components/proposals/POSProposalItemsEditor.tsx`

**Localização:** Linhas 451-453

**Substituir o span por Input:**

Antes:
```typescript
<span className="w-6 text-center text-sm font-medium">
  {item.quantity}
</span>
```

Depois:
```typescript
<Input
  type="number"
  min="1"
  value={item.quantity}
  onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
  onClick={(e) => e.stopPropagation()}
  className="w-12 h-6 text-center text-sm font-medium px-1"
/>
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/POSProposalItemsEditor.tsx` | Substituir span da quantidade por Input editável (linhas 451-453) |

## Comportamento Esperado

1. Utilizador abre a tab "Itens" no editor de proposta
2. Vê a lista de itens com preço e quantidade editáveis
3. Pode digitar diretamente no campo de quantidade (ex: escrever "10")
4. Os botões - e + continuam a funcionar para ajustes incrementais
5. O total é recalculado automaticamente

## Considerações de UX

- O input tem `min="1"` para evitar quantidades zero ou negativas
- Se o valor for inválido, usa 1 como fallback
- `onClick stopPropagation` evita conflitos com drag/drop
- O input é ligeiramente mais largo (w-12) para acomodar números maiores

## Complexidade

Muito baixa - apenas substituir um span por um Input no mesmo local.

