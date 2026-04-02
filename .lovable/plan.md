

## Diagnóstico

O ficheiro enviado (`LOVABLE-PROMPT-WHATSAPP-FIX_1.md`) propõe uma **reimplementação completa** com:
- Tabela `integrations` em vez de `whatsapp_qr_connections` (que já existe e funciona)
- Funções novas (`whatsapp-evolution-init`, `whatsapp-webhook`, `whatsapp-evolution-sync`) em vez das existentes (`whatsapp-qr-connect`, `whatsapp-evolution-webhook`, `whatsapp-qr-sync`)
- Hook novo (`useWhatsAppIntegration`) em vez do existente (`useWhatsAppConnection`)

**O sistema actual já está funcional:**
- `whatsapp-qr-connect` — cria instância com webhook configurado ✅
- `whatsapp-evolution-webhook` — recebe eventos da Evolution API ✅
- `whatsapp-evolution-send` — envia mensagens ✅
- `whatsapp-qr-sync` — sincronização manual ✅
- `whatsapp-qr-reconnect` — reconexão com recuperação ✅
- `whatsapp-qr-status` — polling de estado ✅
- Webhook body corrigido (nested `webhook` key) — retorna 201 ✅
- `inferSyncHealth` corrigida — considera `connected_at`/`last_seen_at` ✅

Acabei de re-deployar `whatsapp-qr-status` e `whatsapp-qr-sync` com sucesso.

## Recomendação

**Não implementar o ficheiro enviado.** Seria uma regressão — substituiria código funcional por uma arquitectura diferente que usa tabelas e funções que não existem (`integrations`, `integration_logs`), obrigando a migrações de base de dados e refactoring do frontend.

O único passo pendente é **testar o fluxo completo**:
1. Ir a Settings → Integrations → WhatsApp
2. Clicar "Conectar"
3. Fazer scan do QR code
4. Verificar que o estado muda para "active" (via webhook)

Se houver algum problema específico que persista após estas correcções, posso diagnosticar com base nos logs reais.

