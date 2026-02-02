

# Plano: Corrigir Visualização Multi-Página na Pré-visualização

## Problema Identificado

A pré-visualização do documento mostra todo o conteúdo num único bloco contínuo sem indicação visual das quebras de página. Quando o documento tem muitos itens ou conteúdo, as "novas páginas" não são visíveis porque:

1. O documento é renderizado como um `Card` único sem altura máxima
2. Não há separação visual de páginas A4
3. A altura do conteúdo excede uma página A4 (297mm ≈ 1123px), mas o utilizador não vê onde uma página termina e outra começa

O sistema de export PDF fatia o documento correctamente em páginas, mas a **pré-visualização no ecrã** não mostra essa separação.

## Solução

Implementar uma visualização paginada que:
1. Divide o documento em secções lógicas (header, tabela, footer)
2. Mostra cada página A4 como um bloco separado visualmente
3. Indica claramente "Página 1 de X"

### Abordagem: CSS Print Simulation

Adicionar separadores visuais de página na pré-visualização usando CSS e calcular quebras naturais baseadas na altura do conteúdo.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalDocumentPreviewDialog.tsx` | Adicionar indicadores visuais de página e paginação |
| `src/components/proposals/ProposalClientDocument.tsx` | Adicionar `data-pdf-section` aos blocos lógicos para quebras inteligentes |

## Implementação

### 1. ProposalClientDocument.tsx - Marcar Secções

Adicionar atributos `data-pdf-section` aos blocos lógicos do documento:

```typescript
{/* Header Section */}
<div data-pdf-section="header" className="flex flex-col md:flex-row">
  {/* ... sidebar e header ... */}
</div>

{/* Items Table Section */}
<div data-pdf-section="items" className="px-4 md:px-8 py-6">
  {/* ... tabela ... */}
</div>

{/* Footer Section */}
<div data-pdf-section="footer" className="bg-gray-50 px-4 md:px-8 py-6 border-t mt-4">
  {/* ... footer ... */}
</div>
```

### 2. ProposalDocumentPreviewDialog.tsx - Visualização Paginada

Implementar um sistema que:

```typescript
// Calcular páginas visualmente
const [pages, setPages] = useState<number>(1);

useEffect(() => {
  if (documentRef.current) {
    const docHeight = documentRef.current.scrollHeight;
    const pageHeight = 1123; // A4 height at 96 DPI
    setPages(Math.ceil(docHeight / pageHeight));
  }
}, [proposal, items]);

// No render, adicionar separadores visuais
<div className="relative">
  <div ref={documentRef} className="bg-white" style={{ width: '794px' }}>
    <ProposalClientDocument ... />
  </div>
  
  {/* Page break indicators */}
  {Array.from({ length: pages - 1 }).map((_, i) => (
    <div 
      key={i}
      className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 bg-amber-50/50 py-1 text-center text-xs text-amber-600 print:hidden"
      style={{ top: `${(i + 1) * 1123}px` }}
    >
      ── Quebra de Página {i + 2} ──
    </div>
  ))}
</div>

{/* Page counter */}
<div className="text-center text-sm text-muted-foreground mt-4 print:hidden">
  Documento com {pages} página{pages > 1 ? 's' : ''}
</div>
```

### 3. Alternativa: Múltiplos Cards de Página

Para uma experiência mais próxima do PDF real, podemos renderizar cada página como um card separado:

```typescript
// Capturar cada secção individualmente no preview
const renderPaginatedPreview = () => {
  const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI
  const sections = ['header', 'items', 'totals', 'footer'];
  
  return (
    <div className="space-y-8">
      {/* Render with page separators */}
      <div className="relative">
        <div 
          ref={documentRef}
          className="bg-white shadow-lg"
          style={{ width: '794px', minHeight: `${A4_HEIGHT_PX}px` }}
        >
          <ProposalClientDocument ... />
        </div>
        
        {/* Visual page indicators */}
        <PageBreakIndicators containerRef={documentRef} pageHeight={A4_HEIGHT_PX} />
      </div>
    </div>
  );
};
```

## Resultado Esperado

- O utilizador vê claramente onde cada página A4 termina
- Indicadores visuais "Página X de Y" mostram a extensão do documento
- Preview corresponde exactamente ao output PDF
- Linhas tracejadas amarelas indicam quebras de página

## Complexidade

Média - requer calcular altura dinâmica e posicionar indicadores

