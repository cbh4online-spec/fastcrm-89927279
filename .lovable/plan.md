

# Auditoria e Refactor da Integração WhatsApp QR — FastCRM

## A. Resumo da Auditoria

### Fluxo Atual
1. **UI**: `WhatsAppConfigPanel.tsx` → botão "Conectar via QR" → abre `WhatsAppQRDialog.tsx`
2. **QR Dialog**: invoca edge function `whatsapp-qr-connect` (cria instância + obtém QR)
3. **Polling**: a cada 5s invoca `whatsapp-qr-status` (verifica `connectionState` na Evolution API)
4. **Persistência**: `whatsapp-qr-status` faz upsert em `whatsapp_connections` quando `state === "open"`
5. **Leitura UI**: `useWhatsAppConnection` lê `whatsapp_connections` para mostrar estado

### Componentes Encontrados
| Camada | Ficheiro | Papel |
|--------|---------|-------|
| UI Card | `WhatsAppConnectionCard.tsx` | Card em Channels Settings (usa fluxo Meta OAuth — **desatualizado**) |
| UI Panel | `WhatsAppConfigPanel.tsx` | Painel em Settings com botão QR + Meta |
| UI Dialog | `WhatsAppQRDialog.tsx` | Modal QR com polling |
| Hook | `useWhatsAppConnection.ts` | Lê `whatsapp_connections` via workspace client |
| Edge Fn | `whatsapp-qr-connect/index.ts` | Cria instância + obtém QR |
| Edge Fn | `whatsapp-qr-status/index.ts` | Verifica estado + upsert DB |
| Edge Fn | `whatsapp-webhook/index.ts` | Webhook Meta Cloud API (**irrelevante para QR**) |
| DB | `whatsapp_connections` | Tabela com constraint UNIQUE(workspace_id) |

### Secrets Configurados
- `EVOLUTION_API_URL` ✅
- `EVOLUTION_API_KEY` ✅
- `APP_URL` ✅ (para webhooks)

---

## B. Root Causes e Problemas

### Confirmados
1. **Bug no `whatsapp-qr-status`**: URL não sanitizado — usa `EVOLUTION_API_URL.replace(/\/$/, "")` em vez de `new URL().origin`, podendo causar duplicação de path (já corrigido no `whatsapp-qr-connect`)
2. **Tabela incompleta**: `whatsapp_connections` não tem campos para estado granular (`status`), `qr_code`, `qr_updated_at`, `last_error`, `last_seen_at`, `connected_at`, `disconnected_at`
3. **UI mostra "Desconectado" falso**: `useWhatsAppConnection` só verifica `is_active` boolean — sem estados intermédios
4. **Sem webhook da Evolution API**: não existe endpoint para receber eventos push (connection.update, qrcode.updated, etc.) — depende apenas de polling

### Prováveis
5. **Race condition na criação de instância**: se o utilizador clica "Conectar via QR" duas vezes, pode criar instâncias duplicadas
6. **QR expira sem feedback real**: o countdown de 60s é arbitrário, não reflete o tempo real do QR da Evolution API
7. **Disconnect não remove instância**: `useDisconnectWhatsApp` só faz `update({ is_active: false })` — não chama `instance/logout` ou `instance/delete` na Evolution API

### Fraquezas Arquitecturais
8. **WhatsAppConnectionCard.tsx** ainda mostra fluxo Meta OAuth — confuso para o utilizador
9. **Sem reconciliação**: se a Evolution API já tem uma instância conectada, o FastCRM não sabe
10. **Sem health check**: não há verificação de conectividade à Evolution API
11. **Sem logging estruturado** dos eventos de lifecycle

---

## C. Arquitectura Proposta

```text
┌─────────────────────────────────────────────────────────┐
│                    FastCRM Frontend                       │
│                                                           │
│  WhatsAppConfigPanel ──► WhatsAppQRDialog                │
│        │                      │                           │
│  useWhatsAppQRConnection     poll cada 4s                │
│  (lê whatsapp_qr_connections)                            │
└────────┬──────────────────────┬──────────────────────────┘
         │                      │
    ┌────▼──────┐         ┌─────▼─────────┐
    │ EF: start │         │ EF: status    │
    │ (create + │         │ (poll state + │
    │  get QR)  │         │  upsert DB)   │
    └────┬──────┘         └─────┬─────────┘
         │                      │
    ┌────▼──────────────────────▼─────────┐
    │         Evolution API (Railway)      │
    │  /instance/create                    │
    │  /instance/connect/{name}            │
    │  /instance/connectionState/{name}    │
    │  /instance/logout/{name}             │
    │  /instance/delete/{name}             │
    └──────────────┬──────────────────────┘
                   │ webhook (futuro)
    ┌──────────────▼──────────────────────┐
    │  EF: evolution-webhook              │
    │  (recebe events, upsert DB)         │
    └─────────────────────────────────────┘
```

### Estados de Conexão
```text
not_configured → creating_instance → qr_pending → waiting_for_scan
→ connected | qr_expired | error
connected → disconnecting → disconnected
disconnected → reconnecting → qr_pending | connected
```

---

## D. Plano de Implementação

### Fase 1: Schema DB (migração)

Criar nova tabela `whatsapp_qr_connections` com campos completos:
- `id`, `workspace_id` (UNIQUE), `instance_name`, `status` (text, default 'not_configured')
- `qr_code` (text), `qr_updated_at`, `phone_number`, `provider` (default 'evolution_qr')
- `connected_at`, `disconnected_at`, `last_seen_at`, `last_error`, `metadata_json` (jsonb)
- `created_at`, `updated_at`
- RLS: escopar por workspace_id via workspace_members
- Trigger: `update_updated_at_column`

### Fase 2: Edge Functions (4 funções)

**2.1 — Refactor `whatsapp-qr-connect`**
- Sanitizar URL com `new URL().origin` (já feito)
- Upsert `whatsapp_qr_connections` com status `creating_instance` → `qr_pending`
- Guardar QR code na DB
- Retornar QR + instanceName + status

**2.2 — Refactor `whatsapp-qr-status`**
- Corrigir sanitização do URL (usar `new URL().origin`)
- Ler estado da Evolution API (`connectionState`)
- Mapear estados: `open` → `connected`, `close` → `disconnected`, `connecting` → `waiting_for_scan`
- Upsert `whatsapp_qr_connections` com estado real, phone number, last_seen_at
- Se `connected`, também upsert `whatsapp_connections` (compatibilidade com inbox existente)
- Retornar estado mapeado ao frontend

**2.3 — Nova `whatsapp-qr-disconnect`**
- Chamar `instance/logout/{name}` na Evolution API
- Actualizar `whatsapp_qr_connections` status → `disconnected`, `disconnected_at`
- Actualizar `whatsapp_connections` is_active → false
- Opcionalmente chamar `instance/delete/{name}`

**2.4 — Nova `whatsapp-qr-sync`**
- Endpoint de reconciliação manual
- Consulta `fetchInstances` na Evolution API
- Compara com estado local
- Actualiza DB conforme estado real

### Fase 3: Frontend

**3.1 — Novo hook `useWhatsAppQRConnection`**
- Query `whatsapp_qr_connections` por workspace_id
- Retorna estado granular (status, qr_code, phone_number, last_seen_at, etc.)

**3.2 — Refactor `WhatsAppConfigPanel.tsx`**
- Remover botão "Conectar via Meta" (não queremos Cloud API)
- Mostrar estados granulares: labels + ícones para cada estado
- Mostrar phone_number quando conectado
- Mostrar `last_seen_at` / `updated_at`
- Botão "Reconectar" quando disconnected
- Botão "Sincronizar" para forçar reconciliação
- Mensagens de erro claras

**3.3 — Refactor `WhatsAppQRDialog.tsx`**
- Usar estados do backend em vez de estados locais arbitrários
- Polling chama `whatsapp-qr-status` que retorna estado mapeado
- Tratar `qr_expired` → auto-refresh ou botão manual
- Tratar `connected` → fechar dialog, invalidar queries

**3.4 — Refactor `WhatsAppConnectionCard.tsx`**
- Usar `useWhatsAppQRConnection` em vez de `useWhatsAppConnection`
- Remover referências a Meta OAuth
- Mostrar estado real da conexão QR

### Fase 4: Observabilidade

- Logs estruturados em todas as edge functions: `[WHATSAPP_QR] EVENT action=create_instance workspace=X status=Y`
- Registar em `activity_logs` as transições de estado críticas (connected, disconnected, error)

### Fase 5: Webhook Evolution (opcional, fase seguinte)

- Criar edge function `evolution-webhook` para receber push events
- Configurar webhook URL na criação da instância: `${SUPABASE_URL}/functions/v1/evolution-webhook`
- Processar eventos: `connection.update`, `qrcode.updated`, `messages.upsert`

---

## E. Ficheiros a Criar/Editar

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | CRIAR — nova tabela `whatsapp_qr_connections` |
| `supabase/functions/whatsapp-qr-connect/index.ts` | EDITAR — upsert na nova tabela |
| `supabase/functions/whatsapp-qr-status/index.ts` | EDITAR — corrigir URL, estados granulares |
| `supabase/functions/whatsapp-qr-disconnect/index.ts` | CRIAR — logout + delete na Evolution |
| `supabase/functions/whatsapp-qr-sync/index.ts` | CRIAR — reconciliação |
| `src/hooks/useWhatsAppQRConnection.ts` | CRIAR — hook para nova tabela |
| `src/components/settings/WhatsAppQRDialog.tsx` | EDITAR — estados do backend |
| `src/components/settings/WhatsAppConfigPanel.tsx` | EDITAR — remover Meta, estados granulares |
| `src/components/integrations/WhatsAppConnectionCard.tsx` | EDITAR — usar QR connection |

---

## F. Critérios de Aceitação

1. Clicar "Conectar via QR" cria/reutiliza instância determinística por workspace
2. QR é gerado e mostrado correctamente
3. Após scan, UI transita para "Conectado" com número de telefone
4. Conexão persiste após refresh da página
5. "Desconectar" chama logout na Evolution API e actualiza DB
6. UI nunca mostra "Desconectado" falso quando Evolution está conectada
7. Erros são visíveis e diagnosticáveis
8. Logs suficientes para debug em produção

## G. QA Checklist

- [ ] Fluxo completo: QR → scan → conectado
- [ ] Refresh da página mantém estado "Conectado"
- [ ] Desconectar → reconectar funciona
- [ ] QR expirado → regenerar funciona
- [ ] Erros de Evolution API mostram mensagem clara
- [ ] Sem erros de consola
- [ ] Mobile responsivo
- [ ] RLS: utilizador só vê conexão do seu workspace

