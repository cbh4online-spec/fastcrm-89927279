

# Auto-preenchimento de campos de leads durante syncs GHL e Email

## Problema actual

Os syncs GHL (`ghl-sync-contacts`, `ghl-sync-conversations`, `cron-sync-messages`) e email (`email-fetch`) criam leads com dados mínimos (nome, email, phone). A API GHL devolve campos adicionais (website, redes sociais, empresa, endereço) que são ignorados. Dados extraíveis do conteúdo das mensagens (emails, telefones, URLs) também não são capturados.

## Alterações

### 1. Expandir `fetchGHLContact` em `ghl-sync-conversations/index.ts`

Extrair campos adicionais da API GHL (`/contacts/{id}`):
- `website` → `leads.website`
- `companyName` → `leads.company_name`
- `address1`, `city`, `state`, `postalCode` → campos de morada
- Redes sociais do GHL (facebook, linkedin, instagram se disponíveis nos custom fields ou attributions)

Actualizar o return type e a função `createLeadFromGHLContact` para incluir estes campos.

### 2. Expandir `GHLContact` interface e sync em `ghl-sync-contacts/index.ts`

Adicionar campos ao interface `GHLContact`:
- `website`, `companyName`, `address1`, `city`, `state`, `postalCode`, `country`

No batch insert, mapear para as colunas correspondentes da tabela `leads`.

### 3. Mesmo para `cron-sync-messages/index.ts`

A função `fetchGHLContactBasic` e `createLeadFromGHLContact` devem incluir os mesmos campos adicionais.

### 4. Criar edge function `extract-contact-data-from-messages`

Uma função que analisa o conteúdo textual das mensagens e extrai:
- Emails (regex)
- Telefones (regex)
- URLs de redes sociais (Instagram, LinkedIn, Facebook, Twitter)
- Websites

Esta função será chamada como trigger após inserção de mensagens ou como batch job.

### 5. Criar database trigger `after_message_insert_extract_data`

Trigger na tabela `messages` que, após inserção de mensagens inbound, chama a extracção de dados e actualiza o lead/contacto associado com os dados encontrados (apenas se os campos estiverem vazios — não sobrescreve dados existentes).

## Detalhe técnico

### Campos GHL disponíveis na API `/contacts/{id}`:
```text
firstName, lastName, email, phone, companyName, website,
address1, city, state, postalCode, country, tags,
customFields (array com social profiles potenciais)
```

### Regex de extracção de mensagens:
```typescript
const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const INSTAGRAM_REGEX = /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/gi;
const LINKEDIN_REGEX = /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/gi;
const FACEBOOK_REGEX = /facebook\.com\/([a-zA-Z0-9_.]+)/gi;
const WEBSITE_REGEX = /https?:\/\/(?!(?:instagram|facebook|linkedin|twitter|x)\.com)[^\s<>"']+/gi;
```

### Fluxo de update no lead:
```typescript
// Só preenche campos vazios
const updates = {};
if (!lead.email && extractedEmail) updates.email = extractedEmail;
if (!lead.phone && extractedPhone) updates.phone = extractedPhone;
if (!lead.instagram_url && extractedInstagram) updates.instagram_url = extractedInstagram;
if (!lead.linkedin_url && extractedLinkedin) updates.linkedin_url = extractedLinkedin;
// etc.
```

## Ficheiros a modificar/criar

1. `supabase/functions/ghl-sync-contacts/index.ts` — expandir GHLContact e batch insert
2. `supabase/functions/ghl-sync-conversations/index.ts` — expandir fetchGHLContact e createLeadFromGHLContact
3. `supabase/functions/cron-sync-messages/index.ts` — expandir fetchGHLContactBasic e createLeadFromGHLContact
4. `supabase/functions/extract-contact-from-messages/index.ts` — nova edge function
5. Database trigger para extracção automática após inserção de mensagens

