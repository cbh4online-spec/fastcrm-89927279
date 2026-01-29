
# Plano: Corrigir Sincronização GHL - Usar Endpoint Correcto

## Diagnóstico

Após análise detalhada da documentação da API do GoHighLevel, identifiquei o problema:

| Endpoint | Scope Necessário | Status |
|----------|------------------|--------|
| `GET /contacts/` | `contacts.readonly` | Deprecado mas funcional |
| `GET /contacts/search?query=X` | Funciona para pesquisa específica | OK (usado em `ghl-send-message`) |
| `GET /contacts/search` (sem query) | Scope adicional não disponível | 401 Error |
| `POST /contacts/search` | `contacts.search` (não disponível) | 401 Error |

A API Key actual tem `contacts.readonly` (porque cria/actualiza contactos), mas NÃO tem o scope `contacts.search` necessário para listar todos.

## Solucao

Alterar a funcao para usar o endpoint `GET /contacts/` (deprecado mas funcional) em vez de `/contacts/search`.

### Parametros do Endpoint GET /contacts/

```text
GET https://services.leadconnectorhq.com/contacts/
Query Parameters:
  - locationId: string (required)
  - limit: number (max 100)
  - startAfterId: string (for pagination)
```

## Alteracao no Codigo

**Ficheiro:** `supabase/functions/ghl-sync-contacts/index.ts`

```text
Linha 131-147 - Antes:
────────────────────────────────────────────────────────
let ghlUrl = `https://services.leadconnectorhq.com/contacts/search?locationId=${...}&limit=100`;
...
const ghlResponse = await fetch(ghlUrl, {
  method: "GET",
  headers: {...},
});

Depois:
────────────────────────────────────────────────────────
// Use deprecated but working /contacts/ endpoint (requires contacts.readonly only)
let ghlUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${...}&limit=100`;
...
const ghlResponse = await fetch(ghlUrl, {
  method: "GET",
  headers: {...},
});
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Mudar endpoint de `/contacts/search` para `/contacts/` |

## Resultado Esperado

- A sincronizacao funcionara com a API Key existente que ja tem `contacts.readonly`
- O endpoint deprecado continua a funcionar (apenas nao e recomendado para novas integracoes)
- Todos os contactos do GHL serao importados para o FastCRM
