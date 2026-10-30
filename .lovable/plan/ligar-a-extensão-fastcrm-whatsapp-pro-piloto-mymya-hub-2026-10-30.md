# Ligar a extensão FastCRM WhatsApp Pro (piloto myMYA Hub)

## Diagnóstico
- O painel mostra «Configuração OAuth pendente» e «Não foi possível ligar» porque a extensão foi entregue **desligada de propósito**: falta o identificador público de ligação e a pesquisa no painel está bloqueada.
- O servidor de autorização do FastCRM está ativo e aceita registo de clientes; nada está avariado do lado do CRM.
- Está instalada a v0.4.2; a mais recente é a v0.4.3.
- A pesquisa por telefone no site (lado esquerdo) funciona: 1 contacto e 3 leads para 925990747 (há 3 leads duplicadas «Jorge Cardoso/Teste/jorge»).

## O que vou fazer
1. Pedir-lhe o endereço de retorno exato (separador «Configurações» da extensão, `https://<id>.chromiumapp.org/oauth2`) — sem ele o registo falha.
2. Registar a extensão como cliente público (PKCE obrigatório, só esse endereço de retorno).
3. Preencher o identificador na extensão e ativar a pesquisa **só para myMYA Hub**; outros espaços recebem recusa clara.
4. No painel: identificar contacto/lead pelo número, mostrar próxima tarefa e dívida, criar lead com verificação de duplicados.
5. Gerar ZIP v0.5.0 para instalação manual (sem publicação na Chrome Web Store).
6. Sugerir juntar as 3 leads duplicadas do seu número (só com a sua confirmação).

## Detalhes técnicos
- `lib/oauth-config.js`: `PUBLIC_CLIENT_ID`, `API_READY=true`; host do backend passa a permissão pedida no primeiro «Ligar».
- Endpoint de leitura da extensão com allowlist por workspace (fail-closed), validação de token e membro do workspace, auditoria de cada pesquisa, limite de pedidos.
- Testes: workspace fora do piloto recusado, token inválido recusado, número com variantes encontrado.

## Critérios de aceitação
- «Ligar ao FastCRM» abre o consentimento, volta ligado e mostra o contacto do número aberto no WhatsApp Web.
- Em PHARLISS a pesquisa é recusada com mensagem clara.

## Por validar
- Endereço de retorno da extensão (bloqueante).
- O ID muda se reinstalar a extensão a partir de outra pasta; manter sempre a mesma pasta.
