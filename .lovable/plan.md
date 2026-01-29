
# Plano: Resolver Problema de Deploy da Edge Function GHL

## Diagnóstico Final Confirmado

### Problema Principal: `deno.lock` a Bloquear Deploys

O ficheiro `deno.lock` na raiz do projeto contém:
```json
"redirects": {
  "https://esm.sh/@supabase/supabase-js@2": "https://esm.sh/@supabase/supabase-js@2.93.3"
}
```

Esta configuração pode estar a interferir com o deploy das Edge Functions, causando que o runtime continue a usar versões em cache do código.

**Prova definitiva:**
- Código fonte tem `[GHL Sync v2.1]` (linha 41)
- Logs de execução **NÃO mostram** este marcador
- Os logs `DIAGNOSTIC` também não aparecem

### Problema Secundário: Confirmação de Configuração

A configuração do GHL está correcta:
| Campo | Valor |
|-------|-------|
| Location ID | `GydyXmDssRSxHw7bQ7Cw` |
| API Key | `pit-89fddda9-74ef-4c10-beb5-0de9f7460913` |
| is_active | `true` |
| sync_contacts | `true` |

A API Key tem o prefixo `pit-` que é o formato correcto para Private Integration Tokens do GHL.

---

## Solução em 2 Passos

### Passo 1: Eliminar o ficheiro `deno.lock`

Remover o ficheiro `deno.lock` da raiz do projeto para forçar um rebuild completo de todas as Edge Functions. Isto elimina:
- Redirects desactualizados
- Hashes de cache antigos
- Conflitos de versão

### Passo 2: Forçar Redeploy com Alteração Radical

Para garantir que a função é recompilada, fazer uma alteração visível no import:

```typescript
// Mudar de:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Para (usar npm: prefix que é mais estável):
import { createClient } from "npm:@supabase/supabase-js@2";
```

O prefix `npm:` é o método recomendado pelo Deno e Supabase, e não depende de esm.sh.

---

## Ficheiros a Modificar/Eliminar

| Ficheiro | Acção |
|----------|-------|
| `deno.lock` | **ELIMINAR** (raiz do projeto) |
| `supabase/functions/ghl-sync-contacts/index.ts` | Mudar import para `npm:@supabase/supabase-js@2` |

---

## Código da Alteração

```typescript
// Linha 1-2 do ficheiro
// DE:
// Version 2.1 - Cache bust with pinned version
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// PARA:
// Version 3.0 - Using npm: specifier for reliable deployment
import { createClient } from "npm:@supabase/supabase-js@2";
```

---

## Resultado Esperado

Após estas alterações:

1. **Deploy efectivo** - Sem `deno.lock`, o runtime é forçado a reconstruir
2. **Logs v3.0** - Veremos `[GHL Sync v3.0]` nos logs confirmando a nova versão
3. **Diagnóstico visível** - Os logs `DIAGNOSTIC` aparecerão mostrando:
   - Quantos leads existem na DB (~106)
   - IDs de exemplo
   - Comparações detalhadas

4. **Importação correcta** - Se os 106 leads no DB não corresponderem aos 10,000 do GHL, teremos novos leads criados

---

## Secção Técnica

### Por que o `npm:` prefix é melhor?

1. **Estabilidade** - O Deno resolve directamente do npm registry
2. **Sem intermediário** - Não depende do esm.sh que pode ter cache/redirects
3. **Recomendado** - É a abordagem oficial para Edge Functions

### Por que eliminar `deno.lock`?

O lockfile do Deno fixa versões e hashes. Quando há conflitos:
- O runtime pode reutilizar código antigo
- Imports novos podem ser ignorados
- Deploys parecem bem-sucedidos mas usam código antigo

### Formato do API Key

O prefixo `pit-` indica Private Integration Token, que é o tipo correcto para:
- Acesso à Location específica
- Scope `contacts.readonly`
- Chamadas à API v2 do GHL
