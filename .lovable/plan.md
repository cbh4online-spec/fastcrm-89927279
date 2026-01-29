

# Plano: Corrigir Sincronização de Contactos GHL

## Problema Identificado

A sincronização de contactos do GoHighLevel não está a guardar novos leads na base de dados. O sistema processa 10.000+ contactos mas mostra **0 criados** e todos como "existentes".

### Causas Raiz

1. **Índice Parcial Incompatível**: O índice único `idx_leads_ghl_contact_unique` é um *partial index* (`WHERE ghl_contact_id IS NOT NULL`). O Supabase `upsert` com `onConflict` **não funciona corretamente** com índices parciais - requer uma constraint nomeada.

2. **Fallback Silencioso**: Quando o `onConflict` falha em encontrar a constraint, o upsert trata todos os registos como conflitos e não insere nada (comportamento de `ignoreDuplicates: true`).

3. **Verificação Prévia Insuficiente**: Apesar de haver uma verificação de IDs existentes antes do insert, o problema está no upsert que falha silenciosamente.

---

## Solução Proposta

### Passo 1: Criar Constraint Única Real (Base de Dados)

Converter o índice parcial numa constraint única adequada que o Supabase possa usar:

```sql
-- Remover índice parcial existente
DROP INDEX IF EXISTS idx_leads_ghl_contact_unique;

-- Criar uma constraint única real
ALTER TABLE leads ADD CONSTRAINT leads_ghl_contact_unique 
  UNIQUE (workspace_id, ghl_contact_id);
```

**Nota**: Isso permitirá `ghl_contact_id` NULL (pois NULLs são únicos por defeito em PostgreSQL).

### Passo 2: Simplificar Lógica de Insert (Edge Function)

Modificar `ghl-sync-contacts/index.ts` para usar **insert directo** em vez de upsert, dado que já verificamos existentes:

```typescript
// Em vez de upsert problemático:
if (leadsToInsert.length > 0) {
  const { error: insertError, data: insertedData } = await supabase
    .from("leads")
    .insert(leadsToInsert)
    .select("id");

  if (insertError) {
    // Se houver erro de conflito, é porque já existe - ignorar
    if (insertError.code === '23505') {
      console.log(`[GHL Sync] Some contacts already exist, skipping`);
    } else {
      console.error(`[GHL Sync] Batch insert error:`, insertError);
      result.errors.push(`Batch error: ${insertError.message}`);
    }
  } else {
    result.created += insertedData?.length || 0;
  }
}
```

### Passo 3: Adicionar Logging de Debug

Adicionar logs detalhados para ver exactamente o que está a acontecer:

```typescript
console.log(`[GHL Sync] Page ${pageCount}: ${contacts.length} contacts, ${leadsToInsert.length} new to insert, ${result.skipped} skipped`);
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/migrations/...` | Criar constraint única real |
| `supabase/functions/ghl-sync-contacts/index.ts` | Usar insert directo + logging |

---

## Resultado Esperado

Após implementação:
- Os contactos novos serão inseridos corretamente
- A barra de progresso mostrará contagens reais
- Contactos existentes serão correctamente ignorados
- Logs detalhados para debugging

