# Faturas: respeitar o preço e o IVA definidos no produto

## Diagnóstico (verificado)

No diálogo "Nova Fatura", ao selecionar um produto o sistema faz sempre:

- `unit_price = product.base_price`
- `tax_rate = 23` (fixo, ignora o produto)

Mas na base de dados o produto "mymia unlimited" tem `base_price = 500,00` com `tax_included = true` (o mesmo acontece com "myMIA Starter" e "mymia clinic"). Ou seja, os 500,00 € já incluem IVA. Como a fatura trata esse valor como preço sem IVA e volta a somar 23%, o total sai 615,00 € em vez dos 500,00 € do catálogo.

O campo `tax_rate_estimate_pct` está a nulo nestes produtos, pelo que a taxa a assumir por omissão continua a ser 23%.

O mesmo defeito existe no diálogo "Editar itens da fatura" (copia `base_price` sem tratar o IVA).

## Decisões de produto/UX

- Ao adicionar um produto à fatura:
  - taxa de IVA da linha = `tax_rate_estimate_pct` do produto, ou 23% quando não estiver definido;
  - se o produto tem `tax_included = true`, o preço unitário da linha passa a ser o valor líquido (`base_price / (1 + IVA/100)`), para que o total com IVA da linha seja exactamente o preço do catálogo;
  - se `tax_included = false`, mantém-se `base_price` como preço sem IVA (comportamento actual).
- No seletor de produtos, o preço apresentado passa a indicar se é com ou sem IVA (ex.: `500,00 € c/IVA` / `32,44 € s/IVA`).
- Nada muda na edição manual: o utilizador continua a poder alterar preço, IVA, desconto e total da linha.

## Estrutura técnica

- `src/components/invoices/CreateInvoiceDialog.tsx` (~linha 218) e `src/components/invoices/EditInvoiceItemsDialog.tsx` (~linha 145): passam a usar um helper comum em vez de `base_price` + 23 fixo.
- Novo helper `productInvoiceLine(product)` em `src/lib/invoices/productLine.ts`, devolvendo `{ unit_price, tax_rate }`, com precisão de 6 casas no preço unitário (usa `round6` de `src/lib/invoices/reverseTotals.ts` e `netFromGross`/`DEFAULT_VAT_RATE` de `src/utils/productPricing.ts`) — a coluna `unit_price_precise` já existe.
- `src/components/invoices/InvoiceProductSelector.tsx`: sufixo "c/IVA" ou "s/IVA" no preço.
- Testes em `src/test/invoices/product-line.test.ts`: produto 500,00 c/IVA a 23% → linha com total 500,00; produto 32,44 s/IVA → total 39,90; produto com `tax_rate_estimate_pct = 6` respeita 6%.
- Sem alterações de base de dados; faturas já emitidas ficam inalteradas.

## Critérios de aceitação

- Selecionar "mymia unlimited" numa fatura nova dá Subtotal 406,50 €, IVA 93,50 € e Total 500,00 €.
- Selecionar "mymia professional" (32,44 s/IVA) dá Total 39,90 €.
- O mesmo comportamento em "Editar itens da fatura".
- Sem erros de consola; typecheck e testes verdes.

## Riscos e pontos por validar

- Produtos com `tax_rate_estimate_pct` nulo continuam a assumir 23% — se houver produtos a 6% ou 13% sem esse campo preenchido, é preciso corrigir a ficha do produto.
- Se preferires que o preço do catálogo seja sempre tratado como sem IVA (ignorando `tax_included`), faço o inverso: corrigir os produtos em vez do cálculo.
