# Corrigir WhatsApp: extensão e envio no CRM

## Diagnóstico (da captura)
Há dois problemas diferentes no ecrã:

1. **Painel da extensão diz "Configuração OAuth pendente" e "Versão 0.4.3 · piloto".** O Chrome ainda está a usar a versão antiga (0.4.3), que vem desligada de propósito. A versão 0.5.0, já preparada e ligada ao FastCRM, ainda não foi instalada por cima.
2. **Janela "Nova Mensagem" diz "WhatsApp não está ligado".** O serviço de envio (Z-API) do myMYA Hub continua desligado (a subscrição precisa de ser renovada). Sem isso, o CRM não consegue enviar mensagens nem receber conversas. Nenhuma alteração ao código resolve este ponto.

## O que vou fazer
1. Confirmar que o pacote 0.5.0 está completo e, se faltar, gerá-lo de novo (incluindo qualquer referência à 0.4.3 que tenha ficado).
2. Melhorar o aviso do painel: em vez de "OAuth pendente", mostrar "Versão desatualizada — instale a 0.5.0" quando a versão antiga estiver ativa.
3. Melhorar o aviso da janela "Nova Mensagem": dizer o motivo real ("Subscrição do serviço WhatsApp expirada" ou "Token inválido"), com botão para Definições → Canais → WhatsApp. Também permitir "Abrir no WhatsApp Web" como alternativa enquanto o envio estiver desligado (envio assistido).
4. Voltar a verificar o estado da ligação do myMYA Hub e do PHARLISS depois de renovar.

## O que precisa de fazer
- Em chrome://extensions: remover a 0.4.3, "Carregar expandida" com a pasta da 0.5.0 e recarregar o WhatsApp Web.
- Renovar a subscrição Z-API do myMYA Hub (e corrigir o Client-Token no PHARLISS).

## Critérios de aceitação
- O painel mostra "Versão 0.5.0 · piloto" e o botão "Ligar ao FastCRM" abre o início de sessão.
- A janela "Nova Mensagem" explica o motivo concreto e oferece a alternativa via WhatsApp Web.
- Depois da renovação, "Enviar" fica ativo e a mensagem aparece na Caixa de Entrada.

## Detalhes técnicos
- Estado vem de `whatsapp_instances`/verificação de estado do Z-API; mapear erros ("renew subscription", "Client-Token not allowed") para textos pt-PT.
- Extensão: comparar `chrome.runtime.getManifest().version` com versão mínima devolvida pela API.
