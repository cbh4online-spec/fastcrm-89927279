# SAF-T de hoje: faturas não aparecem na ficha do cliente

## Diagnóstico (confirmado nos dados)
As 25 faturas do SAF-T de hoje foram importadas e estão todas ligadas a uma empresa, mas algumas ficaram na empresa errada. Exemplo: a FT V101.01/993 da **Adelcia Maria Monteiro Garcia** ficou na ficha «Trico Spa Cabo Verde, Sociedade Unipessoal Lda».

Como acontece:
1. A importação procura primeiro o cliente pelo NIF. Na ficha da Adelcia o NIF está gravado como «LU 34823971», com espaço, e o SAF-T traz o mesmo NIF escrito de outra forma. Por isso não encontra a ficha.
2. A seguir procura pelo email. As duas fichas têm o mesmo email (adelciagarcia@hotmail.com), e a importação escolhe uma delas ao acaso.
3. Quando existem fichas repetidas com o mesmo nome (por exemplo Irina Gusan, com 2), a fatura também pode ir para a ficha que não está a ver.

Em todas as importações SAF-T, 550 das 6.300 faturas estão numa empresa com um nome diferente do cliente da fatura. Parte destas são casos legítimos (empresa e sócio), parte são erros como este.

## O que vou fazer
1. **Comparar o NIF de forma tolerante:** ignorar espaços, pontos e o prefixo do país (PT, LU, …), tanto na ficha como no SAF-T.
2. **Ordem de procura mais segura:** NIF → nome igual → email. Pelo email só associa se houver uma única ficha com esse email. Se houver mais do que uma, desempata pelo nome do cliente.
3. **Corrigir as faturas já importadas:** voltar a associar as faturas SAF-T cujo NIF normalizado corresponde a outra ficha. A Adelcia recebe a FT V101.01/993 e as restantes faturas desviadas.
4. **Lista para rever:** os casos em que o nome é diferente e não há NIF a confirmar ficam numa lista para decidir. Não os mudo automaticamente.
5. Publicar a função de importação e confirmar no ecrã que a ficha da Adelcia mostra a fatura de hoje.

## Critérios de aceitação
- Um novo SAF-T coloca cada fatura na ficha com o mesmo NIF, mesmo que esteja escrito com ou sem espaço ou prefixo.
- Duas fichas com o mesmo email deixam de receber faturas uma da outra.
- Testes automáticos para a normalização do NIF e para a ordem de procura.

## Riscos
- As fichas repetidas, como Irina Gusan e Marisa Junqueira, continuam a precisar de ser juntadas. Isso fica para um passo à parte.
