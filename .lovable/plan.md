

# Diagnóstico: Persistência e Sincronização WhatsApp QR — Já Implementado

## A. Estado Actual

A camada de persistência e sincronização **já está completamente implementada** e funcional:

### DB — `whatsapp_qr_connections`
- 15 colunas correctas (id, workspace_id, instance_name, provider, status, qr_code, qr_updated_at, phone_number, connected_at, disconnected_at, last_seen_at, last_error, metadata_json, created_at, updated_at)
- `UNIQUE(workspace_id)` — uma conexão por workspace ✓
- `CHECK` constraint com os 10 statuses ✓
- `INDEX` em status ✓
- FK para workspaces com CASCADE ✓
- RLS com 3 políticas (SELECT, INSERT, UPDATE) escopadas por workspace_members ✓
- Dados actuais: `status=connected`, `phone_number=351925990747` ✓

### Edge Functions (6 implementadas)
| Função | Responsabilidade |
|---|---|
| `whatsapp-qr-connect` | Criar/reutilizar instância, gerar QR, persistir estado |
| `whatsapp-qr-status` | Verificar estado na Evolution API, reconciliar DB |
| `whatsapp-qr-sync` | Sincronização forçada Evolution → DB |
| `whatsapp-qr-disconnect` | Logout + delete instância + persistir desconexão |
| `whatsapp-evolution-webhook` | Receber eventos `connection.update` da Evolution API |
| `whatsapp-evolution-send` | Enviar mensagens via Evolution API |

### Lógica de Reconciliação — Implementada
- `mapEvolutionState()` em status, sync e webhook (open→connected, close→disconnected, connecting→waiting_for_scan)
- Phone number extraído via múltiplos paths (ownerJid, instance.owner, wuid, owner, number)
- Sync bidireccional com `whatsapp_connections` para compatibilidade com inbox
- Upsert com `onConflict: "workspace_id"` em todas as funções
- Logging estruturado com `[WHATSAPP_QR]` prefix

---

## B. Lacunas Menores Identificadas

Apenas **2 melhorias incrementais** faltam:

### 1. Coluna `external_instance_id` ausente
O pedido especifica esta coluna mas não existe na tabela. Na prática, o `instance_name` determinístico (`ws_{workspaceId}`) serve como identificador externo. A coluna seria útil apenas se a Evolution API devolvesse um ID interno diferente do nome.

**Recomendação:** Adicionar como coluna nullable para futura referência, sem impacto funcional.

### 2. Index em `instance_name` ausente
O webhook faz `SELECT ... WHERE instance_name = ?`. Sem index, esta query faz full scan (actualmente irrelevante com poucos registos, mas necessário para escala).

**Recomendação:** Adicionar index.

---

## C. Plano de Implementação

### Migration SQL
```sql
-- Add external_instance_id column
ALTER TABLE public.whatsapp_qr_connections
  ADD COLUMN IF NOT EXISTS external_instance_id text;

-- Add index on instance_name for webhook lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_qr_connections_instance_name
  ON public.whatsapp_qr_connections (instance_name);
```

### Edge Functions — Sem alterações necessárias
Todas as responsabilidades listadas no pedido já estão cobertas:
- `ensureWorkspaceWhatsAppInstance` → `whatsapp-qr-connect` (cria ou reutiliza)
- `getWorkspaceWhatsAppStatus` → `whatsapp-qr-status` (verifica + reconcilia)
- `syncWorkspaceWhatsAppStatus` → `whatsapp-qr-sync` (força sync)
- `disconnectWorkspaceWhatsApp` → `whatsapp-qr-disconnect` (logout + delete + persist)
- `mapEvolutionStateToFastCRMState` → `mapEvolutionState()` em 3 funções
- Webhook receiver → `whatsapp-evolution-webhook`

### Opcionalmente: Persistir `external_instance_id` no connect
Após criar a instância na Evolution API, extrair o ID da resposta e guardar na nova coluna. Mínima alteração em `whatsapp-qr-connect`.

---

## D. Critérios de Aceitação

1. ✅ Uma conexão por workspace (UNIQUE constraint)
2. ✅ DB persiste QR, status, phone, timestamps, erros
3. ✅ Estado local sincronizado com Evolution API (polling + webhook)
4. ✅ Lifecycle completo: create → QR → scan → connected → disconnect
5. ⬜ Index em `instance_name` para lookups do webhook (a adicionar)
6. ⬜ Coluna `external_instance_id` (a adicionar, opcional)

