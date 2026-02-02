

# Plano: Corrigir Imagens no PDF com Conversão para Data URL

## Problema Identificado

| Tipo de Imagem | Exemplo URL | Funciona no html2canvas? |
|----------------|-------------|--------------------------|
| Supabase Storage | `eumnfkccyvlyoyjchiwe.supabase.co/storage/...` | ✅ Sim (com CORS) |
| URL Externa | `ajax.systems/api/cdn-img/...` | ❌ Não (CORS bloqueado) |

O `html2canvas` não consegue capturar imagens de domínios externos sem headers CORS adequados. As imagens Ajax Systems estão a falhar por esta razão.

---

## Solução: Converter Imagens para Data URL Antes do PDF

A estratégia é:
1. **Antes de capturar com html2canvas**, converter todas as imagens `<img>` para Data URLs inline
2. Usar um canvas temporário para desenhar cada imagem e extrair `toDataURL()`
3. Se a conversão falhar (CORS), mostrar placeholder em vez de imagem em branco

### Passo a Passo

```text
1. Encontrar todas as <img> no documento
2. Para cada imagem:
   a. Criar <img> com crossOrigin="anonymous"
   b. Tentar carregar a imagem
   c. Se sucesso: desenhar em canvas → extrair dataURL
   d. Se falhar: usar placeholder (ícone Package ou imagem genérica)
3. Substituir src das imagens no clone do documento
4. Capturar com html2canvas
```

---

## Alterações

### `src/components/proposals/ProposalDocumentPreviewDialog.tsx`

Adicionar função de conversão de imagens:

```typescript
// Função para converter imagem para Data URL
const convertImageToDataUrl = async (imgSrc: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        // CORS ou outro erro
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    
    // Adicionar timestamp para evitar cache
    const url = new URL(imgSrc, window.location.href);
    if (!imgSrc.startsWith('data:')) {
      url.searchParams.set('_t', Date.now().toString());
    }
    img.src = url.toString();
    
    // Timeout de 5 segundos
    setTimeout(() => resolve(null), 5000);
  });
};
```

Modificar `handleDownload` para converter imagens no clone:

```typescript
const handleDownload = async () => {
  // ...existing code...
  
  const canvas = await html2canvas(documentRef.current, {
    // ...existing options...
    onclone: async (clonedDoc, element) => {
      // Converter todas as imagens para Data URL
      const images = element.querySelectorAll('img');
      
      await Promise.all(
        Array.from(images).map(async (img) => {
          if (img.src && !img.src.startsWith('data:')) {
            const dataUrl = await convertImageToDataUrl(img.src);
            if (dataUrl) {
              img.src = dataUrl;
            } else {
              // Imagem falhou - esconder e mostrar placeholder
              img.style.display = 'none';
            }
          }
        })
      );
    },
  });
};
```

### Criar Placeholder Base64 para Fallback

Gerar um placeholder SVG inline como Data URL para quando a imagem falhar:

```typescript
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#f3f4f6" rx="4"/>
  <path d="M20 12v16M12 20h16" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
</svg>
`);
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `ProposalDocumentPreviewDialog.tsx` | Adicionar `convertImageToDataUrl()`, modificar `onclone` para converter imagens |

---

## Abordagem Alternativa (se a anterior falhar)

Se a conversão para Data URL ainda falhar devido a CORS, podemos usar uma **proxy de imagens** via Edge Function:

```typescript
// Edge function: proxy-image
// GET /proxy-image?url=https://ajax.systems/...
// Faz fetch da imagem no servidor e retorna com headers CORS correctos
```

Esta seria uma solução mais robusta mas requer backend.

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Imagem Supabase | ✅ Pode funcionar | ✅ Funciona (Data URL) |
| Imagem Externa (ajax.systems) | ❌ Espaço vazio | ✅ Funciona (Data URL) ou placeholder |
| Imagem com CORS bloqueado | ❌ Falha silenciosa | ✅ Placeholder visível |

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| ProposalDocumentPreviewDialog.tsx | ~40 linhas adicionadas |
| **Total** | ~40 linhas |

