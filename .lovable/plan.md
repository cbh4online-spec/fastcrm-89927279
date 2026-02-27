

# Auto-preenchimento de campos de leads durante syncs GHL e Email

## Estado: ✅ Implementado

### O que foi feito

1. **`ghl-sync-contacts/index.ts`** — Interface `GHLContact` expandida com `website`, `companyName`, `address1`, `city`, `state`, `postalCode`, `country`, `customFields`. Batch insert agora inclui `website`, `company_name`, `address`, `city`, `postal_code`, `instagram_url`, `linkedin_url`, `facebook_url`.

2. **`ghl-sync-conversations/index.ts`** — `fetchGHLContact` agora retorna interface `GHLContactData` com todos os campos adicionais. `createLeadFromGHLContact` preenche campos extra se disponíveis.

3. **`cron-sync-messages/index.ts`** — `fetchGHLContactBasic` e `createLeadFromGHLContact` expandidos com os mesmos campos adicionais.

4. **`extract-contact-from-messages/index.ts`** — Nova edge function que extrai emails, telefones, URLs de redes sociais e websites do conteúdo das mensagens usando regex. Suporta modo single (por mensagem) e batch (últimas 24h). Apenas preenche campos vazios.

5. **Database trigger `after_message_insert_extract_contact`** — Trigger AFTER INSERT na tabela `messages` que chama a edge function via `pg_net` para mensagens inbound com conteúdo >= 10 caracteres. Fire-and-forget, nunca bloqueia inserção.

### Campos extraídos das mensagens (regex)
- Email, telefone, Instagram, LinkedIn, Facebook, Twitter/X, websites genéricos

### Princípio
- Só preenche campos vazios — nunca sobrescreve dados existentes
