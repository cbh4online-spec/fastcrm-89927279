

# Diagnóstico: Sublinhado não funciona

## Problema identificado

Existem **3 bloqueios** que impedem a selecção de texto no flipbook:

1. **`react-pageflip` captura todos os eventos de rato** — o `mousedown`/`mousemove`/`mouseup` são interceptados pela biblioteca para virar páginas, impedindo que o browser crie uma selecção de texto nativa.

2. **`userSelect: "none"`** — quando `protectionEnabled` está activo (linha 369), a selecção é explicitamente desactivada no CSS.

3. **`disableFlipByClick={false}`** — cliques dentro das páginas são interpretados como "virar página", não como interacção com o conteúdo.

## Solução

### 1. Adicionar modo "Sublinhar" (toggle na toolbar)

Criar um botão na `FlipbookToolbar` que activa/desactiva o modo de sublinhado. Quando activo:
- `disableFlipByClick` passa a `true` no `HTMLFlipBook`
- `useMouseEvents` passa a `false` (desactiva drag-to-flip)
- `userSelect` passa a `"text"` no container (mesmo com protecção)
- O cursor animado esconde-se e aparece um cursor de texto normal
- A cor de fundo do botão muda para indicar que o modo está activo

Quando desactivado, tudo volta ao normal (flip por clique e drag).

### 2. Alterações por ficheiro

| Ficheiro | Alteração |
|---|---|
| `FlipbookReader.tsx` | Adicionar estado `highlightMode`, passar ao `PageFlipBook` e condicionar `userSelect`, cursor e `AnimatedHandCursor` |
| `PageFlip.tsx` | Aceitar prop `highlightMode` → condicionar `disableFlipByClick` e `useMouseEvents` |
| `FlipbookToolbar.tsx` | Adicionar botão "Sublinhar" (ícone `Highlighter`) com toggle visual |

### 3. Lógica

```
highlightMode = false (default)
  → flip por clique ✓, drag ✓, selecção ✗, cursor mão ✓

highlightMode = true (toggle)
  → flip por clique ✗, drag ✗, selecção ✓, cursor texto ✓
  → ao seleccionar texto → popover de highlight aparece
  → ao criar highlight → highlightMode volta a false
```

### Critérios de aceitação

- Botão "Sublinhar" visível na toolbar (com ícone Highlighter)
- Toggle visual claro (cor activa vs inactiva)
- Em modo sublinhado: texto seleccionável, popover aparece, flip desactivado
- Ao sair do modo ou criar highlight: flip volta ao normal
- Funciona mesmo com protecção activa

