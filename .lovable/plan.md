# Finalizar WhatsApp: Extensão Chrome/Edge + Conversas na ficha

## Diagnóstico (fase 1, já feito)
- PHARLISS: ligação Z-API desligada («Client-Token not allowed»).
- myMYA Hub: ligação Z-API desligada («renew subscription»).
- 0 mensagens enviadas em 30 dias; só 9 recebidas a 01/10.
- Sem ligação ativa, nada pode ser testado com conversas reais.

## Pré-requisitos do utilizador
1. Renovar a subscrição Z-API de myMYA Hub.
2. Corrigir o Client-Token em PHARLISS e voltar a ligar em Definições → WhatsApp.
3. Indicar os espaços de trabalho piloto da extensão.

## Fase 2 — Conversas na ficha (Lead / Contacto / Empresa)
- Histórico unificado por telefone (todas as variantes do número).
- Caixa de resposta: texto livre dentro das 24h; fora disso, só modelo aprovado.
- Estados de envio/entrega/leitura por mensagem.
- Estados: a carregar, vazio, erro, sem ligação ativa (com link para Definições).
- Respeita opt-outs e consentimentos (botão bloqueado quando aplicável).
- Funciona no telemóvel; link «Abrir na Inbox».

## Fase 3 — Extensão Chrome/Edge (ativação controlada)
- Ativar a leitura só para os espaços piloto (restantes continuam desligados).
- Painel lateral: identifica contacto/empresa pelo número, mostra próxima tarefa e dívida, cria lead com verificação de duplicados.
- Nova versão v0.5.0 em ZIP para instalação manual; sem publicação na Chrome Web Store sem autorização.

## Fase 4 — Envios automáticos (desligados por omissão)
- Primeira automação proposta: lembrete de faturas vencidas.
- Condições obrigatórias: consentimento, sem opt-out, horário Europe/Lisbon, limite diário.
- Só modelos aprovados pela Meta; registo na ficha e auditoria; se bloqueado, cria tarefa manual.
- Ativação por espaço de trabalho com pré-visualização.

## Detalhes técnicos
- Reutilizar `phoneOptOutVariants`, `availability.ts`, `useWhatsAppStopSignals`.
- Nova função servidor `whatsapp-auto-send-gate` como único caminho para envios automáticos; tabela de configuração por workspace com RLS, GRANT e auditoria.
- Flags da API da extensão por workspace (allowlist piloto), fail-closed.
- Atualizar AGENTS.md: regra «WhatsApp só assistido» passa a «automáticos só via gate central».
- Testes: opt-out, fora de horário, limite atingido, consentimento revogado, workspace não piloto.

## Critérios de aceitação
- Conversa real aparece na ficha certa e é possível responder sem sair.
- Extensão identifica o contacto num espaço piloto e é recusada fora dele.
- Nenhum envio automático para números com opt-out ou sem consentimento.

## Riscos / por validar
- Depende de religar o Z-API; sem isso as fases 2–4 ficam só com testes simulados.
- Modelos Meta podem demorar até 48h a ser aprovados.
