

# Plano: WhatsApp QR Integration — Diagnóstico e Correcção Completa

## A. Diagnóstico (Root Cause)

**Estado actual da DB:** `status = waiting_for_scan`, `phone_number = null`, `connected_at` stale de sessão anterior.

**Problema principal:** A Evolution API reporta estado `connecting` (mapeado para `waiting_for_scan`), o que significa que a instância existe mas não tem sessão WhatsApp activa. O QR foi gerado anteriormente mas nunca foi lido, ou a sessão expirou.

**Problemas identificados no código:**

1. **UI incompleta** — `WhatsAppConnectionCard` só renderiza badges para `connected`, `disconnected` e `error`. Estados como `waiting_for_scan`, `qr_pending`, `reconnecting`, `creating_instance` caem no bloco "não configurado" e mostram o botão "Conectar via QR", dando a impressão de desconexão.

2. **Sem polling automático no card** — O hook `useWhatsAppQRConnection` faz `refetchInterval: false`. Quando o estado muda na Evolution API (ex: scan → connected), a UI não actualiza sem refresh manual.

3. **Status `authenticating` ausente** — O CHECK constraint na DB não inclui `authenticating`. Necessário adicionar.

4. **Sem botão Disconnect/Reconnect** no card quando conectado.

5. **`whatsapp-evolution-send` usa `corsHeaders` importados do SDK** — Contradiz o padrão do projecto (definição manual). Pode causar erro de bundling.

6. **`whatsapp-evolution-send` usa `getClaims`** — Método não standard; deve usar `getUser()`.

---

## B. Ficheiros a Criar/Alterar

| Ficheiro | Acção | Descrição |
|---|---|---|
| `src/components/integrations/WhatsAppConnectionCard.tsx` | EDITAR | Renderizar todos os estados, adicionar Disconnect/Reconnect, mostrar last_seen, last_error |
| `src/hooks/useWhatsAppQRConnection.ts` | EDITAR | Adicionar polling automático em estados transitórios, adicionar `authenticating` ao tipo |
| `supabase/functions/whatsapp-evolution-send/index.ts` | EDITAR | Corrigir CORS para padrão manual, usar `getUser()` em vez de `getClaims` |
| DB migration | CRIAR | Adicionar `authenticating` ao CHECK constraint |

---

## C. Database Migration

```sql
ALTER TABLE public.whatsapp_qr_connections
  DROP CONSTRAINT whatsapp_qr_connections_status_check;

ALTER TABLE public.whatsapp_qr_connections
  ADD CONSTRAINT whatsapp_qr_connections_status_check CHECK (
    status IN ('not_configured','creating_instance','qr_pending','waiting_for_scan','authenticating','connected','disconnected','qr_expired','reconnecting','error')
  );
```

---

## D. Hook: `useWhatsAppQRConnection.ts`

Alterações:
- Adicionar `authenticating` ao tipo `WhatsAppQRStatus`
- Activar `refetchInterval` dinâmico: 5s para estados transitórios (`qr_pending`, `waiting_for_scan`, `creating_instance`, `authenticating`, `reconnecting`), false para estados finais
- Isto garante que a UI actualiza automaticamente quando o utilizador lê o QR

---

## E. Card: `WhatsAppConnectionCard.tsx`

Refactor completo para renderizar todos os estados:

- **`not_configured`** — Botão "Conectar via QR Code" + Sync
- **`creating_instance`** — Spinner + "A criar instância..."
- **`qr_pending` / `waiting_for_scan`** — Badge amarelo "A aguardar scan" + Botão "Abrir QR Code" + Sync
- **`authenticating`** — Badge azul "A autenticar..." + Spinner
- **`connected`** — Badge verde "Conectado" + Info (número, data, last_seen) + Botões Disconnect + Sync
- **`disconnected`** — Badge cinza + Botão "Reconectar" + "Conectar via QR"
- **`qr_expired`** — Badge laranja + Botão "Gerar novo QR"
- **`reconnecting`** — Badge azul + Spinner
- **`error`** — Badge vermelho + mensagem de erro + Botão retry

Acções sempre visíveis: Sync (refresh), Disconnect (quando connected).

---

## F. Edge Function: `whatsapp-evolution-send`

- Substituir import `corsHeaders` do SDK por definição manual (padrão do projecto)
- Substituir `getClaims` por `getUser()` para validação de JWT
- Manter toda a lógica de envio e validação

---

## G. Critérios de Aceitação

1. Card mostra estado correcto para todos os 10 statuses
2. Polling automático actualiza UI quando estado muda (ex: scan → connected)
3. Botão Disconnect disponível quando conectado
4. Botão Sync disponível em todos os estados
5. Mensagens de erro visíveis quando relevantes
6. `whatsapp-evolution-send` funciona sem erros de bundling
7. Sem regressão nos fluxos existentes (QR dialog, inbox compose)

---

## H. Observabilidade

Os logs estruturados já existem em todas as edge functions (`[WHATSAPP_QR]` prefix com workspace_id, instance_name, status). Não é necessário adicionar mais — a cobertura é adequada.

---

## I. Notas Railway

- Secrets `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` já estão configurados ✓
- Todas as edge functions já sanitizam o URL da Evolution API ✓
- Instance name determinístico (`ws_{workspaceId}`) já implementado ✓
- Sem dependência de filesystem local ✓

