

# Plano: Corrigir Texto Truncado no PDF

## Problema Identificado

O texto não aparece completo nas linhas do PDF devido a:

| Causa | Localização | Impacto |
|-------|-------------|---------|
| Componente Table com `overflow-x-auto` e `min-w-max` | `src/components/ui/table.tsx` linha 7-8 | Tabela expande além do container e é cortada |
| Nome do produto sem quebra de linha | `ProposalClientDocument.tsx` linha 289 | Texto longo é truncado |
| Descrição com `line-clamp-1` | `ProposalClientDocument.tsx` linha 293 | Apenas 1 linha visível |
| Larguras de coluna fixas muito estreitas | Colunas com `w-[6%]`, `w-[14%]` etc | Texto não cabe na coluna |

---

## Solução

### 1. Sobrescrever Estilos da Table para PDF

Adicionar classe específica que remove os estilos problemáticos:

```typescript
// ProposalClientDocument.tsx
<Table className="table-fixed w-full [&>div]:overflow-visible">
```

Ou criar um wrapper sem overflow:

```typescript
<div className="[&_.overflow-x-auto]:overflow-visible">
  <Table className="table-fixed w-full">
```

### 2. Permitir Quebra de Linha no Nome do Produto

Remover truncação e permitir que o texto quebre em múltiplas linhas:

```typescript
// ANTES:
<p className="font-medium text-gray-900 text-sm leading-tight">
  {item.name}
</p>

// DEPOIS:
<p className="font-medium text-gray-900 text-sm leading-tight break-words">
  {item.name}
</p>
```

### 3. Permitir Mais Linhas na Descrição

Aumentar ou remover `line-clamp`:

```typescript
// ANTES:
<p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
  {item.description}
</p>

// DEPOIS:
<p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
  {item.description}
</p>
```

### 4. Ajustar Larguras das Colunas

Aumentar a coluna de "Item" e reduzir outras:

```typescript
// ANTES:
<TableHead className="w-[6%]">#</TableHead>
<TableHead className={cn(allowItemToggle ? "w-[44%]" : "w-[52%]")}>Item</TableHead>
<TableHead className="w-[14%] text-right">Preço</TableHead>
<TableHead className="w-[10%] text-center">Qtd</TableHead>
<TableHead className="w-[14%] text-right">Total</TableHead>

// DEPOIS:
<TableHead className="w-[5%]">#</TableHead>
<TableHead className={cn(allowItemToggle ? "w-[47%]" : "w-[55%]")}>Item</TableHead>
<TableHead className="w-[13%] text-right">Preço</TableHead>
<TableHead className="w-[9%] text-center">Qtd</TableHead>
<TableHead className="w-[13%] text-right">Total</TableHead>
```

### 5. Remover `min-w-max` da Tabela para Captura PDF

Adicionar estilos inline ou classe de override:

```typescript
<Table className="table-fixed w-full !min-w-0">
```

---

## Ficheiros a Modificar

### `src/components/proposals/ProposalClientDocument.tsx`

| Linha | Alteração |
|-------|-----------|
| ~227 | Adicionar `!min-w-0` à Table para remover largura mínima |
| ~233-237 | Ajustar larguras das colunas para dar mais espaço ao Item |
| ~289 | Adicionar `break-words` ao nome do produto |
| ~293 | Mudar `line-clamp-1` para `line-clamp-2` |

### Alteração Específica na Tabela

```typescript
// Wrapper para remover overflow que corta conteúdo
<div className="[&_div.overflow-x-auto]:overflow-visible">
  <Table className="table-fixed w-full">
    <TableHeader>
      <TableRow className="border-gray-200">
        {allowItemToggle && (
          <TableHead className="w-[7%] text-gray-600">Incluir</TableHead>
        )}
        <TableHead className="w-[5%] text-gray-600">#</TableHead>
        <TableHead className={cn(allowItemToggle ? "w-[47%]" : "w-[55%]", "text-gray-600")}>Item</TableHead>
        <TableHead className="w-[13%] text-right text-gray-600">Preço</TableHead>
        <TableHead className="w-[8%] text-center text-gray-600">Qtd</TableHead>
        <TableHead className="w-[12%] text-right text-gray-600">Total</TableHead>
      </TableRow>
    </TableHeader>
    {/* ... */}
  </Table>
</div>
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Texto cortado após poucos caracteres | Texto completo com quebra de linha |
| Descrição limitada a 1 linha | Descrição com até 2 linhas |
| Tabela com scroll horizontal | Tabela fixa que cabe no A4 |
| Nomes truncados | Nomes completos visíveis |

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| ProposalClientDocument.tsx | ~15 linhas alteradas |
| **Total** | ~15 linhas |

