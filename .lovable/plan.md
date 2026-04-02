

# Funis Criam Leads (Não Contactos)

## Diagnóstico

A edge function `funnel-lead-capture` insere/atualiza directamente na tabela `contacts`. O fluxo correcto deveria criar registos na tabela `leads` — os funis capturam leads que depois, manualmente ou via automação, são convertidos em contactos.

## Solução

Alterar a edge function `funnel-lead-capture` para:
1. Procurar leads existentes por email no workspace (em vez de contactos)
2. Criar/atualizar na tabela `leads` (em vez de `contacts`)
3. Manter tags, activity_logs e link à `funnel_submissions` — mas referenciando leads

A tabela `funnel_submissions` tem `contact_id` — precisamos verificar se existe ou adicionar `lead_id`.

## Alterações

| Ficheiro | Acção |
|---|---|
| Migração SQL | Adicionar coluna `lead_id` (FK → leads) a `funnel_submissions` |
| `supabase/functions/funnel-lead-capture/index.ts` | Reescrever para operar na tabela `leads` em vez de `contacts` |

### Edge Function — alterações chave

```typescript
// ANTES: contacts
const { data: existingContact } = await supabase
  .from("contacts").select("id, tags")...

// DEPOIS: leads  
const { data: existingLead } = await supabase
  .from("leads").select("id, tags")
  .eq("workspace_id", workspace_id)
  .eq("email", normalizedEmail)
  .maybeSingle();

// Insert em leads (não contacts)
const { data: newLead } = await supabase
  .from("leads").insert({
    workspace_id,
    name: name || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    source: "funnel",
    status: "new",
    tags: newTags,
  }).select("id").single();

// Activity log com entity_type: "lead"
// funnel_submissions.lead_id = leadId
```

### Migração SQL

```sql
ALTER TABLE public.funnel_submissions 
  ADD COLUMN lead_id uuid REFERENCES public.leads(id);
```

A coluna `contact_id` existente permanece para retrocompatibilidade com submissões antigas.

## Critérios de aceitação

- Submissões de funil criam registos em `leads`, não em `contacts`
- Leads duplicados por email são atualizados (merge de tags)
- Activity logs registam `entity_type: "lead"`
- `funnel_submissions.lead_id` preenchido correctamente
- Submissões antigas com `contact_id` continuam a funcionar

