

## Campos editáveis inline nas páginas de detalhe do módulo Segurança

### Problema actual
Todas as páginas de detalhe (Lead, Proposta, Contrato, Site, Sistema, Cliente, Ocorrência) mostram campos como texto estático via um componente `InfoRow` read-only. O utilizador tem de abrir dialogs ou não consegue editar de todo.

### Solução
Substituir os `InfoRow` estáticos pelo componente `InlineFieldEditor` já existente no projecto, que suporta text, number, date, select, currency e boolean com edição click-to-edit. Cada campo grava diretamente via o mutation `update*` do hook correspondente.

### Páginas a alterar (7 ficheiros)

| Página | Hook de update | Campos editáveis |
|--------|---------------|-----------------|
| `SecurityLeadDetailPage` | `updateLead` | client_name, client_type, installation_address, origin, priority, system_type, request_type, estimated_value, need_description, notes |
| `SecurityProposalDetailPage` | `updateProposal` | title, status, final_value, discount_percent, validity_days, notes |
| `SecurityContractDetailPage` | `updateContract` | contract_type, contract_status, adjudication_date, start_date, end_date, renewal_notice_days, notes, commercial_terms_json fields |
| `SecuritySiteDetailPage` | `updateSite` (via `useSecuritySites`) | site_name, address_line_1, address_line_2, postal_code, locality, county, district, country, onsite_responsible_name/phone/email, access_notes, notes |
| `SecuritySystemDetailPage` | `updateSystem` | system_type, status, lifecycle_stage, main_brand, main_model, notes |
| `SecurityClientDetailPage` | `updateClient` (via `useSecurityClients`) | name, client_type, nif, primary_phone, secondary_phone, primary_email, trade_name, fiscal_address, fiscal_postal_code, fiscal_locality, contact_person_*, notes |
| `SecurityOccurrenceDetailPage` | `updateOccurrence` | title, severity, category, description, assigned_to, notes |

### Implementação técnica

1. **Criar componente wrapper `SecurityInlineField`** — thin wrapper que recebe `entityId`, `fieldName`, `fieldType`, `value`, `updateMutation` e chama `InlineFieldEditor` com o `onSave` a invocar `mutation.mutate({ id: entityId, [fieldName]: newValue })`. Inclui label e layout consistente.

2. **Substituir `InfoRow` em cada página** — trocar de:
   ```tsx
   <InfoRow label="Cliente" value={lead.client_name} />
   ```
   para:
   ```tsx
   <SecurityInlineField
     label="Cliente"
     value={lead.client_name}
     fieldType="text"
     onSave={(v) => updateLead.mutate({ id: lead.id, client_name: v })}
   />
   ```

3. **Campos select** — usar `fieldType="select"` com options para campos como `status`, `priority`, `system_type`, `client_type`, `contract_type`, `severity`.

4. **Campos currency** — usar `fieldType="currency"` para `estimated_value`, `final_value`, `total_value`.

5. **Campos date** — usar `fieldType="date"` para `adjudication_date`, `start_date`, `end_date`, `installation_date`.

6. **Textarea-like fields** (notes, need_description) — usar `fieldType="text"` standard (single line inline edit).

7. **Invalidação de queries** — já está implementada nos mutations existentes, portanto o valor actualiza automaticamente após save.

### Ficheiros

| Acção | Ficheiro |
|-------|---------|
| Criar | `src/components/security/SecurityInlineField.tsx` |
| Editar | `src/pages/security/SecurityLeadDetailPage.tsx` |
| Editar | `src/pages/security/SecurityProposalDetailPage.tsx` |
| Editar | `src/pages/security/SecurityContractDetailPage.tsx` |
| Editar | `src/pages/security/SecuritySiteDetailPage.tsx` |
| Editar | `src/pages/security/SecuritySystemDetailPage.tsx` |
| Editar | `src/pages/security/SecurityClientDetailPage.tsx` |
| Editar | `src/pages/security/SecurityOccurrenceDetailPage.tsx` |

