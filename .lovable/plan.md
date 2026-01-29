

# Plano: Forçar Redeploy Efectivo com Alteração de Importação

## Problema Identificado

**Os deploys não estão a ser aplicados.** A prova definitiva:

| Evidência | Detalhe |
|-----------|---------|
| Código tem logs de diagnóstico | Linhas 132-140: `[GHL Sync] ========== DIAGNOSTIC START ==========` |
| Logs de execução NÃO mostram | Nenhum log `DIAGNOSTIC` aparece nas execuções |
| Base de dados | 109 leads totais, 106 com `ghl_contact_id` |
| Sync ignora | 10,000 contactos ignorados (todos) |

## Causa Provável

O Supabase Edge Functions usa cache agressivo. Quando a importação `https://esm.sh/@supabase/supabase-js@2` não muda, o runtime pode reutilizar uma versão antiga da função.

## Solução: Forçar Cache Bust

### Alteração 1: Mudar versão do import para forçar rebuild

```typescript
// DE:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PARA (versão específica força rebuild):
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
```

### Alteração 2: Adicionar log ÚNICO no início

```typescript
// Logo após Deno.serve começar:
console.log(`[GHL Sync v2.1] Function started at ${new Date().toISOString()}`);
```

Este log único (`v2.1`) confirmará se a nova versão está a correr.

### Alteração 3: Simplificar lógica de skip (remover ambiguidade)

Em vez de apenas verificar `existingGhlIds.has(contact.id)`, vamos:
1. Contar quantos deveriam ser importados
2. Log explícito de por que cada contacto é skipado ou inserido

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | 1. Mudar import para versão específica<br>2. Adicionar log de versão<br>3. Melhorar logs de decisão |

---

## Verificação de Sucesso

Após deploy, os logs devem mostrar:

```
[GHL Sync v2.1] Function started at 2026-01-29T...
[GHL Sync] ========== DIAGNOSTIC START ==========
[GHL Sync] existingLeadsData count: 106
[GHL Sync] existingGhlIds Set size: 106
[GHL Sync] Sample DB ghl_contact_ids: 4005GnTglTCkuK4xQTAY, ...
[GHL Sync] ========== DIAGNOSTIC END ==========
```

Se o Set size for 106 (correto) e mesmo assim ignorar tudo, então saberemos que o problema é a comparação de IDs (possível diferença de case ou formato).

---

## Resultado Esperado

1. **Deploy efectivo confirmado** pelo log `v2.1`
2. **Diagnóstico real** do tamanho do Set e IDs
3. **Identificação precisa** do motivo dos skips

