# Corrigir a ficha do produto que abre e fecha sozinha

## Diagnóstico (ainda por confirmar)
No catálogo, clicar num produto abre a ficha, mas ela fecha logo a seguir. Pela leitura do código há dois suspeitos fortes:
1. A ficha mostra primeiro um ecrã «a carregar» numa janela e, quando os dados chegam, troca para outra janela diferente. Essa troca destrói e recria a janela, o que pode ser interpretado como «clique fora» e fechá-la.
2. O clique na linha da tabela pode chegar também à janela recém-aberta (o mesmo clique abre e fecha).

## Passos
1. Reproduzir no catálogo PHARLISS com o navegador automático, registando quando e porquê a ficha fecha (abrir por nome, por SKU e pelo menu «⋯»).
2. Corrigir a causa confirmada:
   - manter uma única janela durante todo o ciclo (o «a carregar» passa a ser conteúdo dentro dela, não uma janela à parte);
   - se for o clique duplicado, impedir que o clique de abertura seja tratado como clique fora.
3. Aproveitar para fechar o problema anterior de links diretos: `?product=ID` abre a ficha no catálogo e os links `/dashboard/products/:id` deixam de cair no ecrã inicial (redirecionam para o catálogo com a ficha aberta).
4. Verificar: abrir 5 produtos seguidos, fechar com X e Esc, telemóvel (folha inferior), sem erros na consola.

## Detalhes técnicos
- `ProductDetailDialog.tsx`: remover os `return <Dialog>` separados de loading/erro; um só `<Dialog open>` com conteúdo condicional.
- `ProductsDataTable.tsx`: `stopPropagation` nos botões de abertura se necessário; `onInteractOutside` guardado.
- `ProductsList.tsx`: ler `product`/`highlight` da URL e abrir a ficha; nova rota em `SalesAssetsRoutes.tsx` para `/dashboard/products/:id` → `Navigate` para `?product=:id`.

## Critérios de aceitação
- A ficha abre e fica aberta até o utilizador a fechar.
- Links diretos de produto abrem a ficha certa.
