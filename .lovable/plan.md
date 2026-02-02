

# Plano: Corrigir Exibição de Imagens na Proposta

## Problema Identificado

As imagens dos produtos podem não estar a aparecer correctamente no documento da proposta devido a:

| Causa | Descrição |
|-------|-----------|
| **CORS bloqueado** | `crossOrigin="anonymous"` impede carregamento de imagens sem headers CORS |
| **Fallback fraco** | Quando não há imagem, mostra apenas "IMG" em texto |
| **Preview sem imagem** | html2canvas pode falhar ao capturar imagens externas |

---

## Solução

### 1. Remover `crossOrigin="anonymous"` para Preview Normal

O atributo `crossOrigin="anonymous"` é necessário apenas para `html2canvas`. No preview visual normal, deve ser removido para evitar bloqueios CORS.

### 2. Melhorar Fallback de Imagem

Em vez de mostrar "IMG" como texto, usar um ícone de `Package` (produto) para indicar ausência de imagem de forma mais profissional.

### 3. Tratamento de Erro para Imagens

Adicionar `onError` handler que substitui imagens quebradas por placeholder.

### 4. Ajustar html2canvas para Ignorar Imagens com CORS

Na geração de PDF, se imagens falharem, continuar sem elas em vez de bloquear.

---

## Alterações

### `src/components/proposals/ProposalClientDocument.tsx`

```typescript
// ANTES:
{item.image_url ? (
  <img 
    src={item.image_url} 
    alt={item.name}
    crossOrigin="anonymous" // ← CAUSA PROBLEMA
    className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
  />
) : (
  <div className="w-10 h-10 bg-gray-100 ...">
    <span className="text-gray-400 text-[10px]">IMG</span>
  </div>
)}

// DEPOIS:
{item.image_url ? (
  <img 
    src={item.image_url} 
    alt={item.name}
    className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
    onError={(e) => {
      // Substituir por placeholder se imagem falhar
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextElementSibling?.classList.remove('hidden');
    }}
  />
) : null}
{/* Fallback sempre presente (hidden se imagem OK) */}
<div className={cn(
  "w-10 h-10 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center",
  item.image_url && "hidden" // Escondido se há imagem
)}>
  <Package className="h-5 w-5 text-gray-400" />
</div>
```

**Alternativa mais simples** - usar apenas o ícone Package como fallback:

```typescript
{item.image_url ? (
  <img 
    src={item.image_url} 
    alt={item.name}
    className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
    onError={(e) => {
      e.currentTarget.src = ''; // Clear broken image
      e.currentTarget.onerror = null;
    }}
  />
) : (
  <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center">
    <Package className="h-5 w-5 text-gray-400" />
  </div>
)}
```

### `src/components/proposals/ProposalDocumentPreviewDialog.tsx`

Melhorar opções do html2canvas para ser mais tolerante com imagens:

```typescript
const canvas = await html2canvas(documentRef.current, {
  scale: 2,
  useCORS: true,
  allowTaint: true, // Permitir imagens "tainted"
  backgroundColor: "#ffffff",
  logging: false,
  width: docWidth,
  height: docHeight,
  windowWidth: docWidth,
  windowHeight: docHeight,
  foreignObjectRendering: false, // Desativar para melhor compatibilidade
  removeContainer: true,
  imageTimeout: 5000, // Timeout de 5s para imagens
  ignoreElements: (element) => {
    // Ignorar elementos que falharam a carregar
    if (element.tagName === 'IMG' && !(element as HTMLImageElement).complete) {
      return true;
    }
    return false;
  },
});
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `ProposalClientDocument.tsx` | Remover `crossOrigin`, adicionar fallback com ícone Package, handler `onError` |
| `ProposalDocumentPreviewDialog.tsx` | Melhorar opções html2canvas para tolerância a imagens |

---

## Resultado Esperado

1. **Preview normal** - Imagens carregam sem bloqueio CORS
2. **Fallback elegante** - Ícone de produto em vez de texto "IMG"
3. **PDF resiliente** - Gera PDF mesmo se algumas imagens falharem
4. **Erro handling** - Imagens quebradas são substituídas por placeholder

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| ProposalClientDocument.tsx | ~10 linhas alteradas |
| ProposalDocumentPreviewDialog.tsx | ~5 linhas alteradas |
| **Total** | ~15 linhas |

