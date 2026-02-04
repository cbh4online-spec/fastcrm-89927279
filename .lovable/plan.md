
# Plano: Corrigir Visibilidade do Preço e Quantidade no Painel de Itens

## Problema Identificado

Analisando a imagem enviada, o painel direito "Itens da Proposta" mostra os itens com:
- Nome do produto (truncado)
- Controlos de quantidade (-, número, +) 
- Ícones de ação (lápis, lixo)

**O campo de preço editável não está visível** apesar de estar implementado no código. O problema é que o layout horizontal actual está demasiado congestionado, fazendo com que o preço (que está numa segunda linha dentro do bloco flex-1) não seja visível ou fique cortado.

### Layout Actual (Problemático)

```text
+----------------------------------------------------------+
| ≡ | Nome muito longo que fica trunc... | [-][1][+] | ✏🗑 |
|   | [Preço] € (linha abaixo - não visível)              |
+----------------------------------------------------------+
```

O preço está numa segunda linha dentro do div flex-1, mas devido ao overflow e ao espaço limitado, não está a aparecer.

## Solução

Reorganizar o layout dos itens para um formato mais compacto e vertical que garanta a visibilidade de todos os campos editáveis:

### Novo Layout (Proposto)

```text
+------------------------------------------+
| ≡ Nome do Produto                  | ✏🗑 |
|   [100.00]€  x  [-][1][+] = 100,00€     |
+------------------------------------------+
```

**Estrutura:**
- Linha 1: Drag handle + Nome + Ações (editar/remover)
- Linha 2: Preço unitário + "x" + Quantidade + "=" + Total

## Alterações Necessárias

### Ficheiro: `src/components/proposals/POSProposalItemsEditor.tsx`

Reorganizar o layout do card de item (linhas 396-488) para:

1. **Primeira linha**: Handle de arrastar, nome do produto, botões de ação
2. **Segunda linha**: Input de preço, separador "x", controlos de quantidade, total calculado

```typescript
<Card className={cn("p-3 bg-muted/30 ...", ...)}>
  {/* Linha 1: Nome e Ações */}
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab" />
      <h4 className="font-medium text-sm truncate">{item.name}</h4>
      {hasOverride && <Badge>Editado</Badge>}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <CollapsibleTrigger>...</CollapsibleTrigger>
      <Button onClick={remove}>🗑</Button>
    </div>
  </div>

  {/* Linha 2: Preço x Quantidade = Total */}
  <div className="flex items-center gap-2 mt-2">
    <div className="flex items-center gap-1">
      <Input type="number" value={unit_price} className="w-20" />
      <span>€</span>
    </div>
    <span className="text-muted-foreground">×</span>
    <div className="flex items-center gap-1">
      <Button>-</Button>
      <Input type="number" value={quantity} className="w-12" />
      <Button>+</Button>
    </div>
    <span className="text-muted-foreground">=</span>
    <span className="font-semibold">{total}€</span>
  </div>
</Card>
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/POSProposalItemsEditor.tsx` | Reorganizar layout do card de item (linhas 385-488) para formato vertical com 2 linhas separadas |

## Comportamento Esperado

1. Utilizador abre a tab "Itens" no editor de proposta
2. No painel direito, cada item mostra:
   - Nome do produto na primeira linha
   - Preço (editável) × Quantidade (editável) = Total na segunda linha
3. Todos os campos são visíveis sem truncamento
4. O utilizador pode editar preço e quantidade directamente

## Benefícios

- Layout mais legível e organizado
- Todos os campos editáveis sempre visíveis
- Fórmula clara: Preço × Quantidade = Total
- Melhor uso do espaço vertical disponível
- Funciona bem em ecrãs de diferentes tamanhos

## Complexidade

Média - Requer reorganização do JSX do card de item mantendo toda a lógica existente.
