
# Plano: Corrigir Preview e Exportação PDF do Documento

## Problemas Identificados (do PDF exportado)

| Problema | Causa |
|----------|-------|
| Nome dos produtos não aparece no PDF | Tabela tem `overflow-x-auto` e `html2canvas` não captura todo o conteúdo |
| Imagens dos produtos em falta | Imagens CORS ou layout cortado |
| Layout desconfigurado | Documento mais largo que A4, colunas truncadas |
| Preview não responsivo | Falta de estilos específicos para captura PDF |

---

## Solução Completa

### 1. Restruturar a Tabela para Caber em A4

A tabela actual tem demasiadas colunas estreitas. Simplificar para layout mais compacto:

```text
ANTES (6 colunas, cortadas):
│ # │ Incluir │ Item/Descrição │ Preço │ Qtd │ Total │

DEPOIS (layout empilhado, cabe em A4):
│ # │ Imagem + Item │ Preço Unitário x Qtd = Total │
```

Ou manter colunas mas remover `overflow-x-auto` e garantir que cabem:

```typescript
// ProposalClientDocument.tsx - Remover overflow que corta conteúdo
<div className="px-4 md:px-8 py-6"> {/* SEM overflow-x-auto */}
  <Table className="table-fixed w-full"> {/* table-fixed para larguras fixas */}
```

### 2. Garantir Que Imagens Carregam Antes do html2canvas

```typescript
// ProposalDocumentPreviewDialog.tsx
const handleDownload = async () => {
  if (!documentRef.current) return;
  setIsGenerating(true);
  
  try {
    // 1. Esperar que todas as imagens carreguem
    const images = documentRef.current.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(img => 
        img.complete ? Promise.resolve() : 
        new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        })
      )
    );
    
    // 2. Dar tempo extra para renderização
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Capturar com opções melhoradas
    const canvas = await html2canvas(documentRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: documentRef.current.scrollWidth, // Captura toda a largura
      windowHeight: documentRef.current.scrollHeight, // Captura toda a altura
    });
    // ... resto do código
  }
};
```

### 3. Ajustar Layout da Tabela para A4

```typescript
// ProposalClientDocument.tsx - Tabela simplificada
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[8%]">#</TableHead>
      <TableHead className="w-[50%]">Item</TableHead>
      <TableHead className="w-[14%] text-right">Preço</TableHead>
      <TableHead className="w-[12%] text-center">Qtd</TableHead>
      <TableHead className="w-[16%] text-right">Total</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item, index) => (
      <TableRow key={item.id}>
        <TableCell>{index + 1}</TableCell>
        <TableCell>
          <div className="flex items-start gap-2">
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt=""
                className="w-10 h-10 object-cover rounded flex-shrink-0"
                crossOrigin="anonymous" // Para CORS
              />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{item.name}</p>
              {item.description && (
                <p className="text-xs text-gray-500 truncate">{item.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right text-sm">
          {formatCurrency(item.unit_price)}
        </TableCell>
        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(item.total_price)}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4. Criar Wrapper Específico para PDF

Um container com largura fixa para garantir captura consistente:

```typescript
// No ref do documento
<div 
  ref={documentRef}
  className="bg-white"
  style={{ width: '794px' }} // Largura A4 em pixels
>
  <ProposalClientDocument ... />
</div>
```

---

## Ficheiros a Modificar

### `src/components/proposals/ProposalClientDocument.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Remover `overflow-x-auto` | Impede corte da tabela no PDF |
| Usar `table-fixed` | Larguras consistentes |
| Simplificar colunas | 5 colunas essenciais |
| Adicionar `crossOrigin="anonymous"` | Permite captura de imagens |
| Reduzir tamanhos de imagem | `w-10 h-10` em vez de `w-12 h-12` |

### `src/components/proposals/ProposalDocumentPreviewDialog.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Esperar imagens carregarem | Loop com Promise.all sobre `<img>` |
| Container com largura fixa | `style={{ width: '794px' }}` |
| windowWidth/windowHeight no html2canvas | Captura scroll completo |

---

## Estrutura Visual Corrigida

```text
┌──────────────────────────────────────────────────────────────┐
│  [Logo] │  Proposta Nº XXX          │ [Badge: Rascunho]     │
│ Empresa │  Data: 21 de Janeiro      │                       │
│         ├────────────────────────────────────────────────────┤
│         │  PROPOSTA PARA                                     │
│         │  Cliente: Rick Varandas                           │
│         │  Email: rick@...                                   │
├─────────┴────────────────────────────────────────────────────┤
│  #  │ [IMG] Item/Descrição        │  Preço  │ Qtd │  Total  │
├─────┼──────────────────────────────┼─────────┼─────┼─────────┤
│  1  │ [📷] Produto 1               │ 550,00€ │  1  │ 550,00€ │
│     │      Descrição curta         │         │     │         │
├─────┼──────────────────────────────┼─────────┼─────┼─────────┤
│  2  │ [📷] Produto 2               │  79,90€ │  4  │ 319,60€ │
│     │      Outra descrição         │         │     │         │
├─────┴──────────────────────────────┴─────────┴─────┴─────────┤
│                                        Subtotal:   2138,10€  │
│                                        IVA (23%):   491,76€  │
│                                        ─────────────────────  │
│                                        TOTAL:      2629,86€  │
├──────────────────────────────────────────────────────────────┤
│ Métodos de Pagamento          │              [Assinatura]    │
│ • Transferência Bancária      │               ____________   │
│ • Condições: Pronto Pagamento │               Nome, Título   │
├──────────────────────────────────────────────────────────────┤
│      Esta proposta é válida até 20 de Fevereiro de 2026.     │
└──────────────────────────────────────────────────────────────┘
```

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| ProposalClientDocument.tsx | ~30 linhas alteradas |
| ProposalDocumentPreviewDialog.tsx | ~25 linhas adicionadas |
| **Total** | ~55 linhas |
