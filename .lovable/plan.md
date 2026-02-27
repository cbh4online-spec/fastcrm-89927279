

# Integrar LinkedIn directo da API GHL (campos nativos)

## Problema

O código actual só extrai LinkedIn dos `customFields` do GHL (campos personalizados). Mas a API GHL v2 também fornece LinkedIn em campos dedicados:
- `contact.socialMedia.linkedIn` — campo nativo de rede social
- `contact.attributions[].url` — URLs de atribuição que podem conter LinkedIn

Se o contacto tem LinkedIn preenchido nos campos nativos do GHL (não em custom fields), o sistema não o captura.

## Alterações

### 1. `ghl-sync-contacts/index.ts`
- Expandir interface `GHLContact` com `socialMedia?: { linkedIn?: string; facebook?: string; instagram?: string; twitter?: string }`
- Na função `extractSocialFromCustomFields` (ambas as cópias), verificar primeiro os campos nativos `socialMedia` antes dos custom fields
- Se `contact.socialMedia?.linkedIn` existir, usar como `linkedin_url` (prioridade sobre custom fields)

### 2. `ghl-sync-conversations/index.ts`
- Expandir `fetchGHLContact` para ler `contact.socialMedia` da resposta da API
- Passar `socialMedia` para `extractSocialFromCustomFields` como fallback/prioridade

### 3. `cron-sync-messages/index.ts`
- Mesmo tratamento: ler `socialMedia` do contacto GHL quando disponível

### 4. `extract-contact-from-messages/index.ts`
- Adicionar regex para LinkedIn company pages: `/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/gi`
- O regex actual só captura `/in/` (perfis pessoais), não `/company/` (páginas de empresa)

## Detalhe

A mudança principal em cada `extractSocialFromCustomFields`:
```typescript
function extractSocialUrls(
  socialMedia?: { linkedIn?: string; facebook?: string; instagram?: string },
  customFields?: Array<{ id?: string; field_key?: string; key?: string; value?: string }>
) {
  const result: Record<string, string> = {};
  
  // Priority 1: native GHL socialMedia fields
  if (socialMedia?.linkedIn) result.linkedin_url = socialMedia.linkedIn;
  if (socialMedia?.facebook) result.facebook_url = socialMedia.facebook;
  if (socialMedia?.instagram) result.instagram_url = socialMedia.instagram;
  
  // Priority 2: custom fields (only fill if not already set)
  if (customFields) {
    for (const f of customFields) {
      const key = (f.field_key || f.key || f.id || "").toLowerCase();
      const val = f.value;
      if (!val) continue;
      if (!result.linkedin_url && key.includes("linkedin")) 
        result.linkedin_url = val.startsWith("http") ? val : `https://linkedin.com/in/${val}`;
      if (!result.facebook_url && key.includes("facebook")) 
        result.facebook_url = val.startsWith("http") ? val : `https://facebook.com/${val}`;
      if (!result.instagram_url && key.includes("instagram")) 
        result.instagram_url = val.startsWith("http") ? val : `https://instagram.com/${val}`;
    }
  }
  return result;
}
```

## Ficheiros a modificar

1. `supabase/functions/ghl-sync-contacts/index.ts` — interface + 2 helpers
2. `supabase/functions/ghl-sync-conversations/index.ts` — fetchGHLContact + helper
3. `supabase/functions/cron-sync-messages/index.ts` — fetchGHLContactBasic + helper
4. `supabase/functions/extract-contact-from-messages/index.ts` — adicionar regex `/company/`

