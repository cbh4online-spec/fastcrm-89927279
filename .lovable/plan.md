

# Plano: Mostrar Campo de Preço Diretamente na Lista de Itens

## Problema Identificado

Na vista de edição de itens da proposta (tab "Itens"), o campo de preço unitário está **escondido** dentro de um painel colapsável. O utilizador tem que clicar no ícone de lápis para expandir cada item e só então consegue ver/editar o preço. Isto torna a edição de preços lenta e pouco intuitiva.

### Situação Atual

```text
+----------------------------------------+
| ≡ Nome do Produto         550,00 €    |
|   (clica no lápis para expandir)       |
|                          - 1 + [✏️][🗑]|
+----------------------------------------+
| [PAINEL ESCONDIDO]                     |
|   Preço unitário: [550.00]             |
|   Desconto (%):   [   ]                |
+----------------------------------------+
```

O preço é mostrado como texto, e para editar é necessário:
1. Clicar no lápis para expandir
2. Ver o campo "Preço unitário"
3. Alterar o valor
4. O painel fica expandido ocupando espaço

## Solução

Mostrar o preço editável diretamente na linha do item, substituindo o texto estático por um input editável. O painel colapsável pode manter-se para o desconto e outras opções avançadas.

```text
+----------------------------------------+
| ≡ Nome do Produto                      |
|   [550.00] €                  - 1 + [✏️][🗑]|
+----------------------------------------+
```

## Alterações Necessárias

### Ficheiro: `src/components/proposals/POSProposalItemsEditor.tsx`

**Localização:** Linhas ~416-425

**Substituir o texto do preço por um Input editável:**

Antes:
```typescript
<span className="text-sm font-semibold text-primary">
  {formatPrice(itemTotal)}
</span>
```

Depois:
```typescript
<div className="flex items-center gap-1">
  <Input
    type="number"
    step="0.01"
    value={item.unit_price}
    onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
    className="w-20 h-6 text-sm text-primary font-semibold text-right px-1"
    onClick={(e) => e.stopPropagation()}
  />
  <span className="text-xs text-muted-foreground">€</span>
</div>
```

**Adicionar também o total calculado:**

```typescript
<div className="text-xs text-muted-foreground mt-0.5">
  Total: {formatPrice(itemTotal)}
</div>
```

## Comportamento Esperado

1. Utilizador abre a tab "Itens" no editor de proposta
2. Vê a lista de itens no painel direito
3. Cada item mostra um campo de preço unitário editável
4. Ao alterar o preço, o total é recalculado automaticamente
5. O painel expandível continua disponível para ajustes de desconto

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/POSProposalItemsEditor.tsx` | Substituir display de preço por Input editável na linha ~416-425 |

## Considerações de UX

- O input de preço deve ser pequeno e não ocupar muito espaço
- Manter o onClick stopPropagation para evitar conflitos com drag/drop
- Mostrar o total calculado (preço × quantidade) como referência
- Manter a cor primária para destacar o preço
- O símbolo € aparece fora do input para manter consistência visual

## Complexidade

Muito baixa - apenas substituir um span por um Input no componente existente.

