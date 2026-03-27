

## Usar compositor interno de email no detalhe da oportunidade

### Problema
O botão "Compor email" no detalhe da oportunidade (`OpportunityHeaderActions`) abre o cliente de email externo via `mailto:`. Deveria abrir o `ComposeEmailDialog` interno e incluir contexto do pipeline.

### Solução

| Ficheiro | Alteração |
|---|---|
| `OpportunityHeaderActions.tsx` | Adicionar state `showEmailDialog`, substituir `mailto:` por `setShowEmailDialog(true)`, renderizar `ComposeEmailDialog` com dados do contacto/lead associado |
| `OpportunityDetailPage.tsx` | Passar dados do contacto/lead/empresa e etapa atual como props ao `OpportunityHeaderActions` |

### Detalhes

1. **`OpportunityDetailPage.tsx`** — passar novas props ao `OpportunityHeaderActions`:
   - `contactEmail` / `contactName` / `contactId` (do contacto ou lead associado)
   - `stageName` (etapa atual do pipeline)
   - `pipelineContext` (título da oportunidade + etapa)

2. **`OpportunityHeaderActions.tsx`**:
   - Adicionar `useState` para controlar o dialog
   - Substituir `handleComposeEmail` de `window.open(mailto:)` para `setShowEmailDialog(true)`
   - Renderizar `<ComposeEmailDialog>` com:
     - `recipient`: email do contacto/lead associado
     - `defaultSubject`: título da oportunidade
     - `templateContext`: incluir `pipeline_stage`, `opportunity_title`, `contact_name`
   - Se não houver email associado, mostrar toast a avisar que não há contacto com email

### Contexto passado ao compositor

```text
recipient: {
  email: contact.email || lead.email,
  name: contact.name || lead.name,
  entityType: "contact" | "lead",
  entityId: contact.id || lead.id
}
defaultSubject: "Re: {opportunity.title}"
templateContext: {
  pipeline_stage: currentStage.name,
  opportunity_title: opportunity.title,
  contact_name: ...,
  company_name: ...
}
```

