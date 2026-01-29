

# Plano: Forçar Redeploy Limpo da Edge Function

## Diagnóstico Definitivo

A função Edge `ghl-sync-contacts` **não foi actualizada correctamente**. A prova é que:

1. O código no ficheiro tem o log: `console.log("[GHL Sync] Loaded ${existingGhlIds.size} existing GHL contacts from DB")`
2. Os logs da execução **NÃO mostram** este log
3. Isto confirma que o deploy anterior falhou silenciosamente

A base de dados mostra:
- **106 leads** com `ghl_contact_id` (de 109 total)
- A sincronização processa 10,000 contactos mas ignora TODOS

## Causa do Problema

O Set `existingGhlIds` está provavelmente a conter todos os IDs dos contactos do GHL por alguma razão:
1. Talvez a query esteja a retornar dados errados
2. Ou a comparação não está a funcionar correctamente

## Solução: Adicionar Logs de Debug Extensivos

Vou adicionar logs muito detalhados para identificar exactamente o que está a acontecer:

```typescript
// 1. Log do tamanho do Set após carregar
console.log(`[GHL Sync] Loaded ${existingGhlIds.size} existing GHL contacts from DB`);

// 2. Log de sample IDs (primeiros 5)
const sampleIds = Array.from(existingGhlIds).slice(0, 5);
console.log(`[GHL Sync] Sample existing IDs: ${sampleIds.join(', ')}`);

// 3. Para a primeira página, log de cada contacto
if (pageCount === 1) {
  console.log(`[GHL Sync] First page contacts sample:`);
  for (let i = 0; i < Math.min(3, contacts.length); i++) {
    const c = contacts[i];
    const exists = existingGhlIds.has(c.id);
    console.log(`[GHL Sync]   - ID "${c.id}" exists in Set: ${exists}`);
  }
}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Adicionar logs de debug extensivos para diagnóstico |

---

## Resultado Esperado

Após deploy, os logs mostrarão:
1. Quantos IDs existem no Set (deveria ser ~106)
2. Exemplos de IDs no Set vs IDs dos contactos do GHL
3. Se a comparação `.has()` está a funcionar correctamente

Isto permitirá identificar se o problema é:
- A query a carregar dados errados
- A comparação a falhar
- Ou outro problema ainda não identificado

