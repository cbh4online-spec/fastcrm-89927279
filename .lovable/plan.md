

## Diagnóstico

O ficheiro `claude-code-prompt-whatsapp-edge-functions.md` propõe **exactamente a mesma reimplementação** já rejeitada anteriormente:
- Nova tabela `whatsapp_devices` (desnecessária — `whatsapp_qr_connections` já tem todos os campos)
- Novas edge functions com nomes diferentes (desnecessárias — as existentes já funcionam)

**Estado actual do sistema (já implementado):**

| Funcionalidade | Estado |
|---|---|
| `mapEvolutionState` expandida (LOGOUT, NOT_CONNECTION, PAIRING) | ✅ Implementado |
| `isLogoutState()` para detecção de logout | ✅ Implementado |
| Consulta a `/instance/fetchInstances` para `connectionStatus` | ✅ Implementado |
| Captura de `disconnectionObject` em `last_error` | ✅ Implementado |
| Webhook trata LOGOUT → `recovery_state: repair_required` | ✅ Implementado |
| `inferSyncHealth` corrigida (freshest activity, 24h threshold) | ✅ Implementado |
| UI com alerta vermelho para `repair_required` | ✅ Implementado |

## Recomendação

**Não implementar.** Todas as correcções descritas no ficheiro já estão activas no código. Criar uma tabela `whatsapp_devices` separada seria duplicação de dados e obrigaria a refactoring extenso do frontend e hooks existentes sem benefício funcional.

O próximo passo útil seria **testar o fluxo completo** para validar que tudo funciona em produção:
1. Desconectar o dispositivo WhatsApp (remover sessão no telemóvel)
2. Verificar que o FastCRM detecta o LOGOUT em < 30s
3. Confirmar que o alerta vermelho aparece com botão "Reconectar"
4. Reconectar e verificar transição para "Conectado / Sync Ativo"

