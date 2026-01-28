
# Plano: Corrigir Estrutura do Payload GHL

## Problema Identificado

A Edge Function actual espera os dados do contacto dentro de um objecto `contact`:
```typescript
// Código actual espera:
body.contact.id
body.contact.firstName
body.contact.email
```

Mas o GoHighLevel envia os campos directamente no nível raiz do payload:
```json
{
  "type": "ContactCreate",
  "locationId": "GydyXmDssRSxHw7bQ7Cw",
  "id": "abc123",
  "firstName": "Lurdes",
  "lastName": "Miguela",
  "email": "lurdes@example.com",
  "phone": "+351912345678",
  "tags": ["tag1", "tag2"]
}
```

---

## Solução

Actualizar a Edge Function para suportar **ambos os formatos**:
1. Formato GHL nativo (campos no nível raiz)
2. Formato com objecto `contact` (para compatibilidade futura)

---

## Alterações Técnicas

### Ficheiro: `supabase/functions/ghl-webhook-contact/index.ts`

1. **Actualizar interface do payload** para reflectir o formato real do GHL:

```typescript
interface GHLWebhookPayload {
  // Campos no nível raiz (formato GHL nativo)
  type?: string;
  locationId?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Array<{ id: string; value: unknown }>;
  dateAdded?: string;
  dateUpdated?: string;
  
  // Formato alternativo com objecto contact
  contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    tags?: string[];
  };
}
```

2. **Normalizar extracção de dados** para suportar ambos os formatos:

```typescript
// Extrair contactId do formato correcto
const ghlContactId = body.id || body.contact?.id;

// Extrair campos do contacto
const firstName = body.firstName || body.contact?.firstName || "";
const lastName = body.lastName || body.contact?.lastName || "";
const fullName = body.name || `${firstName} ${lastName}`.trim() || "GHL Contact";
const email = body.email?.trim() || body.contact?.email?.trim() || null;
const phone = body.phone?.trim() || body.contact?.phone?.trim() || null;
const tags = body.tags || body.contact?.tags || [];
```

3. **Melhorar logging** para debug:

```typescript
console.log("[GHL-CONTACT] Full payload received", JSON.stringify(body));
```

---

## Resultado Esperado

Após implementação:
- A Edge Function processará correctamente os webhooks do GHL
- Os contactos criados no GoHighLevel aparecerão como leads no FastCRM
- Suporte para ambos os formatos de payload para máxima compatibilidade

---

## Passos de Validação

1. Fazer deploy da Edge Function actualizada
2. Criar um contacto de teste no GoHighLevel
3. Verificar nos logs que o contacto foi processado
4. Confirmar que o lead aparece no workspace PHARLISS
