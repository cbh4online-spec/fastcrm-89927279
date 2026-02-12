

## Corrigir Sincronizacao de Mensagens Instagram do GHL

### Problemas Identificados

Nos logs da edge function `ghl-sync-conversations` encontrei dois erros que impedem o download de mensagens Instagram:

**Erro 1: "messages is not iterable"**
A API do GHL para obter mensagens de uma conversa (`/conversations/{id}/messages`) retorna um formato que o codigo nao esta a tratar corretamente. O codigo assume `msgData.messages` como array, mas a API pode devolver a estrutura noutro formato (ex: objecto com propriedade `messages` que por sua vez contem outro objecto, ou a resposta pode vir paginada com `lastMessageId`). Quando isto acontece, o `for...of` crashar com "not iterable" e todas as mensagens dessa conversa sao perdidas.

**Erro 2: "No lead found for contact"**
Conversas cujo contacto GHL nao tem lead correspondente no FastCRM sao completamente ignoradas. Isto significa que se um contacto Instagram escreveu no GHL mas ainda nao foi sincronizado como lead, todas as suas mensagens sao descartadas.

### Solucao

**1. Corrigir parsing da resposta de mensagens**

Na edge function `ghl-sync-conversations`, adicionar logging do formato real da resposta e tratar multiplos formatos possiveis:
- `msgData.messages` (array direto)
- `msgData.messages.messages` (nested)
- `msgData.data` (formato alternativo)
- Adicionar `Array.isArray()` check antes do loop
- Log do formato recebido para debug futuro

**2. Criar lead automaticamente quando nao existe**

Quando um contacto GHL nao tem lead correspondente:
- Buscar dados do contacto na API do GHL (`/contacts/{contactId}`)
- Criar lead automatico com os dados basicos (nome, email, telefone, ghl_contact_id)
- Continuar com a sincronizacao da conversa e mensagens

Isto garante que todas as conversas Instagram (e de outros canais) sao sincronizadas, mesmo que os contactos ainda nao tenham sido importados.

**3. Melhorar tratamento de erros**

- Envolver o fetch de mensagens num try/catch mais robusto que nao interrompa o loop
- Adicionar log do body da resposta quando o formato nao e reconhecido
- Continuar para a proxima conversa em vez de crashar

### Detalhes Tecnicos

**Ficheiro a modificar:** `supabase/functions/ghl-sync-conversations/index.ts`

Alteracoes no bloco de fetch de mensagens (linhas 408-468):

```text
// Antes (crashava):
const messages: GHLMessage[] = msgData.messages || [];
for (const msg of messages) { ... }

// Depois (robusto):
const rawMessages = msgData.messages || msgData.data || [];
const messages: GHLMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
console.log("[GHL Sync] Messages response keys:", Object.keys(msgData), "count:", messages.length);
```

Alteracoes no bloco de lead lookup (linhas 338-346):

```text
// Antes (skip total):
const leadId = leadsByGhlId.get(ghlConv.contactId);
if (!leadId) { continue; }

// Depois (auto-criar lead):
let leadId = leadsByGhlId.get(ghlConv.contactId);
if (!leadId) {
  // Fetch contact from GHL API and create lead
  const contactData = await fetchGHLContact(apiKey, ghlConv.contactId);
  const newLead = await createLeadFromGHLContact(supabase, workspace_id, contactData);
  if (newLead) {
    leadId = newLead.id;
    leadsByGhlId.set(ghlConv.contactId, leadId);
  } else {
    continue; // Only skip if creation truly fails
  }
}
```

Nova funcao helper `fetchGHLContact`:
- GET `https://services.leadconnectorhq.com/contacts/{contactId}`
- Headers: Authorization Bearer, Version 2021-04-15
- Retorna nome, email, telefone

Nova funcao helper `createLeadFromGHLContact`:
- Insere na tabela `leads` com dados do contacto
- Define `ghl_contact_id` para futuras sincronizacoes
- Retorna o lead criado

### Resultado Esperado

Apos estas correcoes:
- Mensagens Instagram (e de todos os outros canais) serao descarregadas mesmo que o contacto ainda nao exista como lead
- O erro "messages is not iterable" sera eliminado com o check `Array.isArray()`
- Leads serao criados automaticamente durante a sincronizacao, garantindo que nenhuma conversa e perdida

