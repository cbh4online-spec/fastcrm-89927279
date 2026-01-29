
# Plano: Corrigir Autenticação Server-to-Server no Auto-Pilot

## Diagnóstico

O Auto-Pilot está a funcionar corretamente até ao momento de gerar a resposta AI:

```
✅ [GHL-MESSAGE] Created new message
✅ [AUTOPILOT] Autopilot is active (configId: "776d7188...")
✅ [AUTOPILOT] Scheduling response { delaySeconds: 11 }
✅ [AUTOPILOT] Generating AI response
❌ [AUTOPILOT] AI response generation failed { status: 401, error: '{"error":"Unauthorized"}' }
```

**Causa**: O `ghl-webhook-message` chama o `ai-inbox-reply` com a **service role key**:
```typescript
Authorization: `Bearer ${supabaseServiceKey}`
```

Mas o `ai-inbox-reply` tenta validar este token como um **JWT de utilizador** usando `supabase.auth.getClaims(token)`, que falha porque a service role key tem uma estrutura diferente.

## Solução

Modificar o `ai-inbox-reply` para aceitar **ambos** os tipos de autenticação:
1. **JWT de utilizador** - Para chamadas do frontend (InboxAI)
2. **Service Role Key** - Para chamadas server-to-server (Auto-Pilot, webhooks)

## Alterações Técnicas

### 1. Atualizar `ai-inbox-reply/index.ts`

Adicionar lógica de dual-authentication no início do handler:

```text
Linha ~443-466: Substituir validação atual por:

1. Extrair token do header Authorization
2. Tentar validar como JWT de utilizador (getClaims)
3. Se falhar, verificar se é service role key (comparar com env var)
4. Se for service role key:
   - Usar cliente com service role para operações
   - Obter workspaceId do body da request
5. Se nenhum funcionar, retornar 401
```

### 2. Manter Segurança

- A service role key só é válida se corresponder exatamente à `SUPABASE_SERVICE_ROLE_KEY`
- Operações continuam a respeitar RLS quando aplicável
- Logging diferencia chamadas de user vs server

## Fluxo Após Correção

```text
[Mensagem Inbound]
       ↓
[ghl-webhook-message]
       ↓
[triggerAutopilotResponse]
       ↓ (com service key)
[ai-inbox-reply] ← Aceita service key
       ↓
[Gera resposta AI]
       ↓
[ghl-send-message]
       ↓
[Resposta enviada ao contacto]
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ai-inbox-reply/index.ts` | Adicionar dual-auth (JWT + service key) |

## Teste de Verificação

Após deploy:
1. Enviar mensagem de teste via Instagram/WhatsApp
2. Verificar logs do `ai-inbox-reply` - deve passar autenticação
3. Verificar logs do `ghl-webhook-message` - resposta gerada
4. Confirmar resposta enviada ao contacto no GHL

