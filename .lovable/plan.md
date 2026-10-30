# Responder no WhatsApp a partir da Caixa de Entrada sem Z-API

## Situação
- Na conversa do Daniel, ao carregar em Enviar aparece «Edge Function returned a non-2xx status code».
- Depois da correção anterior, as conversas guardadas pela extensão já não passam pelo GoHighLevel. Agora vão para a linha WhatsApp do CRM (Z-API), que está desligada por sua escolha. Por isso o envio continua a falhar.
- O aviso continua genérico: a leitura do motivo real do erro não está a funcionar. A causa exata ainda não está confirmada e será o primeiro passo.

## O que vai mudar
1. **Aviso claro em vez de erro técnico**: a Caixa de Entrada passa a mostrar o motivo real (ex.: «Linha WhatsApp do CRM desligada»).
2. **Enviar pela extensão quando o Z-API está desligado**: em conversas WhatsApp sem linha ativa, o botão Enviar passa a «Enviar no WhatsApp Web». O texto escrito abre já preenchido na mesma janela do WhatsApp Web (reaproveitada pela extensão 0.8.0). Basta carregar em Enter lá.
3. **Sem duplicados**: o FastCRM não grava a mensagem nesse momento. A extensão guarda-a automaticamente quando ela aparecer na conversa, como já faz hoje.
4. Um pequeno indicador junto à caixa de escrita: «Envio pelo WhatsApp Web (linha do CRM desligada)».

## Fora do âmbito
- Envio 100% automático sem carregar em Enter (exigiria Z-API ou a API oficial da Meta, ou um robô no WhatsApp Web, que aumenta o risco de bloqueio).
- Reativar o Z-API.

## Detalhes técnicos
- `useMessages.ts`: ler o corpo do erro com `FunctionsHttpError` + `error.context.text()` (JSON.parse seguro) nos ramos GHL e `whatsapp-pro-send`. Confirmar com teste que o motivo chega ao toast.
- Decidir o estado da linha via `src/lib/whatsapp/availability.ts` (opt-outs/consentimentos fail-closed mantidos) e o estado da instância Z-API do workspace.
- `ConversationDetail.tsx` / composer: quando a linha está desligada e o canal é WhatsApp, `onSend` chama `openWhatsAppChat(phone, text)` em vez da mutação, e limpa a caixa.
- Telefone vem de `external_thread_id` (E.164) ou do contacto/lead.
- Testes: um para a escolha do modo de envio (linha desligada → WhatsApp Web; opt-out → bloqueado) e um para a extração do erro.

## Critérios de aceitação
- Na conversa do Daniel, escrever «teste» e carregar em Enviar abre o WhatsApp Web na conversa certa com «teste» escrito, sem abrir janela nova.
- Depois de enviar no WhatsApp Web, a mensagem aparece na Caixa de Entrada em ~20 s, uma única vez.
- Contactos com opt-out continuam bloqueados.
- Nenhum aviso «non-2xx» genérico.
