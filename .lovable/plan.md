

# Plano: Corrigir Preservação de Páginas no PDF

## Problema Identificado

O algoritmo actual de geração de PDF:
1. **Captura todo o documento como uma única imagem grande**
2. **Fatia a imagem em intervalos fixos** (altura A4 - margens)
3. **Ignora as secções lógicas** marcadas com `data-pdf-section`

Resultado: O conteúdo é cortado arbitrariamente, e a capa aparece junto com o Âmbito na mesma página.

## Solução: Captura por Secções

Em vez de capturar o documento inteiro, capturar **cada secção separadamente** usando os atributos `data-pdf-section` já existentes, e adicionar cada secção ao PDF com gestão inteligente de quebras de página.

## Secções Existentes

```html
<div data-pdf-section="cover">...</div>      <!-- Página 1 - sempre separada -->
<div data-pdf-section="scope">...</div>       <!-- Âmbito -->
<div data-pdf-section="timeline">...</div>    <!-- Cronograma -->
<div data-pdf-section="references">...</div>  <!-- Referências -->
<div data-pdf-section="proposal">...</div>    <!-- Proposta e Condições -->
```

## Implementação

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalDocumentPreviewDialog.tsx` | Reescrever `handleDownload` com captura por secções |

### Nova Lógica de Geração de PDF

```typescript
const handleDownload = async () => {
  // 1. Encontrar todas as secções
  const sections = Array.from(
    documentRef.current.querySelectorAll('[data-pdf-section]')
  ) as HTMLElement[];
  
  // 2. Capturar cada secção individualmente
  const sectionData = [];
  for (const section of sections) {
    const sectionName = section.getAttribute('data-pdf-section');
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    
    // Calcular altura em mm
    const widthPx = canvas.width / 2; // scale: 2
    const heightPx = canvas.height / 2;
    const scaleFactor = CONTENT_WIDTH_MM / widthPx;
    const heightMM = heightPx * scaleFactor;
    
    sectionData.push({ 
      canvas, 
      heightMM, 
      name: sectionName,
      forceNewPage: sectionName === 'cover' // Capa sempre em página separada
    });
  }
  
  // 3. Criar PDF com quebras de página inteligentes
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const MARGIN = 10;
  const A4_HEIGHT_MM = 297;
  const CONTENT_WIDTH_MM = 210 - (MARGIN * 2);
  const PAGE_CONTENT_HEIGHT = A4_HEIGHT_MM - (MARGIN * 2);
  let currentY = MARGIN;
  let isFirstSection = true;

  for (const { canvas, heightMM, name, forceNewPage } of sectionData) {
    const remainingSpace = PAGE_CONTENT_HEIGHT - (currentY - MARGIN);
    
    // Forçar nova página para a capa ou se a secção não couber
    if (!isFirstSection && (forceNewPage || heightMM > remainingSpace)) {
      pdf.addPage();
      currentY = MARGIN;
    }
    
    // Se a secção é maior que uma página, precisamos fatiá-la
    if (heightMM > PAGE_CONTENT_HEIGHT) {
      // Fatiar a secção em múltiplas páginas
      let sliceStartMM = 0;
      while (sliceStartMM < heightMM) {
        const sliceHeightMM = Math.min(PAGE_CONTENT_HEIGHT, heightMM - sliceStartMM);
        const sliceStartPx = (sliceStartMM / heightMM) * canvas.height;
        const sliceHeightPx = (sliceHeightMM / heightMM) * canvas.height;
        
        // Criar canvas da fatia
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, sliceStartPx, canvas.width, sliceHeightPx, 
                      0, 0, canvas.width, sliceHeightPx);
        
        if (sliceStartMM > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG',
                     MARGIN, MARGIN, CONTENT_WIDTH_MM, sliceHeightMM);
        
        sliceStartMM += sliceHeightMM;
      }
      currentY = MARGIN + (heightMM % PAGE_CONTENT_HEIGHT);
    } else {
      // Secção cabe na página actual
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG',
                   MARGIN, currentY, CONTENT_WIDTH_MM, heightMM);
      currentY += heightMM;
    }
    
    // Após a capa, sempre começar nova página
    if (name === 'cover') {
      pdf.addPage();
      currentY = MARGIN;
    }
    
    isFirstSection = false;
  }
  
  pdf.save(`proposta-${proposal.slug}.pdf`);
};
```

## Comportamento Esperado

| Secção | Comportamento |
|--------|---------------|
| **cover** | Sempre em página separada (página 1) |
| **scope** | Começa na página 2, continua se necessário |
| **timeline** | Começa nova página se não couber, senão continua |
| **references** | Começa nova página se não couber, senão continua |
| **proposal** | Começa nova página se não couber, senão continua |

## Diagrama do Fluxo

```text
┌─────────────────────────────────────────┐
│  1. Encontrar secções [data-pdf-section]│
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│  2. Para cada secção:                   │
│     - Capturar com html2canvas          │
│     - Calcular altura em mm             │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│  3. Para cada secção capturada:         │
│     - É capa? → Página separada         │
│     - Cabe na página? → Adicionar       │
│     - Não cabe? → Nova página           │
│     - Maior que página? → Fatiar        │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│  4. Guardar PDF                         │
└─────────────────────────────────────────┘
```

## Resultado Final

1. **Página 1**: Capa (sempre sozinha)
2. **Página 2+**: Âmbito do Projecto
3. **Página 3+**: Cronograma (se não couber no espaço restante)
4. **Página 4+**: Referências e Credenciais
5. **Página 5+**: Proposta e Condições de Venda

As secções serão preservadas como unidades lógicas, sem cortes arbitrários no meio do conteúdo.

