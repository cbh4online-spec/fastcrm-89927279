
# Corrigir mensagens do Instagram em falta no Inbox

## Problema identificado

Apos analise dos logs e do codigo, encontrei **3 causas** para as mensagens do Instagram nao aparecerem no FastCRM:

### 1. Bug no mapeamento de canal (tipo 17)
No ficheiro `cron-sync-messages`, o tipo GHL `17` esta mapeado como `"whatsapp"` quando deveria ser `"instagram"`. O mapeamento correto no `ghl-sync-conversations` tem ambos 17 e 18 como instagram.

```text
cron-sync-messages (ERRADO):   "17": "whatsapp", "18": "instagram"
ghl-sync-conversations (CORRETO): 17: "instagram", 18: "instagram"
```

Isto faz com que conversas do Instagram vindas do GHL com tipo 17 sejam classificadas como WhatsApp e nao aparecam no filtro Instagram.

### 2. Cron sync so processa mensagens dos ultimos 30 minutos
O `cron-sync-messages` filtra `recentConversations` apenas com atividade nos ultimos 30 minutos. Nos logs, o workspace mostra "50 total, 0 recent conversations" -- ou seja, ha 50 conversas no GHL mas nenhuma com atividade recente, portanto nenhuma e sincronizada. Mensagens mais antigas ficam para sempre por sincronizar.

### 3. Cron sync ignora conversas sem lead pre-existente
Ao contrario do `ghl-sync-conversations` (que faz auto-create de leads), o `cron-sync-messages` simplesmente faz `if (!leadId) continue;` -- ignora silenciosamente conversas cujo contacto GHL nao tem lead criado.

## Solucao

### Ficheiro 1: `supabase/functions/cron-sync-messages/index.ts`

**a) Corrigir mapeamento do tipo 17:**
```typescript
// ANTES
"17": "whatsapp", "18": "instagram",

// DEPOIS  
"17": "instagram", "18": "instagram",
```

**b) Auto-criar leads para contactos GHL desconhecidos** (igual ao que `ghl-sync-conversations` ja faz):
Adicionar as funcoes `fetchGHLContact` e `createLeadFromGHLContact` e usa-las quando `leadId` nao existe, em vez de fazer `continue`.

**c) Expandir janela de sincronizacao de 30 min para 2 horas:**
Alterar `thirtyMinAgo` para `twoHoursAgo` (120 minutos). Isto aumenta a probabilidade de apanhar mensagens que nao foram sincronizadas a tempo, sem sobrecarregar a API.

### Ficheiro 2: `supabase/functions/ghl-sync-conversations/index.ts`

Nenhuma alteracao necessaria -- o mapeamento aqui ja esta correto.

## Detalhes tecnicos

### Alteracoes em `cron-sync-messages/index.ts`

1. Linha 27: Mudar `"17": "whatsapp"` para `"17": "instagram"`

2. Adicionar helper functions (antes de `syncAllWorkspaces`):
   - `fetchGHLContactBasic(apiKey, contactId)` -- buscar nome/email/phone do GHL
   - `createLeadFromGHLContact(supabase, workspaceId, contactData)` -- criar lead

3. Substituir `if (!leadId) continue;` (linha 208) por logica de auto-create:
```typescript
if (!leadId) {
  const contactData = await fetchGHLContactBasic(apiKey, ghlConv.contactId);
  if (contactData) {
    const newLead = await createLeadFromGHLContact(supabase, workspace_id, contactData);
    if (newLead) {
      leadId = newLead.id;
      leadsByGhlId.set(ghlConv.contactId, leadId);
    }
  }
  if (!leadId) continue;
}
```

4. Linha 146: Expandir janela temporal:
```typescript
// ANTES
const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

// DEPOIS
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
```

## Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/cron-sync-messages/index.ts` | Corrigir tipo 17, auto-create leads, expandir janela temporal |

## Resultado esperado

- Mensagens do Instagram tipo 17 sao corretamente classificadas como "instagram"
- Leads sao auto-criados para contactos GHL desconhecidos (nao sao ignorados)
- Mensagens ate 2 horas atras sao sincronizadas (vs 30 min anteriormente)
- Apos deploy, as proximas mensagens do Instagram no GHL aparecerao no Inbox do FastCRM
- Para sincronizar historico antigo, o utilizador pode usar o botao "Sincronizar Conversas GHL" que ja existe
