

# Reduzir espaços em branco — mais conteúdo por página

## Problema

`CHARS_PER_PAGE = 450` foi definido quando as páginas eram pequenas (A5). Agora com tamanho A4 real, cada página só preenche ~30% do espaço disponível, resultando em enormes áreas brancas e demasiadas páginas.

## Solução

### `src/components/ebooks/FlipbookReader.tsx`

Aumentar `CHARS_PER_PAGE` de **450** para **1200** caracteres. Com a tipografia actual em `em` units e o `baseFontSize` dinâmico, ~1200 caracteres preenchem correctamente uma página A4 com margens confortáveis.

Também ajustar a lógica de `splitContentIntoPages` para permitir quebras mais inteligentes — se um parágrafo ultrapassa o limite mas ainda cabe com margem de 20%, incluí-lo na página actual em vez de empurrá-lo para a próxima.

| Constante | Antes | Depois |
|-----------|-------|--------|
| `CHARS_PER_PAGE` | 450 | 1200 |

### Resultado

Menos páginas, texto preenche a área disponível, experiência de leitura mais próxima de um livro real.

