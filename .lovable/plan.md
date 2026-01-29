

# Plano: Corrigir Sincronização de Contactos GHL

## Problema Identificado

O erro `401 - "The token is not authorized for this scope"` ocorre porque o endpoint `POST /contacts/search` requer um scope adicional (`contacts.search`) que a API Key atual não possui.

No entanto, a função `ghl-send-message` já usa com sucesso o endpoint `GET /contacts/search` com query params - **que funciona com a mesma API Key**.

### Comparação dos Endpoints

| Método | Endpoint | Scope Necessário | Status |
|--------|----------|------------------|--------|
| `GET` | `/contacts/search?locationId=X&query=Y` | Funciona com API Key actual | ✓ |
| `POST` | `/contacts/search` (body JSON) | Requer `contacts.search` scope | ✗ |

---

## Solução

Alterar a função `ghl-sync-contacts` para usar **GET com query params** em vez de POST com body, mantendo compatibilidade com a API Key existente.

### Alterações no Código

**Ficheiro:** `supabase/functions/ghl-sync-contacts/index.ts`

```text
Antes (linhas 131-157):
────────────────────────────────────────
const ghlUrl = `https://services.leadconnectorhq.com/contacts/search`;

const searchPayload: Record<string, unknown> = {
  locationId: locationId,
  limit: 100,
  query: "",
};

const ghlResponse = await fetch(ghlUrl, {
  method: "POST",
  headers: {...},
  body: JSON.stringify(searchPayload),
});

Depois:
────────────────────────────────────────
// Construir URL com query params (método GET funciona com API Key standard)
let ghlUrl = `https://services.leadconnectorhq.com/contacts/search?locationId=${locationId}&limit=100`;

if (startAfterId) {
  ghlUrl += `&startAfterId=${startAfterId}`;
}

const ghlResponse = await fetch(ghlUrl, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Version: "2021-07-28",
    Accept: "application/json",
  },
  // Sem body no GET
});
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Mudar de POST para GET com query params |

---

## Resultado Esperado

- A sincronização de contactos funcionará com a mesma API Key que já envia mensagens
- Não é necessário gerar nova API Key com scopes adicionais
- O botão "Sincronizar Contactos" importará todos os contactos do GHL

