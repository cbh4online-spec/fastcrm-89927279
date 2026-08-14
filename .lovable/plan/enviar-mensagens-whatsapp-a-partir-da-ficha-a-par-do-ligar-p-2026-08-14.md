# Enviar mensagens WhatsApp a partir da ficha (a par do "Ligar por WhatsApp")

Hoje as fichas de Contacto, Lead e Empresa já têm "Ligar por WhatsApp" e "Ligar via GHL", mas não há forma de **enviar uma mensagem** sem sair para o Inbox. Este plano acrescenta esse botão, ao lado dos de chamada.

## O que vai ser construído

### 1. Botão "Enviar WhatsApp"
- Novo botão junto aos de chamada nos cabeçalhos de Contacto, Lead e Empresa.
- Ativo apenas com telefone válido (normalização E.164, default PT +351); desativado com explicação quando não há número.

### 2. Diálogo de envio
- Campo de mensagem com contador de caracteres e validação (1–4000).
- Escolha de **template** existente do WhatsApp Pro, com pré-visualização e substituição de variáveis (nome, empresa).
- Escolha do canal de envio, com deteção automática do que está disponível no workspace:
  - **FastCRM WhatsApp Pro** (envio direto pelo motor já existente) — opção por omissão quando há instância ativa.
  - **WhatsApp GHL** — quando o workspace tem canal WhatsApp GHL ativo.
  - **Abrir no WhatsApp** (deep link `wa.me` com texto pré-preenchido) — sempre disponível como alternativa/fallback quando não há canal ligado.
- Estados tratados: a enviar, sucesso, erro com motivo legível (ex.: "canal WhatsApp não ativo neste workspace" com atalho para Integrações).

### 3. Registo na atividade
- Cada envio gera uma entrada na timeline da entidade (mesmo mecanismo já usado pelas chamadas WhatsApp), com canal usado, resumo do texto e quem enviou.
- No modo "Abrir no WhatsApp" o registo é criado no momento do clique e marcado como envio assistido (o CRM não consegue confirmar entrega).
- Quando o envio é feito pelo motor, a conversa do Inbox é atualizada e o registo liga à conversa.

## Detalhes técnicos

- Novo `WhatsAppMessageButton.tsx` + `WhatsAppMessageDialog.tsx` em `src/components/voice/` (ou `src/components/whatsapp/`), a espelhar o padrão de `WhatsAppCallButton`/`WhatsAppCallDialog`.
- Envio pelo canal próprio via `useSendWhatsApp` (`src/modules/whatsapp`), que encapsula `whatsapp-pro-send`. Nunca invocar a edge function diretamente.
- Envio GHL via `ghl-send-message` com `type: "WhatsApp"`, reutilizando a resolução de canal já existente; erros de canal inativo devolvidos tal como no Inbox.
- Disponibilidade dos canais lida de `useWhatsAppProviderInstance` e da tabela de canais sociais GHL do workspace.
- Templates de `useWhatsAppProTemplates`.
- Normalização do número reutiliza `normalizeWhatsAppNumber` de `useWhatsAppCall.ts`.
- Registo de atividade reutiliza o helper já usado pelo `useWhatsAppCall` para escrever em `entity_activities` — sem alterações de schema.

## Critérios de aceitação

- Botão visível em Contacto, Lead e Empresa; desativado sem telefone válido.
- Envio funciona pelo canal ativo do workspace e a mensagem aparece na conversa do Inbox.
- Sem canal ligado, a alternativa "Abrir no WhatsApp" abre a conversa com o texto pré-preenchido.
- Todos os envios ficam na atividade da entidade.
- Erros mostram motivo claro e caminho de resolução.

## Riscos e pontos por validar

- Envio direto exige instância WhatsApp ativa no workspace (hoje só alguns têm); nos restantes, só o modo deep link funciona.
- No modo deep link não há confirmação de entrega — o registo indica isso explicitamente.
