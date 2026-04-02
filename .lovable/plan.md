

## Diagnóstico

O problema central é claro: a Evolution API reporta dispositivos como `LOGOUT` / `NOT_CONNECTION` com erros repetidos (`error in sending keep alive`, `Failed to check/upload pre-keys`), mas o FastCRM continua a mostrar "Conectado ✓ Sync Ativo".

**Causa raiz:** A função `mapEvolutionState` no `whatsapp-qr-status` só reconhece 3 estados (`open`, `close`, `connecting`). Tudo o resto é mapeado como genérico `"error"`, sem capturar informação do erro. Além disso, o endpoint `/instance/connectionState/` pode não retornar o estado `LOGOUT` — é necessário também consultar `/instance/fetchInstances` que retorna `connectionStatus: "NOT_CONNECTION"`.

**Decisão arquitectural:** Não é necessário criar uma tabela `whatsapp_devices` separada. A tabela `whatsapp_qr_connections` já tem todos os campos necessários (`status`, `sync_health`, `recovery_state`, `last_error`, `sync_issue_reason`). A UI existente já mostra alertas de recuperação e botão de reconexão. Basta melhorar a detecção no backend.

## Plano

### 1. Melhorar detecção de estado no `whatsapp-qr-status/index.ts`

- Expandir `mapEvolutionState` para reconhecer `LOGOUT`, `NOT_CONNECTION`, `PAIRING`
- Após obter `connectionState`, consultar também `/instance/fetchInstances` para obter `connectionStatus` (que reporta `NOT_CONNECTION` quando o dispositivo está em logout)
- Capturar erros da resposta da API (`instance.error`, `instance.disconnectionObject`) e guardá-los em `last_error`
- Quando `connectionStatus === "NOT_CONNECTION"` ou estado é `LOGOUT`: mapear para `disconnected`, definir `sync_health: "failed"`, `recovery_state: "repair_required"`, e `last_error` com a mensagem do erro

### 2. Melhorar detecção no `whatsapp-evolution-webhook/index.ts`

- No handler de `connection.update`, tratar estados `LOGOUT`, `NOT_CONNECTION` como `disconnected` com `recovery_state: "repair_required"`
- Capturar `body.data.disconnectionObject` ou `body.data.lastDisconnect` e guardar em `last_error`

### 3. Melhorar UI — alerta de reconexão mais visível

- No `WhatsAppConnectionCard.tsx` e `WhatsAppConfigPanel.tsx`: quando `status === "disconnected"` E `recovery_state === "repair_required"`, mostrar alerta vermelho proeminente com o `last_error` e botão "Reconectar Dispositivo"
- Actualmente o alerta de `repair_required` só aparece quando `isConnected` — corrigir para aparecer também quando `disconnected`

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `supabase/functions/whatsapp-qr-status/index.ts` | Expandir `mapEvolutionState`, consultar `fetchInstances` para `connectionStatus`, capturar erros |
| `supabase/functions/whatsapp-evolution-webhook/index.ts` | Tratar LOGOUT/NOT_CONNECTION, capturar `disconnectionObject` |
| `src/components/integrations/WhatsAppConnectionCard.tsx` | Mostrar alerta repair_required quando disconnected |
| `src/components/settings/WhatsAppConfigPanel.tsx` | Idem |

### Critérios de Aceitação

- Dispositivo em LOGOUT na Evolution API → FastCRM mostra "Desconectado" + alerta vermelho "Reconexão necessária" com mensagem de erro
- Botão "Reconectar Dispositivo" visível e funcional
- Detecção em < 30 segundos (via polling) ou instantânea (via webhook)
- Sem alterações de base de dados (usa campos existentes)
- Sem nova tabela `whatsapp_devices` — reutiliza `whatsapp_qr_connections`

