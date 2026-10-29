# Dívida do André Nogueira Nery visível na sua ficha

## Diagnóstico (confirmado)
- As faturas FT V100.02/5775 (240,62 €) e FT V100.02/5776 (19,63 €) têm o NIF da Banho de Brilho, Lda (508918618). Por isso estão corretamente na ficha da empresa.
- A ficha do André (NIF 290715075) só tem faturas pagas e mostra 0 € em dívida. O sistema não mostra que ele tem dívida através da empresa com o mesmo email.
- Isto repete-se noutros clientes em que uma pessoa e uma empresa partilham o mesmo email ou têm faturas em nome da pessoa com o NIF da empresa.

## O que vou fazer
1. **Não mudo as faturas de ficha**: o NIF decide, como combinado no caso Casasalus.
2. **Aviso na ficha da pessoa**: quando há faturas em nome da pessoa (ou com o mesmo email) noutra empresa, aparece por baixo dos 4 indicadores um cartão «Dívida em empresas relacionadas». Exemplo: «Banho de Brilho, Lda — 260,25 € vencido», com link para a ficha dessa empresa.
3. **O mesmo no sentido inverso**: na ficha da empresa, as faturas emitidas em nome de outra pessoa mostram «Encomendado por: André Nogueira Nery», com link para a ficha dele.
4. **Todos os clientes**: a regra aplica-se automaticamente a todos os pares pessoa/empresa com o mesmo email ou com faturas em nome da pessoa. Antes de terminar, mostro uma lista de quantos pares existem e quanto está em dívida neles.
5. **Indicadores principais**: os 4 valores (Total, Pago, Pendente, Vencido) continuam a contar só as faturas da própria ficha, para não contar a mesma dívida duas vezes.

## Verificação
- Ficha do André: aviso com 260,25 € e link para a Banho de Brilho.
- Ficha da Banho de Brilho: as faturas 5775 e 5776 mostram «Encomendado por André Nogueira Nery».
- Teste automático: a dívida relacionada soma só faturas e notas de débito em aberto, sem notas de crédito.

## Detalhes técnicos
- Nova função de leitura `get_related_company_debt(company_id)`: procura empresas no mesmo workspace com o mesmo email normalizado, ou faturas em que `client_name` coincide com o nome da ficha. Respeita a mesma regra de leitura por workspace.
- Novo cartão `RelatedDebtCard` em `CompanyDetailWithSidebar`. A linha «Encomendado por» fica no histórico de faturas quando `client_name` ≠ nome da empresa.
