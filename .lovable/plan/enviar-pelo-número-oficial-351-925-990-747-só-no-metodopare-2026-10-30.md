# Enviar pelo número oficial (+351 925 990 747) só no METODOPARE

## O que muda para si
- No workspace **METODOPARE**, a janela «WhatsApp — Nova Mensagem» deixa de dizer «não foi configurado» e o botão **Enviar** sai pelo número oficial da Meta.
- A Caixa de Entrada do METODOPARE também responde por esse número.
- Nos outros workspaces nada muda: continuam com a linha que já tinham ou com «Abrir no WhatsApp Web».
- Opt-outs e consentimentos continuam a bloquear envios, como hoje.

## Regras da Meta que vai sentir
- Respostas a quem lhe escreveu nas últimas 24 h: texto livre e grátis.
- Fora dessas 24 h, a Meta só aceita **modelos aprovados**. Nesse caso aparece um aviso claro, em vez de um erro técnico. Os modelos e a sua aprovação ficam para uma fase seguinte.
- As respostas dos clientes **ainda não entram por esta linha** (ver «Fora do âmbito»). Continuam a entrar pela extensão.

## Passos
1. Ligar o conector «Central's WhatsApp Business» ao projeto (vai aparecer um cartão para confirmar).
2. Registar no METODOPARE uma linha do tipo «Meta oficial» com o número +351 925 990 747, e desativar a linha Z-API antiga desse workspace. Fica marcada como add-on ativo (49 €/mês).
3. Mudar o motor de envio do servidor: quando a linha do workspace for «Meta oficial», enviar pela Meta. Recusar sempre se o pedido vier de outro workspace.
4. Mostrar a linha oficial como «Ligado» na janela de Nova Mensagem e em Definições → Canais.
5. Traduzir os erros da Meta para português simples (fora das 24 h, número inválido, limite diário durante a revisão da Meta).
6. Testes: só o METODOPARE consegue enviar pela linha oficial; outro workspace é recusado; o erro das 24 h vira aviso claro.
7. Enviar uma mensagem de teste para um número seu, com a sua autorização.

## Fora do âmbito (fase seguinte, precisa de decisão sua)
- **Receber respostas no CRM por esta linha:** com o conector da Meta, isto obriga a mudar a estrutura de toda a aplicação. É um projeto grande, a planear à parte.
- Cobrança automática dos 49 €, modelos de mensagem e campanhas.

## Detalhes técnicos
- `whatsapp_provider_instances`: nova linha `provider_name='meta_cloud_api'` (já permitido pela constraint) para METODOPARE, `external_instance_id = phone_number_id`; a Z-API desse workspace fica `active=false`.
- `whatsapp-pro-send`: novo ramo `meta_cloud_api` → `POST https://connector-gateway.lovable.dev/whatsapp/messages` com `LOVABLE_API_KEY` + `WHATSAPP_API_KEY`, destino só em dígitos E.164. Mantém guardas existentes (stop signals, workspace membership). Allowlist do workspace guardada na instância, nunca do cliente.
- Erro Meta 131047 (fora das 24 h) → `{ fallback: true, code: 'OUTSIDE_24H' }`, para o frontend mostrar o aviso já existente com «Abrir no WhatsApp Web».
- `useWhatsAppZapiConnection` / `QuickWhatsAppZapiDialog`: considerar ligada uma instância `meta_cloud_api` ativa.
- Os pedidos do add-on: o pedido METODOPARE fica com `status='active'`.
