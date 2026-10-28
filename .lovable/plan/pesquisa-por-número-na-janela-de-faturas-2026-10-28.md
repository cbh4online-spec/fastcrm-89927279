# Pesquisa por número na janela de faturas

## O que muda
- Na janela «Faturas de …» da ficha da empresa, junto aos botões de ano, aparece uma caixa «Pesquisar nº fatura».
- Basta escrever parte do número (ex.: `5733`, `V100.02/57` ou `FT V100`) para filtrar a lista; não distingue maiúsculas e ignora espaços.
- A pesquisa combina com o ano escolhido; os totais (s/IVA e Pago) e a paginação refletem só os resultados.
- Ao mudar de ano ou escrever, volta à página 1. Sem resultados mostra «Nenhuma fatura com esse número».

## Detalhes técnicos
- `CommercialHistorySection.tsx` → `InvoicesDialog`: estado `search`, `Input` com ícone, filtro em `filtered` por `invoice_number` normalizado (lowercase, sem espaços), reset de página no efeito existente, limpar ao fechar.
