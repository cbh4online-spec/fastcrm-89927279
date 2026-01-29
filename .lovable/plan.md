
# Plano: Corrigir Criação de Contacto GHL para Instagram

## Problema Identificado

A API do GHL rejeita contactos que não tenham pelo menos um destes campos:
- `email`
- `phone`
- `firstName`
- `lastName`

Actualmente, para contactos Instagram, estamos a enviar apenas:
```json
{
  "locationId": "...",
  "name": "@jcardo76",
  "tags": ["instagram", "ig:jcardo76"],
  "customFields": [...]
}
```

O campo `name` sozinho **não é aceite** pelo GHL.

## Solução

Modificar a lógica de criação de contacto para:
1. Dividir o nome em `firstName` e `lastName`
2. Usar o username do Instagram como `firstName` quando não há outro nome disponível

## Alterações no Código

**Ficheiro**: `supabase/functions/ghl-send-message/index.ts`

Alterar a secção de criação do payload (linhas 101-134):

```typescript
// Build contact payload based on available data
const contactPayload: Record<string, unknown> = {
  locationId: configForCreate.ghl_location_id,
};

// Add phone if available
const contactPhone = phone || lead?.phone || contact?.phone;
if (contactPhone) {
  contactPayload.phone = contactPhone;
}

// Add email if available
const contactEmail = lead?.email || contact?.email;
if (contactEmail) {
  contactPayload.email = contactEmail;
}

// Get name from lead/contact
const leadObj = conversation.lead as { name?: string } | null;
const contactObj = conversation.contact as { name?: string } | null;
const fullName = leadObj?.name || contactObj?.name || "";

// NOVO: Dividir nome em firstName/lastName
// GHL requer pelo menos firstName ou lastName (não aceita apenas "name")
if (fullName && !fullName.startsWith("@")) {
  const nameParts = fullName.trim().split(" ");
  contactPayload.firstName = nameParts[0];
  if (nameParts.length > 1) {
    contactPayload.lastName = nameParts.slice(1).join(" ");
  }
} else if (instagramUsername) {
  // Para Instagram sem nome real, usar username como firstName
  contactPayload.firstName = instagramUsername;
  contactPayload.lastName = "(Instagram)";
} else if (contactPhone) {
  // Para contactos só com telefone
  contactPayload.firstName = "Contacto";
  contactPayload.lastName = contactPhone;
} else {
  // Fallback absoluto
  contactPayload.firstName = "Contacto";
  contactPayload.lastName = "Desconhecido";
}

// Manter tags para Instagram
if (instagramUsername) {
  contactPayload.tags = ["instagram", `ig:${instagramUsername}`];
  contactPayload.customFields = [
    { key: "instagram_username", value: instagramUsername }
  ];
}
```

## Resultado Esperado

Para o username `jcardo76`, o payload passará a ser:
```json
{
  "locationId": "GydyXmDssRSxHw7bQ7Cw",
  "firstName": "jcardo76",
  "lastName": "(Instagram)",
  "tags": ["instagram", "ig:jcardo76"],
  "customFields": [{ "key": "instagram_username", "value": "jcardo76" }]
}
```

Este payload satisfaz os requisitos do GHL e permite criar o contacto.

## Ficheiro a Modificar
- `supabase/functions/ghl-send-message/index.ts` (linhas 101-134)
