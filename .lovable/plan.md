
# Plano: Corrigir Sincronização GHL - Solução Definitiva

## Diagnóstico Final

Após análise detalhada, identifiquei **3 problemas distintos**:

### Problema 1: Query de Deduplicação Retorna Resultados Incorretos
Os logs mostram consistentemente:
```
Page X: 100 GHL IDs sent, 100 found in DB
```

Isto é **impossível** porque:
- A base de dados tem apenas **107 leads** com `ghl_contact_id`
- Cada página de 100 IDs deveria encontrar no máximo alguns matches, não 100%

**Causa Provável**: O operador `.in()` do Supabase pode estar a ter comportamento inesperado com arrays grandes.

### Problema 2: Check Constraint Violado
O PostgreSQL regista:
```
ERROR: new row for relation "leads" violates check constraint "leads_ai_next_action_type_check"
```

A coluna `ai_next_action_type` só aceita valores específicos:
- `reply_manual`, `send_template`, `create_opportunity`, `activate_automation`, `archive`, `follow_up`

Se o insert tenta usar um valor fora desta lista (ex: string vazia), falha.

### Problema 3: Modo Não-Streaming Desatualizado
O modo não-streaming (linhas 450-456) ainda usa a query antiga sem o filtro `.not("ghl_contact_id", "is", null)`.

---

## Solução em 3 Partes

### Parte 1: Reescrever a Lógica de Deduplicação

Em vez de usar `.in()` para verificar IDs existentes (que pode ter problemas com arrays grandes), vamos:

1. Carregar TODOS os `ghl_contact_id` existentes para o workspace no início (é um número pequeno - ~100)
2. Comparar localmente em JavaScript (muito mais fiável)

```typescript
// Carregar todos os ghl_contact_ids existentes UMA VEZ no início
const { data: existingLeads } = await supabase
  .from("leads")
  .select("ghl_contact_id")
  .eq("workspace_id", workspace_id)
  .not("ghl_contact_id", "is", null);

const existingGhlIds = new Set((existingLeads || []).map(l => l.ghl_contact_id));
console.log(`[GHL Sync] Found ${existingGhlIds.size} existing GHL contacts in DB`);
```

### Parte 2: Corrigir o Objeto de Inserção

Adicionar explicitamente `ai_next_action_type: null` e `ai_temperature: 'cold'` para garantir que não há valores inválidos:

```typescript
leadsToInsert.push({
  workspace_id,
  name: fullName,
  email: contact.email?.toLowerCase() || null,
  phone: contact.phone || null,
  ghl_contact_id: contact.id,
  status: "new",
  source: "ghl",
  tags: contact.tags || [],
  ghl_synced_at: new Date().toISOString(),
  // Garantir valores válidos para check constraints
  ai_next_action_type: null,
  ai_temperature: 'cold',
});
```

### Parte 3: Sincronizar Modo Streaming e Não-Streaming

Aplicar as mesmas correções ao modo não-streaming para consistência.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Reescrever lógica de deduplicação + corrigir valores de insert |

---

## Código Simplificado da Solução

```typescript
// NO INÍCIO DA FUNÇÃO (antes do loop de páginas):
// Carregar TODOS os ghl_contact_ids existentes uma vez
const { data: existingLeads, error: existingError } = await supabase
  .from("leads")
  .select("ghl_contact_id")
  .eq("workspace_id", workspace_id)
  .not("ghl_contact_id", "is", null);

if (existingError) {
  console.error(`[GHL Sync] Error loading existing leads:`, existingError.message);
}

const existingGhlIds = new Set((existingLeads || []).map(l => l.ghl_contact_id));
console.log(`[GHL Sync] Loaded ${existingGhlIds.size} existing GHL contacts from DB`);

// NO LOOP DE PÁGINAS:
// Verificação local simples
for (const contact of contacts) {
  result.total_processed++;

  if (existingGhlIds.has(contact.id)) {
    result.skipped++;
    continue;
  }

  // Adicionar à lista para inserir
  leadsToInsert.push({
    workspace_id,
    name: fullName,
    email: contact.email?.toLowerCase() || null,
    phone: contact.phone || null,
    ghl_contact_id: contact.id,
    status: "new",
    source: "ghl",
    tags: contact.tags || [],
    ghl_synced_at: new Date().toISOString(),
  });

  // Adicionar ao Set para evitar duplicados em páginas futuras
  existingGhlIds.add(contact.id);
}
```

---

## Resultado Esperado

Após implementação:
1. A deduplicação será feita localmente em JavaScript (100% fiável)
2. Os check constraints serão respeitados
3. Novos contactos do GHL serão criados na tabela `leads`
4. Os logs mostrarão exactamente quantos são novos vs existentes
