

# Histórico de Alterações do RFQ

## Plano

### 1. Migration — Tabela `rfq_audit_log` + Trigger

Criar tabela `rfq_audit_log` seguindo o padrão de `contact_audit_log`:

```sql
CREATE TABLE public.rfq_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);
```

- Índices em `(workspace_id)`, `(rfq_id, changed_at DESC)`
- RLS: SELECT para workspace members
- Trigger `fn_rfq_audit_trigger()` BEFORE UPDATE nos campos: `title`, `status`, `due_date`, `notes`, `currency`, `payment_terms`, `delivery_location`, `quote_validity_days`, `incoterm`, `buyer_name`, `buyer_email`, `project_id`
- Adicionar coluna `updated_by uuid` à tabela `rfqs` para rastrear quem fez a alteração

### 2. Hook `useRFQAuditLog`

Novo ficheiro `src/hooks/useRFQAuditLog.ts` — query simples que busca logs por `rfq_id`, ordenados por `changed_at DESC`, limite 200.

### 3. Componente `RFQAuditTrail`

Novo ficheiro `src/components/procurement/RFQAuditTrail.tsx` — componente timeline (padrão do `OrderAuditTrail`) com:
- Scroll area, timeline visual com dots
- Badge por campo alterado com label PT
- Valor antigo → novo para campos chave (status, título, etc.)
- Busca do email do utilizador via profiles

### 4. Integrar no `RFQDetailPage.tsx`

- Adicionar `RFQAuditTrail` no fundo da página de detalhe do RFQ
- Passar `rfq.id` como prop

### 5. Atualizar `useUpdateRFQ`

- Passar `updated_by: auth.uid()` no update para que o trigger saiba quem alterou

### Ficheiros
- **Migration SQL** (1 ficheiro)
- `src/hooks/useRFQAuditLog.ts` (novo)
- `src/components/procurement/RFQAuditTrail.tsx` (novo)
- `src/pages/procurement/RFQDetailPage.tsx` (editar)
- `src/hooks/useRFQ.ts` (editar `useUpdateRFQ`)

