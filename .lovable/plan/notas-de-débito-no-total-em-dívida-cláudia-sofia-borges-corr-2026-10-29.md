# Notas de Débito no total em dívida — Cláudia Sofia Borges Correia

## Diagnóstico (confirmado na base de dados)
- O cálculo já soma as Notas de Débito à dívida (FT + ND).
- A ND PT-V250.01/37 (65,58 €) tem um recebimento manual de 65,58 € registado a 23/10/2026 com a nota «Confirmação manual — marcada como paga». Por isso o sistema considera-a paga e só mostra 1985,97 €.
- Não há recibo SAF-T para esta ND. É a única ND no sistema nesta situação (estado «Enviada» mas com recebimento igual ao total).
- A FT V100.02/5364 está correta: 2146,12 € − 160,15 € (recibo RG RB400/3849) = 1985,97 €.

## O que vou fazer
1. Anular o recebimento manual de 65,58 € da ND PT-V250.01/37 através do circuito de anulação com motivo («ND não liquidada — recebimento manual indevido»), para ficar registado na auditoria de recibos.
2. Confirmar que a ND fica com 0 € pago e em aberto, vencida desde 07/07/2026.
3. Confirmar na ficha: Vencido passa para 2051,55 € e o cartão «Pendente» do Histórico de Faturas passa a 2051,55 €.
4. Verificar os outros cartões de dívida (Cobranças, lista de devedores) para garantir que também incluem NDs; corrigir se algum as excluir.
5. Impedir que se repita: na ação «Marcar como paga» de uma ND, mostrar confirmação explícita com o valor; sem recibo SAF-T, fica sempre registado na auditoria.

## Lista de faturas (caso André Nogueira Nery)
6. Na lista de Faturas, ao pesquisar um cliente (ex.: «nery»), aparecem as 2 faturas certas (240,62 € + 19,63 €), mas a barra de totais no topo continua a mostrar os valores de todo o espaço (366 406,42 €). Vou fazer a barra contar só os documentos que correspondem à pesquisa, para mostrar 260,25 € em dívida neste caso.
7. Comparar com a ficha da empresa deste cliente e garantir que mostra os mesmos 260,25 € em dívida.

## Pontos por validar
- Quem marcou a ND como paga a 23/10 foi um utilizador da PHARLISS; se houve um pagamento real fora do SAF-T, diga-me e não anulo.
- Se no caso do André a ficha da empresa mostra outro valor, diga-me qual vê.
