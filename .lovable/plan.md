# Total manual na edição de itens da fatura

## Diagnóstico

No diálogo "Editar itens da fatura" todos os totais são derivados: cada linha calcula-se a partir de quantidade × preço unitário − desconto % + IVA, e o total geral é a soma. Não existe forma de escrever directamente "quero que esta linha fique em 15,00 €" ou "quero que a fatura feche em 500,00 €" — o utilizador tem de andar às voltas com o preço unitário até acertar o cêntimo.

## Decisões de produto/UX

Dois pontos de entrada manual, ambos com cálculo inverso:

1. **Total da linha (c/IVA)** — em cada item passa a existir um campo de total da linha, ao lado do preço unitário. Ao escrever um valor, o sistema deduz o preço unitário mantendo quantidade, desconto % e taxa de IVA da linha. Os campos existentes continuam a funcionar como hoje.
2. **Total da fatura (c/IVA)** — o "Total c/IVA" no rodapé passa a ser editável. Ao escrever um valor, o sistema distribui a diferença proporcionalmente pelas linhas, ajustando o preço unitário de cada uma e mantendo a taxa de IVA de cada produto. O último cêntimo de arredondamento é encostado à linha de maior valor, para o total bater exactamente.

Regras e salvaguardas:
- O desconto global mantém-se como está e entra no cálculo inverso (o alvo é o total final depois do desconto global).
- Se todas as linhas estiverem a zero, não há base proporcional: o sistema avisa que é preciso ter pelo menos uma linha com valor antes de forçar o total.
- Total alvo negativo ou abaixo do já pago é recusado, como já acontece hoje.
- Depois de um ajuste manual mostra-se uma nota discreta "Preços ajustados para o total indicado" com botão "Repor" que devolve os valores originais dos itens.
- Os campos só recalculam ao sair do campo (blur) ou Enter, para não recalcular a cada tecla.
- Tudo com etiquetas claras, navegável por teclado, e as colunas continuam a empilhar em ecrã pequeno.

## Estrutura técnica

- Novo módulo `src/lib/invoices/reverseTotals.ts` com funções puras:
  - `unitPriceFromLineTotal({ lineTotalGross, quantity, discountPercent, taxRate })` → preço unitário.
  - `distributeTargetTotal({ items, discountAmount, targetTotal })` → nova lista de itens com preços ajustados proporcionalmente, com correcção do resíduo de arredondamento na linha de maior peso.
  - Cálculo com `decimal.js` via os helpers de `src/lib/money.ts`, arredondando a 2 casas só no fim.
- `InvoiceItemsCart.tsx`: nova coluna/campo "Total linha (c/IVA)" e prop `onUpdateLineTotal(id, value)`.
- `EditInvoiceItemsDialog.tsx`: campo editável no "Total c/IVA", estado `manualTotal`, handler que chama `distributeTargetTotal`, aviso + botão "Repor", validações (total ≥ 0, ≥ já pago, base > 0).
- Testes unitários em `src/test/invoices/reverse-totals.test.ts`: dedução de preço unitário com desconto e IVA, distribuição proporcional com IVA misto, soma exacta ao cêntimo, caso base zero.
- Sem alterações de base de dados: a gravação continua a passar por `useUpdateInvoiceItems`, que persiste preços unitários e recalcula subtotal/IVA/total no servidor da mesma forma.

## Plano de implementação

1. Criar `reverseTotals.ts` e os testes.
2. Acrescentar o campo de total por linha ao `InvoiceItemsCart`.
3. Tornar o total geral editável no diálogo, com distribuição, aviso e "Repor".
4. Correr typecheck e testes; validar no preview numa fatura com IVA a 23% e outra com IVA misto.

## Critérios de aceitação

- Numa linha com quantidade 1 e IVA 23%, escrever 15,00 € no total da linha deixa o preço unitário em 12,20 € e o total da linha exactamente 15,00 €.
- Escrever 500,00 € no total da fatura ajusta as linhas proporcionalmente e o "Total c/IVA" mostra 500,00 € sem desvio de cêntimos.
- Com IVA misto (23% e 6%), a proporção entre linhas mantém-se e o total bate certo.
- "Repor" devolve os preços originais dos itens carregados.
- Total abaixo do já pago continua bloqueado com mensagem clara.
- Sem erros de consola; funciona em ecrã pequeno.

## Riscos e pontos por validar

- Distribuir proporcionalmente altera o preço unitário de todos os produtos da fatura, o que pode deixar preços com mais casas decimais do que o catálogo — os valores gravados ficam a 2 casas e o resíduo é absorvido na linha de maior valor.
- Em faturas já emitidas o aviso actual mantém-se: alterar totais mexe em valores em dívida e KPIs financeiros.
