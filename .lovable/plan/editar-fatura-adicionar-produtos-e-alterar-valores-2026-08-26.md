# Editar fatura: adicionar produtos e alterar valores

## Diagnóstico

Na ficha da fatura (`/dashboard/invoices/:id`) os itens são apenas apresentados em modo leitura. O hook `useUpdateInvoice` só permite alterar campos de cabeçalho (cliente, datas, IVA global, desconto, notas) — não existe nenhuma mutação que crie, altere ou remova linhas em `invoice_items`, nem que recalcule `subtotal`, `tax_amount` e `total`. Por isso não é possível acrescentar produtos nem corrigir preços depois de criada a fatura.

Já existem peças reutilizáveis do fluxo de criação: `InvoiceProductSelector` (pesquisa de produtos por categoria) e `InvoiceItemsCart` (linhas editáveis com quantidade, preço, desconto e IVA).

## Decisões de produto/UX

- Botão **Editar itens** no cabeçalho da fatura, ao lado de Enviar/Registar Pagamento.
- Abre um diálogo grande com duas colunas: à esquerda o seletor de produtos (pesquisa + categorias), à direita as linhas da fatura editáveis (descrição, qtd, preço unitário, desconto %, IVA, remover) e uma linha manual "Adicionar item livre" para serviços sem produto.
- Rodapé do diálogo com totais em tempo real: Subtotal, IVA, Desconto global e Total c/IVA, mais o aviso de diferença face ao valor atual.
- Regras de edição:
  - **Rascunho**: edição livre.
  - **Enviada / Vencida / Parcialmente paga**: edição permitida com aviso de que altera valores em dívida; se já houver pagamentos, bloqueia gravar um total inferior ao já pago.
  - **Paga / Cancelada** ou fatura já sincronizada com o InvoiceXpress (`external_provider` preenchido): edição bloqueada, com explicação no diálogo.
- Estados tratados: loading dos itens, guardar em curso, erro com toast, sucesso com refresh imediato dos totais e do histórico de pagamentos.

## Estrutura técnica

- `src/hooks/useInvoices.ts`: nova mutação `useUpdateInvoiceItems` que recebe `{ invoiceId, items, discount_amount }`, apaga/insere/atualiza `invoice_items` por diff (mantendo `position`), recalcula `subtotal`, `tax_amount`, `total` com a mesma fórmula de `useCreateInvoice`, e atualiza a fatura. Invalida `["invoice", id]`, `["invoice-items", id]`, `["invoices"]`, KPIs financeiros e `["invoice-payments", id]`. Emite `INVOICE.UPDATED` via `emitKernelEvent` com o total antigo e novo no payload.
- `src/components/invoices/EditInvoiceItemsDialog.tsx`: novo componente que carrega os itens existentes para o estado local de `InvoiceCartItem[]`, reutiliza `InvoiceProductSelector` e `InvoiceItemsCart`, valida com zod (qtd > 0, preço >= 0, desconto 0–100, IVA 0–100, descrição obrigatória) e chama a mutação.
- `src/pages/InvoiceDetail.tsx`: botão **Editar itens** com a regra de estado acima e ligação ao diálogo.
- Cálculos monetários com os helpers existentes de `src/lib/money.ts` para evitar desvios de arredondamento (o caso 515,01 vs 515,00).
- Sem alterações de base de dados: as tabelas e políticas RLS de `invoices`/`invoice_items` já suportam esta escrita pelo membro do workspace.

## Critérios de aceitação

- Numa fatura em rascunho consigo adicionar um produto do catálogo e o total no Resumo atualiza sem recarregar a página.
- Consigo corrigir o preço unitário e o IVA de uma linha e o Subtotal/IVA/Total ficam coerentes ao cêntimo.
- Consigo remover uma linha e adicionar um item livre sem produto associado.
- Fatura paga, cancelada ou já enviada para o InvoiceXpress mostra o botão desativado com explicação.
- Numa fatura com pagamentos parciais, tentar gravar um total inferior ao valor já pago é recusado com mensagem clara.
- Sem erros de consola; funciona em ecrã pequeno (colunas empilham).

## Riscos e pontos por validar

- Faturas já comunicadas ao InvoiceXpress não devem ser alteradas localmente — por isso o bloqueio; se preferires permitir edição com re-sincronização, digo o que muda.
- Alteração de totais em faturas emitidas afeta KPIs financeiros e cobranças; os eventos de kernel garantem rastreabilidade, mas convém confirmar que queres permitir esse cenário fora de rascunho.
