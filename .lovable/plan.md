

# Plano de Correção: Editor de Itens da Proposta

## Diagnóstico do Problema

Após análise detalhada do código e da base de dados, identifiquei os seguintes problemas:

### 1. Preview Nao Atualiza com os Itens
O componente `ProposalPreview` **nao mostra os itens da proposta** - ele apenas renderiza os `content_blocks` (blocos de conteudo como texto, imagens, FAQs). Os itens guardados na tabela `proposal_items` nao sao exibidos em lado nenhum do preview.

### 2. Estrutura do Componente Badge
Ha um warning no console relacionado com o componente `Badge` a receber uma ref - isto e um problema menor mas deve ser corrigido.

### 3. Fluxo de Dados Incompleto
Quando os itens sao guardados:
- Os dados sao inseridos corretamente na tabela `proposal_items`
- O preco total e atualizado na proposta
- MAS o preview nao mostra os itens porque nao ha uma seccao dedicada para isso

---

## Solucao Proposta

### Fase 1: Adicionar Secao de Itens ao Preview

Modificar o `ProposalPreview.tsx` para incluir uma tabela de itens da proposta:

```text
+--------------------------------------------------+
|  TITULO DA PROPOSTA                              |
|  [Badge com preco total]                         |
+--------------------------------------------------+
|  [Content Blocks - texto, imagens, etc.]         |
+--------------------------------------------------+
|  TABELA DE PRODUTOS/SERVICOS  <-- NOVA SECAO    |
|  +------------+------+--------+--------+        |
|  | Nome       | Qtd  | Preco  | Total  |        |
|  +------------+------+--------+--------+        |
|  | Item 1     | 1    | 450 EUR| 450 EUR|        |
|  | Item 2     | 2    | 100 EUR| 200 EUR|        |
|  +------------+------+--------+--------+        |
|  |                   TOTAL    | 650 EUR|        |
|  +----------------------------+--------+        |
+--------------------------------------------------+
|  [CTA Button]                                    |
+--------------------------------------------------+
```

**Ficheiro:** `src/components/proposals/ProposalPreview.tsx`
- Adicionar prop `items` (opcional) para receber os itens da proposta
- Criar seccao de tabela de itens antes do CTA
- Formatar precos em EUR com locale pt-PT

### Fase 2: Passar os Itens ao Preview

**Ficheiro:** `src/components/proposals/ProposalDetailDialog.tsx`
- Os itens ja sao carregados via `useProposalItems`
- Passar os `proposalItems` como prop ao `ProposalPreview`

### Fase 3: Melhorias de Layout no Editor de Itens

**Ficheiro:** `src/components/proposals/ProposalItemsEditor.tsx`

Melhorias propostas:
1. **Adicionar campo de descricao** - permitir editar a descricao de cada item
2. **Melhor feedback visual ao guardar** - mostrar estado mais claro
3. **Auto-save opcional** - guardar automaticamente apos alteracoes (com debounce)
4. **Indicador de alteracoes pendentes** - mostrar claramente quando ha dados por guardar
5. **Corrigir o Badge** - remover ref implicita que causa o warning

### Fase 4: Correcoes de UX

1. **Corrigir currency padrao** no `ProposalPreview` - alterar de "BRL" para "EUR" no `formatCurrency`
2. **Invalidar queries corretamente** apos guardar itens para atualizar o preview
3. **Adicionar confirmacao visual** mais explicita apos gravacao bem-sucedida

---

## Detalhes Tecnicos

### Alteracoes no ProposalPreview.tsx

```typescript
// Adicionar nova interface para itens
interface PreviewItem {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ProposalPreviewProps {
  // ... props existentes
  items?: PreviewItem[]; // NOVO
}

// Adicionar seccao de itens no render:
{items && items.length > 0 && (
  <Card className="p-6">
    <h3 className="text-lg font-semibold mb-4">Produtos e Servicos</h3>
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th>Descricao</th>
          <th>Qtd.</th>
          <th>Preco Unit.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (...))}
      </tbody>
      <tfoot>
        <tr className="font-bold">
          <td colSpan={3}>TOTAL</td>
          <td>{formatCurrency(totalSum)}</td>
        </tr>
      </tfoot>
    </table>
  </Card>
)}
```

### Alteracoes no ProposalDetailDialog.tsx

```typescript
// No TabsContent de preview:
<ProposalPreview
  {...outrasProps}
  items={proposalItems?.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price || (item.quantity * item.unit_price),
  }))}
/>
```

### Alteracoes no ProposalItemsEditor.tsx

```typescript
// Corrigir Badge - usar span em vez de deixar componente receber ref implicita
{item.product_id && (
  <span className="inline-flex items-center mt-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
    <Package className="h-3 w-3 mr-1" />
    Produto do catalogo
  </span>
)}

// Adicionar campo de descricao opcional
<div className="col-span-12 space-y-1">
  <label className="text-xs text-muted-foreground">Descricao (opcional)</label>
  <Input
    value={item.description || ""}
    onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
    placeholder="Descricao adicional..."
    className="h-8"
  />
</div>
```

---

## Resumo das Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `ProposalPreview.tsx` | Adicionar seccao de tabela de itens, corrigir currency padrao |
| `ProposalDetailDialog.tsx` | Passar items ao preview |
| `ProposalItemsEditor.tsx` | Melhorar layout, adicionar campo descricao, corrigir Badge warning |

---

## Resultado Esperado

Apos implementacao:
1. Os itens adicionados/editados serao vissiveis no preview imediatamente apos guardar
2. O preview mostrara uma tabela profissional com todos os produtos/servicos
3. Os precos estarao em EUR com formatacao pt-PT
4. O warning do Badge sera eliminado
5. A experiencia de edicao sera mais intuitiva com feedback claro

