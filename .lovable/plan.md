## Diagnóstico (provado)

A tua arquitetura está correta: **uma única ligação GHL** que recolhe todos os canais, e cada workspace **ativa apenas o seu canal**.

A BD confirma isto — não há canais duplicados entre workspaces. Cada `ghl_account_id` pertence a 1 workspace:

```text
Instagram ensiformacao         → PHARLISS    (active)
Instagram metodopare.ai        → METODOPARE  (active)
Instagram fastcrm              → METODOPARE  (active)
Instagram blecksen_management  → Blecksen    (active)
Facebook  ENSI                 → PHARLISS    (active)
Facebook  Jorge Cardoso        → METODOPARE  (active)
Facebook  Blecksen             → Blecksen    (active)
WhatsApp  +351925990747        → METODOPARE  (active)
```

**Problema real** (em `ghl-webhook-message/index.ts` linhas 259–298):

A função identifica o **canal_type** da mensagem (ex: "instagram"), procura workspaces com esse **tipo de canal** ativo, e:
- Se encontrar 1 → OK
- Se encontrar **vários** → escolhe o "primary" ou o primeiro (linha 285-291)
- Se não encontrar → fallback para "primary" ou primeiro config (linha 295-298)

Como tens **3 workspaces com Instagram ativo** (PHARLISS, METODOPARE, Blecksen) que partilham o mesmo `ghl_location_id`, qualquer DM de Instagram que chegue pelo Pharliss cai no ramo "vários owners" e é roteada para o **primary** (METODOPARE) — daí responder com a persona "Conceição".

**A função nunca usa o `ghl_account_id` da mensagem recebida**, que é o único campo que identifica univocamente o canal/workspace correto. Esse é o bug.

## O que fazer

### 1. Resolver workspace pelo `ghl_account_id` da mensagem (fix central)

No webhook, extrair o `account_id` (Instagram page ID, Facebook page ID, WhatsApp number) do payload GHL e procurar **diretamente** em `workspace_ghl_social_channels`:

```text
account_id da mensagem  →  workspace_ghl_social_channels (is_active=true)  →  workspace_id
```

Lookup determinístico, 1 resultado. Sem fallbacks, sem "primary".

### 2. Fail-closed quando não houver match

Se `account_id` não mapear para nenhum workspace ativo → **rejeitar a mensagem** com log de erro `UNROUTABLE_MESSAGE` em vez de cair em fallback silencioso. Resposta 200 OK com `{ outcome: "unrouted" }` para o GHL não fazer retry infinito.

### 3. Manter compatibilidade para canais sem account_id

SMS/email/voz que não têm `account_id` social mantêm a lógica atual (single config ou primary), mas marcados explicitamente como "non-social fallback" nos logs.

### 4. Guard-rail na BD

Adicionar `UNIQUE(ghl_account_id, channel_type) WHERE is_active=true` em `workspace_ghl_social_channels` — impede que dois workspaces ativem o mesmo canal por engano no futuro.

### 5. Validação Nível 2 (testes obrigatórios após fix)

| Teste | Como | Esperado |
|---|---|---|
| A. Webhook IG Pharliss | curl edge function com `account_id=17841462675469795` | workspace=PHARLISS, persona ≠ Conceição |
| B. Webhook IG METODOPARE | curl com `account_id=17841465250555520` | workspace=METODOPARE, persona=Conceição |
| C. Webhook IG Blecksen | curl com `account_id=17841444347607539` | workspace=Blecksen |
| D. account_id desconhecido | curl com `account_id=fake` | outcome=unrouted, sem mensagem criada |
| E. Logs `ai_usage_logs` | query filtrada pelos testes | `workspace_id` correto em cada linha |

### 6. Hardening preventivo

- Log estruturado: `[GHL-ROUTE] account_id=X → workspace=Y` em cada mensagem
- Métrica em `system_health_diagnostics`: contador de `unrouted_messages` por hora
- Alerta se > 5 mensagens/hora ficarem unrouted

## Detalhes técnicos

**Ficheiro principal:** `supabase/functions/ghl-webhook-message/index.ts` (lógica linhas 259–298)

**Outros pontos a auditar (mesmo padrão de bug pode existir):**
- `supabase/functions/ai-inbox-reply/index.ts` — confirmar que usa o `workspace_id` da mensagem, não re-resolve
- `supabase/functions/_shared/whatsapp-autopilot.ts` — verificar resolução de workspace para WhatsApp
- `src/lib/persona.ts` — `resolvePersonaForContext` recebe `workspaceId` como parâmetro, ok desde que o caller passe o correto

**Payload GHL — onde está o account_id:**
- Instagram/Facebook DM: `body.message.meta.facebookPageId` ou `body.conversationProviderId`
- WhatsApp via GHL: `body.message.meta.phone` ou similar
- Vou inspecionar payloads reais nos logs das últimas 24h para confirmar o caminho exato antes de codificar

**Migração SQL:**
```sql
CREATE UNIQUE INDEX idx_ghl_social_active_unique
ON workspace_ghl_social_channels (ghl_account_id, channel_type)
WHERE is_active = true;
```

## Critérios de aceitação

- [ ] Mensagem de IG do Pharliss responde com persona/contexto Pharliss
- [ ] Mensagem de IG do METODOPARE continua a responder com Conceição
- [ ] Logs mostram `account_id → workspace` determinístico
- [ ] Testes A–E passam todos
- [ ] Constraint UNIQUE ativa
- [ ] Memória `mem://integrations/gohighlevel/multi-workspace-isolation` atualizada com a regra "account_id é a chave de routing, nunca primary"

## Riscos

- **Payloads GHL inconsistentes**: o campo onde o `account_id` aparece pode variar por tipo de canal. Vou ler logs reais antes de fixar o caminho.
- **Mensagens em backlog**: mensagens já mal-roteadas em conversas existentes não são re-classificadas — o fix só protege novas mensagens.
- **Canais inativos**: se o utilizador desativar um canal, mensagens desse canal passam a `unrouted`. Comportamento correto, mas precisa de visibilidade no UI.

Aprovas para avançar para implementação?