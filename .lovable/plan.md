# Concluir a integração WhatsApp: extensão + conversas no CRM + envios automáticos

## Ponto de partida (confirmado)
- Extensão Chrome/Edge v0.4.3 em `extensions/fastcrm-whatsapp-pro`, com a API de leitura do CRM ainda inativa (desligada por opção de configuração).
- As fichas de Lead, Contacto e Empresa já mostram uma secção de mensagens (`ContactMessagesSection` + `LinkedConversationsCard`), e existe a Inbox geral.
- Já existem dezenas de funções de envio, webhooks e regras (Z-API, WhatsApp Pro, opt-outs e consentimentos).

## Fase 1 — Diagnóstico (antes de alterar código)
1. Ver que fornecedor está ligado em cada workspace (Z-API / WhatsApp Pro) e se as mensagens recebidas estão a chegar. Vou contar as mensagens recebidas e enviadas dos últimos 7 dias.
2. Abrir, com sessão iniciada, uma ficha com conversa real e confirmar: aparece o histórico? dá para responder? o botão respeita opt-out e consentimento?
3. Fazer uma lista das falhas encontradas, com evidência para cada uma. As fases seguintes só corrigem o que estiver confirmado.

## Fase 2 — Conversas na ficha do cliente
- Histórico unificado por telefone na ficha (usando as variantes do mesmo número), atualizado em tempo real.
- Caixa de resposta na própria ficha. Dentro das 24 h envia texto livre; fora desse período obriga a usar um modelo aprovado.
- Estados de entrega (enviada, entregue, lida, falhou), com o motivo quando falha.
- Estados de carregamento, vazio e erro, bom funcionamento no telemóvel e ligação «Abrir na Inbox».

## Fase 3 — Extensão (ativação controlada)
- Ativar a API de leitura só para workspaces piloto escolhidos por si. Fica desligada nos restantes.
- Painel lateral: identificar o contacto/lead pelo número aberto no WhatsApp Web, ver a próxima tarefa e a dívida em aberto, e criar uma lead com a verificação de duplicados.
- Gerar um novo ZIP v0.5.0 para o piloto. Não será publicado na Chrome Web Store sem a sua autorização explícita.

## Fase 4 — Envios automáticos (novo, com proteções)
Cada automação terá estas regras:
- **Gatilho**: lembrete de fatura vencida, confirmação de encomenda, aniversário ou passo de uma sequência.
- **Condição obrigatória**: consentimento válido, sem opt-out, dentro do horário permitido (Europe/Lisbon) e dentro do limite diário por workspace. Se houver dúvida, não envia.
- **Ação**: enviar um modelo aprovado.
- **Registo**: guardado na ficha e no histórico de auditoria.
- **Alternativa**: se o envio falhar, cria uma tarefa para envio manual.
- Começa desligado em cada workspace, com um botão para ligar e uma pré-visualização dos destinatários antes de ativar.
- Esta regra muda a regra atual de «WhatsApp só assistido». O registo de arquitetura passa a dizer que os envios automáticos só podem passar pelo novo controlo central.

## Detalhes técnicos
- Um controlo central `whatsapp-auto-send-gate` (função no servidor) reutiliza `phoneOptOutVariants`, `availability.ts` e a verificação de consentimentos. Os automatismos atuais (`send-scheduled-reminders`, `birthday-greetings`, `sequence-dispatch`) passam a enviar por ele.
- Nova tabela de configuração por workspace (ligado/desligado, horário, limite diário), com RLS por workspace, GRANT e auditoria em `activity_logs`.
- Testes: bloqueio por opt-out, fora do horário, limite atingido e consentimento revogado (um teste por regra).

## Critérios de aceitação
- Uma conversa real aparece na ficha certa e é possível responder sem sair dela.
- A extensão identifica o contacto no piloto. Os workspaces fora do piloto não recebem dados.
- Nenhum envio automático chega a um número com opt-out ou sem consentimento.

## Pontos por validar
- Que workspaces entram no piloto da extensão.
- Que automações ligar primeiro. Proponho começar pelos lembretes de faturas vencidas.
- Que modelos de mensagem já estão aprovados pela Meta. A aprovação de modelos novos pode demorar até 48 h.
