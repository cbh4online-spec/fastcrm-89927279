
# Automatizar Sequencia AIDA de Prospeccao — IMPLEMENTADO ✅

## Resumo

Quando o utilizador envia a Msg 1, o sistema agenda automaticamente Msg 2 (Dia +3) e Msg 3 (Dia +7) na fila `prospecting_outreach_queue`. Um cron cada 30 min marca items vencidos como "ready" e cria notificações. O painel de outreach pendente mostra follow-ups prontos para enviar com um clique.

## Implementado

1. ✅ Tabela `prospecting_outreach_queue` com RLS
2. ✅ Lógica no `ProspectingMessageDialog` para inserir Msg 2 e 3 na fila ao enviar Msg 1
3. ✅ Edge Function `prospecting-outreach-processor` 
4. ✅ Cron Job cada 30 min
5. ✅ `PendingOutreachPanel` no topo da página de Prospecção
6. ✅ Cancelamento automático ao converter/rejeitar perfil
