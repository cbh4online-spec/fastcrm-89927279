

# Adicionar Links Navegáveis ao Índice do eBook

## Diagnóstico

O índice (TOC) no flipbook mostra os capítulos com números de página, mas os itens não são clicáveis. A função `goToPage` já existe no `FlipbookReader` mas não é passada ao `FlipbookPage` — o pipeline é `FlipbookReader → PageFlipBook → PageWrapper → FlipbookPage` e nenhum destes passa um callback de navegação.

## Plano

### 1. `FlipbookPage.tsx` — Aceitar e usar `onGoToPage`
- Adicionar `onGoToPage?: (page: number) => void` ao `FlipbookPageProps`
- No bloco TOC (linha 100), envolver cada entrada num `button` com `onClick={() => onGoToPage?.(ch.pageStart - 1)}` (índice 0-based)
- Estilizar com `cursor-pointer`, hover com `opacity` e `underline`

### 2. `PageFlip.tsx` — Propagar `onGoToPage`
- Adicionar `onGoToPage` ao `PageFlipProps` e ao `PageWrapper`
- Passar ao `FlipbookPage` dentro do `PageWrapper`

### 3. `FlipbookReader.tsx` — Passar `goToPage` ao `PageFlipBook`
- Passar `onGoToPage={goToPage}` como prop ao `PageFlipBook`

## Ficheiros

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookPage.tsx` | Prop `onGoToPage`, TOC entries clicáveis |
| `src/components/ebooks/PageFlip.tsx` | Propagar `onGoToPage` pelo PageWrapper |
| `src/components/ebooks/FlipbookReader.tsx` | Passar `goToPage` ao PageFlipBook |

## Critérios de Aceitação
- Clicar num capítulo no índice navega para a página correcta
- Visual do índice mantém-se profissional com hover state
- Não interfere com a navegação por swipe/click do flipbook

