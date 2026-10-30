# Corrigir «Ligação cancelada» na extensão 0.5.0

## Diagnóstico
- A 0.5.0 já está instalada (o painel mostra «Versão 0.5.0 · piloto»). Ao carregar em «Ligar ao FastCRM», a janela de autorização falha e o painel mostra «Ligação cancelada».
- A causa mais provável é esta: o FastCRM só aceita o regresso da autorização para um endereço fixo, ligado ao código de identificação que a extensão tinha quando foi registada (mccfdfoncfgafcebopbmlolinphcgegd). Uma extensão instalada a partir de uma pasta, sem chave fixa, recebe um código novo sempre que é carregada de outra pasta ou noutro computador. Se o código mudou, o FastCRM recusa o regresso, a janela fecha sem concluir e o painel interpreta isso como cancelamento.
- O painel também esconde o motivo real: qualquer falha aparece como «Ligação cancelada».
- O aviso vermelho «Reconectar» na Caixa de Entrada é outro problema, que já conhecíamos: a subscrição do serviço WhatsApp do myMYA Hub expirou. Não tem relação com a extensão.

## O que vou fazer
1. Fixar o código da extensão: acrescentar uma chave pública ao pacote, para que o código seja sempre o mesmo, em qualquer pasta ou computador.
2. Registar no FastCRM o endereço de regresso desse código fixo, mantendo também o atual durante a transição.
3. Mostrar o motivo real da falha no painel («endereço de regresso não autorizado», «janela fechada», «sem sessão no FastCRM») e, em Configurações, o código da extensão e o endereço de regresso, para ser fácil diagnosticar.
4. Gerar a versão 0.5.1 (ZIP) e manter os testes a passar.
5. Confirmar no servidor que o pedido de autorização com o novo endereço chega à página de consentimento do FastCRM.

## O que precisa de fazer depois
- Remover a 0.5.0 em chrome://extensions, carregar a 0.5.1 e carregar em «Ligar ao FastCRM». Se ainda não tiver sessão iniciada no FastCRM, a janela pede o início de sessão e depois «Autorizar».
- Renovar a subscrição do serviço WhatsApp do myMYA Hub, para o aviso «Reconectar» desaparecer.

## Critérios de aceitação
- Depois de autorizar, o painel mostra «Ligado ao FastCRM».
- Se falhar, o painel diz o motivo concreto, nunca apenas «cancelada».
- O código da extensão é o mesmo após reinstalação noutra pasta.

## Detalhes técnicos
- Gerar um par de chaves RSA e colocar a chave pública em `"key"` no `manifest.json`. O código da extensão é derivado desse valor (SHA-256, a–p). A chave privada não vai para o pacote.
- Atualizar `redirect_uris` do cliente OAuth `498e10aa-…` com o novo `https://<id>.chromiumapp.org/oauth2`.
- `oauth-client.js`: mapear `chrome.runtime.lastError`/mensagem do `launchWebAuthFlow` («Authorization page could not be loaded», «The user did not approve access») para códigos distintos.
- Atualizar `ALLOWED_ORIGIN` no servidor para `chrome-extension://<novo id>` e voltar a publicar `fastcrm-whatsapp-extension-api`.
