

# Plano: Forçar Re-deploy e Corrigir Lógica de Sincronização GHL

## Diagnóstico Completo

Após análise detalhada, identifiquei **três problemas** que impedem a sincronização:

### Problema 1: Função Não Foi Deployada
Os logs da Edge Function mostram apenas `[GHL Sync] Fetching page X` mas **não mostram** os novos logs `Page X: Inserting X new leads` que foram adicionados. Isto confirma que a versão deployada ainda é antiga.

### Problema 2: Erro no ghl_sync_log
O PostgreSQL está a rejeitar inserções no `ghl_sync_log` porque a coluna `fastcrm_entity_id` é do tipo **UUID** mas o código tenta inserir uma string `sync_1769687581930`:
```
ERROR: invalid input syntax for type uuid: "sync_1769687581930"
```

### Problema 3: Contagem Errada
Mesmo que os inserts funcionassem, a lógica actual pode não estar a contar correctamente os contactos criados.

---

## Solução

### Passo 1: Corrigir a Inserção no ghl_sync_log

Modificar a função para usar um UUID válido em vez de string:

```typescript
// ANTES (erro):
const syncLogId = `sync_${Date.now()}`;
await supabase.from("ghl_sync_log").insert({
  fastcrm_entity_id: syncLogId, // STRING - ERRO!
});

// DEPOIS (correcto):
// Usar crypto.randomUUID() para gerar UUID válido
const syncLogId = crypto.randomUUID();
await supabase.from("ghl_sync_log").insert({
  fastcrm_entity_id: syncLogId, // UUID válido
});
```

### Passo 2: Adicionar Logging Detalhado

Adicionar logs mais explícitos para debug:

```typescript
console.log(`[GHL Sync] Page ${pageCount}: ${contacts.length} from GHL, ${existingGhlIds.size} existing, ${leadsToInsert.length} to insert`);
```

### Passo 3: Verificar e Tratar Erros de Insert

Garantir que erros são logados correctamente:

```typescript
if (insertError) {
  console.error(`[GHL Sync] Insert error code ${insertError.code}:`, insertError.message);
  // Continuar mesmo com erro para processar próxima página
}
```

### Passo 4: Re-deploy Forçado

Após as alterações, a função precisa ser deployada novamente para que as alterações entrem em vigor.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Corrigir UUID no sync log + adicionar logging detalhado |

---

## Resultado Esperado

Após implementação:
1. A função será deployada com o código correcto
2. Os logs mostrarão exactamente quantos contactos são processados vs. inseridos
3. O `ghl_sync_log` será escrito sem erros
4. Os contactos novos serão criados na tabela `leads`

