

# Adicionar Twitter/X aos syncs GHL e extracção de mensagens

## Alterações

### 1. `ghl-sync-contacts/index.ts` — 2 funções helper + 2 inserts
- Em `extractSocialFromCustomFields` (linha ~253): adicionar `if (socialMedia?.twitter) result.twitter_url = socialMedia.twitter;` e no loop de custom fields: `if (!result.twitter_url && key.includes("twitter")) result.twitter_url = ...`
- Alterar return type de `{ instagram_url?; linkedin_url?; facebook_url? }` para incluir `twitter_url?`
- No insert (linha ~326): adicionar `twitter_url: socialUrls.twitter_url || null`
- Repetir para `extractSocialFromCustomFieldsNS` (linha ~516) e segundo insert (~550)

### 2. `cron-sync-messages/index.ts` — helper + insert
- Em `extractSocialFromCustomFields` (linha ~73): mesmo padrão — adicionar twitter nativo + custom field
- Alterar return type para incluir `twitter_url?`
- No insert do lead, adicionar `twitter_url`

### 3. `ghl-sync-conversations/index.ts` — helper + insert
- Mesmo padrão: expandir helper e insert com `twitter_url`

### 4. `extract-contact-from-messages/index.ts`
- Adicionar `twitter_url?: string` ao `ExtractedData` (linha ~29)
- Na função `extractFromText`: extrair Twitter/X e guardar em `result.twitter_url` (o regex TWITTER_REGEX já existe na linha 20, só não é usado)
- No select do lead (linhas ~133 e ~231): adicionar `twitter_url`
- Nos updates (linhas ~147-150 e ~240-243): adicionar `if (!lead.twitter_url && extracted.twitter_url) updates.twitter_url = extracted.twitter_url`

## Resumo
Twitter/X já tem: regex de extracção, campo `socialMedia.twitter` na interface GHL, e coluna `twitter_url` na tabela leads. Falta apenas ligá-los — adicionar `twitter_url` ao return type dos helpers, aos inserts, e à extracção de mensagens.

