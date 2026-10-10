# Sincronização Stripe nos Contratos não funciona

## Diagnóstico (até agora)
- O botão «Sincronizar Stripe» da página de Renovações chama a função `sync-stripe-renewals`.
- Os registos dessa função estão **vazios**: não há sinal de que tenha sido chamada recentemente com sucesso. Isto sugere uma de três causas, ainda **por confirmar**:
  1. A função não está publicada (ou ficou numa versão antiga) e o pedido falha antes de entrar.
  2. A função dá erro/timeout (procura por email de cada contrato sem subscrição, até 200, com várias chamadas ao Stripe cada — pode ultrapassar o tempo limite) e o ecrã mostra só uma mensagem genérica.
  3. A função responde «sucesso» mas sem alterações (ex.: nenhum contrato ligado a uma subscrição e a auto-ligação não encontra correspondência única), e parece que «não faz nada».
- Também não está confirmado se este workspace usa uma chave Stripe própria ou a chave global.

## O que vou fazer
1. **Confirmar a causa**: chamar a função com a tua sessão no workspace Central Business Hub, ler a resposta e os registos, e contar quantos dos 17 contratos têm subscrição Stripe ligada.
2. **Corrigir conforme a causa**:
   - Se não estiver publicada → republicar a função.
   - Se for timeout → limitar a auto-ligação por execução (ex.: 25 contratos), fazer as chamadas ao Stripe em paralelo controlado e devolver progresso parcial em vez de falhar.
   - Se não houver contratos ligados → mostrar no aviso final quantos ficaram por ligar e porquê (sem email, vários candidatos, nenhum cliente Stripe).
3. **Mensagens claras no ecrã**: ler o erro real da função (em vez de «non-2xx») e mostrá-lo em português no aviso.
4. **Verificar**: correr de novo, confirmar movimentos/faturas/datas atualizados e ausência de erros na consola; testes e build.

## Critérios de aceitação
- Carregar em «Sincronizar Stripe» mostra um resumo real (sincronizados, ligados, faturas novas, erros) e os contratos atualizam.
- Em caso de falha, aparece a causa concreta em português.
- Nenhum pagamento, subscrição ou fatura é duplicado.

## Por validar
- Que mensagem aparece exatamente quando carregas no botão (erro, ou «concluída» sem mudanças)?
