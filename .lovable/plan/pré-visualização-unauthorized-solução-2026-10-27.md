# Pré-visualização «Unauthorized» — solução

## Diagnóstico (verificado agora, 27/10/2026 15:05)
- A aplicação está a funcionar: a pré-visualização interna e o site oficial https://fastcrm.metodopare.ai respondem normalmente (HTTP 200).
- A subscrição Lovable do espaço «Central's Lovable» está **Pro — pagamento em atraso desde 24/10/2026**.
- A mensagem «Unauthorized» vem da própria plataforma Lovable, que bloqueia a pré-visualização enquanto o pagamento não for regularizado (é a mesma barra vermelha no topo). Não é um erro do FastCRM e não se resolve alterando o código.

## O que fazer
1. Carregar em **«Atualizar método de pagamento»** na barra vermelha (ou em Definições do espaço de trabalho → Faturação).
2. Confirmar/substituir o cartão e garantir que o pagamento pendente é cobrado.
3. Esperar 1–2 minutos, recarregar a página do editor (ou terminar sessão e voltar a entrar).
4. A pré-visualização volta a carregar. Se ainda falhar depois de o pagamento aparecer como regularizado, voltar a reportar para eu investigar mais.

## Riscos
- Se o pagamento não for resolvido, o espaço passa para o plano Free quando as tentativas de cobrança se esgotarem, com perda de funcionalidades Pro.
- O site oficial continua a funcionar entretanto, mas novas publicações podem ficar bloqueadas.

## Alterações ao projeto
Nenhuma. Não há código, base de dados ou definições a mudar para este problema.
