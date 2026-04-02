

## Diagnóstico

O ficheiro `lovable-prompt-whatsapp-ui.md` propõe **a mesma reimplementação** já rejeitada duas vezes:

- Nova tabela `whatsapp_devices` → **desnecessária** — `whatsapp_qr_connections` já tem `status`, `sync_health`, `recovery_state`, `last_error`, `sync_issue_reason`
- Novo componente `WhatsAppDeviceCard` → **já existe** — `WhatsAppConnectionCard` já mostra badges de estado, alertas de recuperação e botões de reconexão
- Novo hook `useWhatsAppDevices` → **já existe** — `useWhatsAppQRConnection` com polling adaptativo
- Novas edge functions → **já existem e foram corrigidas** — `whatsapp-qr-status`, `whatsapp-evolution-webhook`

## Estado actual (já implementado)

| Requisito do ficheiro | Estado no sistema |
|---|---|
| Mostrar estado real do dispositivo | ✅ `WhatsAppConnectionCard` com 10 estados mapeados |
| Alerta vermelho quando precisa reconexão | ✅ `repair_required` → banner vermelho com `last_error` |
| Botão "Reconectar" | ✅ `useReconnectWhatsAppQR` com feedback toast |
| Auto-poll a cada 30s | ✅ Polling a 5s em estados transitórios |
| Detecção de LOGOUT/NOT_CONNECTION | ✅ `mapEvolutionState` expandida + `fetchInstances` |
| Captura de erros (`disconnectionObject`) | ✅ Guardado em `last_error` |

## Recomendação

**Não implementar.** Seria a terceira tentativa de substituir código funcional por uma arquitectura alternativa com tabela e componentes duplicados.

O sistema está completo. O próximo passo útil é **testar o fluxo em produção** — desconectar o dispositivo no telemóvel e verificar que o FastCRM detecta a mudança e apresenta o alerta correcto.

