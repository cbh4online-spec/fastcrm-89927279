

## Corrigir Renderização do Bloco HTML no Canvas

### Problema
O `EmailCanvas.tsx` não tem `case 'html'` no switch de `renderBlock`, fazendo com que blocos HTML importados mostrem "Bloco não suportado". O BlockEditor já suporta edição de HTML — falta apenas a pré-visualização no canvas.

### Alteração

#### `src/components/email-builder/EmailCanvas.tsx`
- Adicionar `case 'html'` ao switch de `renderBlock` (antes do `default`, ~linha 336)
- Importar `HtmlBlockContent` do types
- Renderizar o HTML com `dangerouslySetInnerHTML` dentro de um container com estilos adequados
- Mostrar placeholder "Adicionar HTML" quando o conteúdo está vazio

### Ficheiros a alterar
- `src/components/email-builder/EmailCanvas.tsx`

