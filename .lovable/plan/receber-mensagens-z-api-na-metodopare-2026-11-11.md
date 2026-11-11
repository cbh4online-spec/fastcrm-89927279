# Receber mensagens Z-API na METODOPARE

## Objetivo
O numero Z-API passa a receber e enviar apenas na organizacao METODOPARE.

## Passos
1. Desligar a ligacao Z-API duplicada na myMYA Hub (marcada como desligada, nao apagada; historico mantido). A linha Z-API dessa organizacao fica inativa.
2. Na METODOPARE, apontar todos os avisos da Z-API (mensagem recebida, entrega, estado, ligacao) para o FastCRM da METODOPARE, chamando a configuracao de avisos ja existente no servidor.
3. Confirmar com dados reais: a ligacao fica marcada como configurada e os avisos seguintes chegam com a organizacao METODOPARE nos registos.
4. Pedir-lhe que envie uma mensagem do seu telemovel para o numero; confirmar que aparece na Inbox da METODOPARE.

## Protecao para o futuro
- Ao ligar um numero Z-API numa organizacao, se o mesmo numero ja estiver ligado noutra, mostrar aviso e exigir confirmacao, desligando a anterior. Evita que as mensagens voltem a ir para o sitio errado.

## Detalhes tecnicos
- `whatsapp_zapi_connections`: instancia 3F2AB... existe em myMYA Hub (430c7917) e METODOPARE (d9e3d0ae, webhook_configured=false). Atualizar a de myMYA Hub para status=disconnected; `whatsapp_provider_instances` zapi de 430c7917 active=false.
- Executar a logica de `whatsapp-zapi-configure-webhook` para d9e3d0ae (update-webhook-* com ?ws=d9e3d0ae&secret=...).
- `whatsapp-zapi-connect`: verificacao de instance_id duplicado noutro workspace (fail-closed com confirmacao explicita).
- Webhook ja ignora fromMe para bots (sem risco de loop).
