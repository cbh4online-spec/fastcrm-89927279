# Ligar WhatsApp e chamadas através do GHL

## Diagnóstico (estado real, verificado agora)

**Mensagens WhatsApp via GHL — já existe motor, falta ligar por workspace**
- O webhook `ghl-webhook-message` já reconhece WhatsApp (códigos GHL 9, 15, 16) e o `ghl-send-message` já envia com `type: "WhatsApp"`.
- Existe um "governo de canais": se a tabela de canais sociais do workspace tiver linhas mas nenhuma do tipo `whatsapp` activa, o envio é bloqueado.
- Estado por workspace hoje:
  - METODOPARE: WhatsApp activo, 3 conversas WhatsApp — mas com **linhas duplicadas** de canais (2x whatsapp, vários facebook/instagram repetidos).
  - myMYA Hub: 93 conversas WhatsApp, mas **sem canal whatsapp registado** (só facebook/instagram).
  - PHARLISS e Blecksen: partilham a mesma location GHL e **não têm canal whatsapp** → envio bloqueado.
- Não há ecrã que mostre porque é que o envio foi bloqueado; o utilizador só vê o erro.

**Chamadas via GHL**
- O GHL não expõe API pública para "iniciar uma chamada" a partir de um sistema externo — a marcação real acontece no LC Phone/Twilio dentro do GHL.
- No webhook actual, eventos de chamada (códigos 10 e 20) são mapeados para o canal `sms`, portanto chamadas e voicemails do GHL **não ficam registadas como chamadas** no FastCRM.

## Decisões de produto/UX

1. **WhatsApp**: passa a ser um canal ligável por workspace, com um botão "Ligar WhatsApp" no painel de integrações GHL que valida a location, cria/activa o canal e limpa duplicados. O Inbox e o envio ficam desbloqueados automaticamente.
2. **Chamadas**: como o GHL não permite marcar de fora, o FastCRM oferece duas peças complementares:
   - **Marcar**: botão "Ligar via GHL" ao lado do já existente "Ligar por WhatsApp" — abre a conversa/contacto no GHL (deep link para a location correcta) para marcar em LC Phone, e cria já o registo de chamada no FastCRM.
   - **Registar**: o webhook passa a tratar eventos de chamada do GHL como chamadas reais, criando registos em `voice_call_logs` (direcção, duração, gravação quando existir) e uma atividade na ficha do cliente. Assim, chamadas feitas dentro do GHL aparecem no FastCRM sem trabalho manual.
3. **Diagnóstico visível**: no painel GHL passa a haver, por canal, o estado (ligado/inactivo/duplicado), a última mensagem recebida e o motivo de bloqueio, para deixar de ser adivinhação.

## Plano de implementação

**Fase 1 — WhatsApp ligável (prioritária)**
1. Limpeza de dados: remover linhas duplicadas de canais sociais por workspace (chave workspace + tipo + conta) e criar restrição para impedir novos duplicados.
2. `WorkspaceGHLSettings`: cartão WhatsApp com estado real, botão "Ligar/Desligar", contador de conversas e último evento recebido.
3. Edge function de activação: valida a location no GHL, confirma que existe canal WhatsApp na conta, grava/activa a linha do canal e devolve erro explicativo quando falha.
4. Locations partilhadas (PHARLISS/Blecksen): a activação grava sempre o `ghl_account_id` para o encaminhamento continuar fail-closed e não misturar workspaces.
5. Mensagens de erro do envio passam a dizer "canal WhatsApp não activo neste workspace" com atalho para o ecrã de integrações.

**Fase 2 — Chamadas GHL**
6. Webhook: deixar de mapear códigos de chamada para `sms`; criar/actualizar `voice_call_logs` com `call_type = 'ghl_call'`, direcção, duração, estado e URL de gravação, ligando ao contacto/lead/empresa.
7. Atividade na timeline da entidade para cada chamada recebida do GHL (igual ao que já acontece nas chamadas WhatsApp).
8. Botão "Ligar via GHL" nas fichas de Contacto, Lead e Empresa, com deep link para a location certa e criação imediata do registo de chamada.
9. Lista de chamadas no Inbox/ficha a distinguir origem: GHL, WhatsApp manual, voz interna.

**Fase 3 — Verificação**
10. Teste ponta a ponta por workspace: enviar WhatsApp do FastCRM, receber resposta, confirmar conversa e atividade; simular evento de chamada e confirmar registo.
11. Confirmar isolamento entre PHARLISS e Blecksen (mesma location) — nenhuma mensagem deve cair no workspace errado.

## Critérios de aceitação

- Cada workspace consegue ligar/desligar WhatsApp GHL num clique e vê o estado real.
- Envio de WhatsApp pelo Inbox funciona nos workspaces ligados; nos não ligados o erro explica o motivo.
- Não existem canais duplicados e novos duplicados são impossíveis.
- Chamadas feitas no GHL aparecem como chamadas no FastCRM, com duração e gravação quando disponível.
- Botão "Ligar via GHL" abre o contacto correcto e deixa registo na ficha.
- Workspaces com location partilhada continuam isolados.

## Riscos e pontos por validar

- O GHL não permite iniciar chamadas por API: a marcação é sempre assistida (abre o GHL). Se quiser marcação 100 % automática, isso implica ligar directamente a um fornecedor de voz (Twilio), fora deste âmbito.
- Payloads de chamada do GHL variam conforme o fornecedor de voz; a Fase 2 pode precisar de um evento real para afinar o mapeamento.
- A limpeza de duplicados altera dados existentes: será feita de forma conservadora, mantendo sempre a linha mais antiga activa.
