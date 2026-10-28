# Pré-visualização mostra «Unauthorized»

## Diagnóstico
- A mensagem «Unauthorized» não vem da aplicação FastCRM: o site oficial (fastcrm.metodopare.ai) continua a funcionar e a aplicação responde normalmente dentro do ambiente de desenvolvimento.
- O bloqueio vem da própria Lovable, que deixa de servir a pré-visualização enquanto o pagamento do plano Pro estiver em atraso (estado «past_due» desde 24/10). O aviso vermelho no topo do ecrã confirma isto.
- Nenhuma alteração ao código resolve este bloqueio.

## Passos para resolver (do seu lado)
1. Carregar em «Atualizar método de pagamento» no aviso vermelho.
2. Atualizar ou substituir o cartão e confirmar o pagamento em atraso.
3. Esperar 1 a 2 minutos, terminar sessão na Lovable e voltar a entrar.
4. Recarregar a pré-visualização.

## Depois do pagamento (do meu lado)
- Confirmar que a pré-visualização volta a abrir.
- Publicar as correções pendentes (faturas/cobranças, segurança de diretos e checkout), que ainda não estão no site oficial.

## Riscos
- Se o pagamento não for regularizado, o espaço de trabalho passa para o plano Free e pode perder funcionalidades do Pro.
