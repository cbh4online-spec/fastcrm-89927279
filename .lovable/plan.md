

# Enriquecer Toolbar do Flipbook Reader

## Novos Botões

| Botão | Ícone | Acção |
|---|---|---|
| Ir para o início | `ChevronsLeft` | `goToPage(0)` |
| Ir para o final | `ChevronsRight` | `goToPage(totalPages - 1)` |
| Escolher página | Click no indicador de página | Transforma o texto "34-35 / 74" num input numérico editável (inline) |
| Imprimir | `Printer` | `window.print()` com CSS `@media print` que mostra apenas o conteúdo do flipbook |

## Layout da Toolbar Actualizado

```text
[Thumbnails] [Início]  [◀] [34-35 / 74 (clicável)] [▶] [Final]    [Imprimir] [Fullscreen]
```

## Implementação

### 1. `FlipbookToolbar.tsx`

- Importar `ChevronsLeft`, `ChevronsRight`, `Printer` do lucide-react
- Adicionar botão **Ir para início** (`onGoTo(0)`) — disabled quando `currentPage === 0`
- Adicionar botão **Ir para final** (`onGoTo(totalPages - 1)`) — disabled quando já na última página
- Tornar o display de página **clicável**: ao clicar, substituir o `<span>` por um `<input type="number">` inline (min=1, max=totalPages), que ao submit (Enter ou blur) chama `onGoTo(value - 1)`
- Adicionar botão **Imprimir** com prop `onPrint`
- Tooltips nativos via `title` attribute em cada botão

### 2. `FlipbookReader.tsx`

- Criar handler `handlePrint` que usa `window.print()`
- Passar `onPrint` como nova prop à toolbar
- Adicionar `onGoToFirst` e `onGoToLast` (ou reutilizar `onGoTo` com 0 e pages.length-1)

### 3. CSS de Impressão (inline ou global)

- Adicionar `@media print` que esconde tudo excepto o conteúdo das páginas do flipbook, renderizando cada página sequencialmente em formato A4

## Critérios de Aceitação

- Botões início/final navegam correctamente e ficam disabled nos extremos
- Input de página aceita Enter e blur, valida range 1–totalPages
- Botão de impressão abre diálogo de impressão do browser
- Responsivo: em mobile os botões mantêm proporção adequada
- Tooltips descritivos em todos os botões

