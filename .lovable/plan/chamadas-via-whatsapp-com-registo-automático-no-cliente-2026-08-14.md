# Chamadas via WhatsApp com registo automático no cliente

Permitir ligar por WhatsApp (sem custos de telecom) a partir da ficha de Contacto/Lead/Empresa, e ficar o registo da chamada na atividade do cliente.

## Nota técnica que condiciona o desenho

Nenhuma API de WhatsApp disponível no projeto (Z-API) permite iniciar chamadas de voz por servidor. A chamada tem obrigatoriamente de partir da app WhatsApp do utilizador (Desktop/Web ou telemóvel). O CRM trata de: abrir o WhatsApp no número certo, criar o registo e recolher o resultado.

## O que vai ser construído

### 1. Botão "Ligar por WhatsApp"
- Novo botão junto ao telefone nas fichas de Contacto, Lead e Empresa (e no cabeçalho IX das mesmas).
- Só ativo quando existe telefone válido; normalização automática para E.164 (default PT +351).
- Ao clicar abre um diálogo com deteção de dispositivo:
  - **Desktop**: abre WhatsApp Desktop/Web na conversa do número (`whatsapp://send?phone=` com fallback `https://web.whatsapp.com/send?phone=`) e mostra instrução curta "clique no ícone de telefone para ligar".
  - **Mobile**: abre diretamente `https://wa.me/<numero>`.
  - Em desktop mostra também um **QR code** para abrir no telemóvel do comercial.

### 2. Registo automático + confirmação
- No momento do clique cria-se logo um registo de chamada com estado `iniciada` (direção saída, canal WhatsApp, contacto/lead/empresa associados, quem ligou, hora de início).
- O diálogo passa a um mini-formulário de fecho: duração (cronómetro automático a correr desde o clique, editável), resultado (atendeu / não atendeu / remarcar / sem interesse / …), notas.
- Ao guardar, o registo fecha e aparece na **timeline de atividade** do cliente e no histórico de chamadas.
- Se o utilizador fechar sem confirmar, o registo fica em `iniciada` e é apresentado como pendente de fecho no próximo acesso à ficha (evita chamadas fantasma).

### 3. Número de saída por utilizador
- Cada comercial define o seu número WhatsApp no perfil ("O meu número WhatsApp para chamadas").
- Esse número é gravado no registo como `from_number`, permitindo saber quem ligou e de que número.
- Se não estiver configurado, o diálogo avisa uma vez e oferece link direto para configurar (não bloqueia a chamada).

## Detalhes técnicos

- **Dados**: reutiliza a tabela existente `voice_call_logs` (já tem `contact_id`, `lead_id`, `customer_id`, `call_direction`, `call_type`, `status`, `from_number`, `to_number`, `duration_seconds`, `outcome`, `notes`, `metadata`). Novos registos usam `call_type = 'whatsapp'` — sem alterações de schema aqui.
- **Nova tabela** `user_whatsapp_call_settings` (user_id, workspace_id, from_number, preferred_device, timestamps) com RLS: cada utilizador só lê/escreve as suas próprias definições dentro do workspace; GRANTs para `authenticated` e `service_role`.
- **Novo hook** `useWhatsAppCall` (criar registo, fechar registo, ler pendentes) + `useMyWhatsAppCallNumber`.
- **Novos componentes**: `WhatsAppCallButton.tsx` e `WhatsAppCallDialog.tsx` em `src/components/voice/`, reutilizando o padrão do `ClickToCallButton`/`LogCallDialog` já existentes.
- **Atividade**: o registo é espelhado na timeline através do mecanismo já usado pelas chamadas VoiceHub, para aparecer em "Atividade" da ficha.
- Sem custos e sem dependência de Z-API/Twilio para esta funcionalidade.

## Critérios de aceitação

- Botão visível e funcional em Contacto, Lead e Empresa com telefone válido.
- Desktop abre WhatsApp Web/Desktop; mobile abre a app; QR disponível em desktop.
- Cada chamada gera registo imediato e permite fecho com duração, resultado e notas.
- Registo visível na atividade do cliente com o número de saída do utilizador.
- Estados tratados: sem telefone, número inválido, sem número de saída configurado, chamada por fechar.

## Riscos / por validar

- O WhatsApp não devolve ao CRM se a chamada foi atendida nem a duração real — esses dados dependem da confirmação do utilizador.
- Deep link `whatsapp://` pode não abrir se o WhatsApp Desktop não estiver instalado; fica sempre o fallback para WhatsApp Web.
