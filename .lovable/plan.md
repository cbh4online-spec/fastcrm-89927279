# Totais manuais na fatura: assumir exactamente o valor escrito

## Diagnóstico

Ao escrever `15` no "Total da linha (c/IVA)" com IVA 23% e quantidade 1, o sistema tem de deduzir o preço unitário: 15 / 1,23 = 12,195121...

Hoje o preço unitário é arredondado a 2 casas decimais (12,20), porque a coluna `unit_price` da base de dados é `numeric(12,2)`. Ao recalcular, 12,20 x 1,23 = 15,006, que arredonda para 15,01. Daí a diferença de um cêntimo.

Ou seja: não é um bug de arredondamento no ecrã — é falta de precisão no preço unitário. Com apenas 2 casas no preço unitário é matematicamente impossível atingir muitos totais redondos com IVA.

## Decisão

Passar o preço unitário a suportar mais casas decimais (6), mantendo tudo o resto igual:

- O total escrito pelo utilizador é respeitado ao cêntimo, sempre que seja matematicamente possível.
- O preço unitário continua a ser mostrado com 2 casas quando é redondo; só mostra mais casas quando a dedução as exige (ex.: 12,195122).
- Subtotal, IVA e total continuam a ser arredondados a 2 casas (regra fiscal inalterada).
- O mesmo se aplica ao "Total c/IVA" da fatura: a distribuição proporcional passa a bater certo sem precisar de encostar resíduo, e o resíduo residual (quando existe) continua a ser absorvido pela linha de maior valor.

## Estrutura técnica

1. **Migração**: `ALTER TABLE public.invoice_items ALTER COLUMN unit_price TYPE numeric(14,6);` (mesma alteração para as tabelas de itens equivalentes só se partilharem este diálogo). Sem perda de dados — apenas aumenta a precisão. Sem alterações a RLS ou grants.
2. **`src/lib/invoices/reverseTotals.ts`**:
   - novo `round6` para preços unitários; `round2` mantém-se para valores monetários agregados.
   - `unitPriceFromLineTotal` devolve o preço com 6 casas.
   - `distributeTargetTotal` calcula com 6 casas e mantém o ajuste final de resíduo (agora raramente necessário).
3. **UI (`InvoiceItemsCart.tsx`, `EditInvoiceItemsDialog.tsx`)**: formatação do preço unitário com até 6 casas (a remover zeros à direita); o campo de edição do preço aceita input com casas decimais adicionais. Nada muda para quem escreve preços normais.
4. **Testes** (`src/test/invoices/reverse-totals.test.ts`): novos casos — total de linha 15,00 com IVA 23% e qty 1 dá exactamente 15,00; total geral escrito bate ao cêntimo com IVA misto e desconto global; preços "normais" continuam a 2 casas.

## Critérios de aceitação

- Escrever `15` no total da linha (IVA 23%, qty 1) mantém `15,00 €` no total da linha e no total da fatura.
- Escrever um total geral (ex.: `1000`) resulta em `1 000,00 €` exactos.
- Faturas existentes não mudam de valor.
- Typecheck, testes e build verdes.

## Riscos e pontos por validar

- Documentos já emitidos/PDF: o preço unitário pode passar a exibir mais casas nessas linhas específicas onde foi feito o cálculo inverso — confirmar se é aceitável no PDF ou se preferes limitar a 4 casas.
- Integrações externas (ex.: exportações/faturação certificada) que assumam 2 casas no preço unitário — a validar caso existam.
