

# Plano: Corrigir Sincronização GHL - Diagnóstico e Correção Final

## Problema Identificado

A sincronização processa 10,000 contactos mas mostra **0 criados** e todos **ignorados**. Os logs confirmam que:
- A API do GHL retorna 100 contactos por página correctamente
- Mas o log `Page X: Inserting Y new leads` **nunca aparece**
- Isto significa que `leadsToInsert` está sempre vazio

### Causa Raiz

A verificação `existingGhlIds.has(contact.id)` está a retornar `true` para todos os contactos, mesmo que só existam ~102 leads na base de dados com `ghl_contact_id`.

**Hipótese**: A query `.in("ghl_contact_id", ghlIds)` pode estar a falhar silenciosamente ou a retornar dados incorrectos.

---

## Solução: Adicionar Logging de Diagnóstico

Modificar a Edge Function para mostrar exactamente:
1. Quantos IDs são enviados para a query
2. Quantos registos a query retorna
3. Quantos são adicionados a `leadsToInsert`

```typescript
// Após a query de existentes
console.log(`[GHL Sync] Page ${pageCount}: ${ghlIds.length} GHL IDs, ${existingByGhlId?.length || 0} found in DB`);

// Após o loop
console.log(`[GHL Sync] Page ${pageCount}: ${leadsToInsert.length} to insert, ${result.skipped} skipped so far`);
```

### Verificação Adicional

Adicionar log do primeiro contacto para confirmar que o ID está no formato correcto:

```typescript
if (pageCount === 1 && contacts.length > 0) {
  console.log(`[GHL Sync] Sample contact ID: ${contacts[0].id}`);
  console.log(`[GHL Sync] Sample existing IDs: ${Array.from(existingGhlIds).slice(0,3).join(', ')}`);
}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Adicionar logs de diagnóstico detalhados |

---

## Resultado Esperado

Após deploy:
1. Os logs mostrarão exactamente onde está o problema
2. Poderemos ver se a query está a retornar dados incorrectos
3. Identificar se é problema de comparação ou de query

