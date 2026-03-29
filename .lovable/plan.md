

# Zoom no Flipbook Reader

## Solução

Adicionar um botão de lupa na toolbar com zoom in/out (e reset). Quando o zoom está activo, o container do flipbook aplica `transform: scale(zoomLevel)` com overflow scroll para permitir pan.

## Alterações

### 1. `FlipbookToolbar.tsx`
- Importar `ZoomIn`, `ZoomOut` do lucide-react
- Adicionar props: `zoomLevel`, `onZoomIn`, `onZoomOut`, `onZoomReset`
- Renderizar 2 botões (ZoomIn / ZoomOut) no grupo direito, antes do highlighter
- Mostrar o nível de zoom (ex: "125%") clicável para reset ao 100%

### 2. `FlipbookReader.tsx`
- Adicionar estado `zoomLevel` (default 1, min 0.5, max 2.5, step 0.25)
- Funções `handleZoomIn`, `handleZoomOut`, `handleZoomReset`
- No container do flipbook (`bookContainerRef`), aplicar:
  - `transform: scale(zoomLevel)` + `transformOrigin: center center`
  - Quando zoom > 1: overflow scroll no wrapper, cursor grab/grabbing para pan
- Passar props de zoom à toolbar
- Suporte a Ctrl+scroll (wheel) para zoom rápido

| Ficheiro | Acção |
|---|---|
| `FlipbookToolbar.tsx` | Adicionar botões ZoomIn/ZoomOut e indicador de nível |
| `FlipbookReader.tsx` | Estado de zoom, transform scale, scroll overflow, Ctrl+wheel |

## Critérios de aceitação
- Zoom in/out funcional com botões e Ctrl+scroll
- Indicador visual do nível de zoom com reset ao clicar
- Pan (scroll) quando zoom > 100%
- Zoom não interfere com flip de páginas nem com highlight mode

