

## Diagnóstico

O ficheiro `whatsapp-status-detection-complete.md` propõe **pela quarta vez** a mesma arquitectura alternativa já rejeitada:

- Nova tabela `whatsapp_devices` — duplica `whatsapp_qr_connections`
- Novas edge functions — duplicam as existentes já corrigidas
- Novo hook `useWhatsAppDevices` — duplica `useWhatsAppQRConnection`

## Estado actual (já implementado e deployed)

| Requisito | Implementação existente |
|---|---|
| Detecção LOGOUT/NOT_CONNECTION | `mapEvolutionState` + `fetchInstances` no `whatsapp-qr-status` |
| Captura de erros (pre-key, keep-alive) | `disconnectionObject` → `last_error` |
| Webhook real-time | `whatsapp-evolution-webhook` trata `connection.update` |
| Polling fallback | `useWhatsAppQRConnection` com 5s adaptativo |
| UI alerta vermelho + reconexão | `WhatsAppConnectionCard` com banner `repair_required` |
| Campos de tracking | `sync_health`, `recovery_state`, `sync_issue_reason`, `last_error`, `recovery_attempt_count` em `whatsapp_qr_connections` |

## Recomendação

**Não implementar.** Todas as funcionalidades descritas nas 970 linhas do ficheiro já existem no sistema actual, distribuídas pelos ficheiros correctos e sem duplicação de dados.

O próximo passo útil continua a ser **testar o fluxo em produção**: desconectar o dispositivo WhatsApp no telemóvel e verificar que o FastCRM detecta a mudança e apresenta o alerta correcto com botão de reconexão.

