

## Recuperação Automática de Carrinhos via Sequências — Plano de Execução

### Diagnóstico

**Infraestrutura existente:**
- `email_sequences` com `exit_conditions` (jsonb), `tags`, `is_active`
- `email_sequence_steps` com `template_id`, `delay_days`, `delay_hours`, `channel`, `condition_type`, `condition_value`
- `email_sequence_enrollments` com `contact_id`, `current_step`, `status`, `exit_reason`, `next_send_at`
- `store_abandoned_carts` com `recovery_token`, `customer_email`, `customer_phone`, `contact_id`, `recovery_status`
- `detect-abandoned-carts` — edge function que cria registos + tokens + eventos
- `auto-followup-scheduler` — executor existente mas focado em `followup_queue` (AI inbox), **não** em `email_sequence_enrollments`
- `store_automation_events` — log de eventos da loja
- `useEmailSequences` / `useEnrollContact` — hooks completos de CRUD

**O que falta:**
1. Não existe `store_recovery_settings` (configuração por workspace)
2. `store_abandoned_carts` não tem campos de outreach (`sequence_id`, `sequence_enrollment_id`, `outreach_status`)
3. Não existe executor para `email_sequence_enrollments` — o `auto-followup-scheduler` usa `followup_queue`, não sequências
4. Não existe merge variables para dados do carrinho nos templates
5. `StoreCartsTab` não mostra estado de outreach nem permite inscrição em sequência

---

### Migration SQL

**Nova tabela `store_recovery_settings`:**
- `id`, `workspace_id` (UNIQUE), `is_enabled`, `default_sequence_id` (FK `email_sequences`), `auto_enroll_enabled`, `min_cart_value`, `require_email`, `require_phone`, `abandonment_delay_minutes`, `created_at`, `updated_at`
- RLS: workspace members

**Novos campos em `store_abandoned_carts`:**
- `sequence_id UUID REFERENCES email_sequences(id) ON DELETE SET NULL`
- `sequence_enrollment_id UUID REFERENCES email_sequence_enrollments(id) ON DELETE SET NULL`
- `outreach_status TEXT DEFAULT 'pending'` — pending, enrolled, in_progress, contacted, recovered, exited, failed
- `outreach_started_at TIMESTAMPTZ`
- `last_outreach_at TIMESTAMPTZ`
- `outreach_step INTEGER DEFAULT 0`
- `exit_reason TEXT`

**Índices:** `outreach_status`, `sequence_enrollment_id`

---

### Ficheiros a criar (4)

#### 1. `src/lib/storeRecoveryTemplateVariables.ts`
Utilitário que recebe um `store_abandoned_cart` + `store_settings` e devolve `Record<string, string>` com:
- `contact_name`, `store_name`, `cart_total`, `cart_items_summary`, `recovery_link`, `abandoned_at`, `workspace_name`

#### 2. `src/components/store/StoreRecoverySettings.tsx`
Formulário de configuração com:
- Toggle `is_enabled` / `auto_enroll_enabled`
- Selector de sequência (dropdown das sequências do workspace)
- `min_cart_value`, `require_email`, `require_phone`, `abandonment_delay_minutes`
- Botão guardar com upsert em `store_recovery_settings`

#### 3. `src/components/store/StoreAbandonedCartOutreachDetail.tsx`
Dialog/Sheet com dados do carrinho + estado do outreach + timeline de steps + enrollment associado

#### 4. `supabase/functions/process-store-recovery/index.ts`
Edge function que:
1. Lê `store_recovery_settings` para cada workspace ativo
2. Procura `store_abandoned_carts` com `outreach_status = 'pending'` + elegibilidade (email, subtotal)
3. Encontra ou cria contacto CRM (`contacts`) por email
4. Insere `email_sequence_enrollments` (enrolled_by = service account UUID placeholder)
5. Atualiza `store_abandoned_carts` com `sequence_id`, `sequence_enrollment_id`, `outreach_status = 'enrolled'`
6. Regista `store_automation_events` (`abandoned_cart_auto_enrolled`)
7. Processa enrollments ativos: resolve `next_send_at`, carrega step, monta merge variables, avança `current_step`
8. Exit conditions: se `recovery_status = 'recovered'` → exita enrollment; se `expires_at` passou → exita
9. Nesta fase: cria payload/log de envio sem provider externo obrigatório

---

### Ficheiros a alterar (2)

#### 5. `src/components/store/StoreCartsTab.tsx`
- Importar `StoreRecoverySettings` e renderizar numa secção colapsável (Collapsible ou Accordion)
- Por cada carrinho abandonado: mostrar badge de `outreach_status`, step atual, sequência associada
- Adicionar ao DropdownMenu: "Inscrever em sequência", "Parar sequência", "Trocar sequência"
- Adicionar filtros por `outreach_status`

#### 6. `supabase/functions/detect-abandoned-carts/index.ts`
- Após criar o registo abandonado, verificar se `store_recovery_settings` existe e `auto_enroll_enabled = true`
- Se elegível, chamar a lógica de enrollment inline (ou invocar `process-store-recovery`)

---

### Fluxo final

```text
detect-abandoned-carts
  │
  ├─ Cria store_abandoned_cart (outreach_status='pending')
  ├─ Verifica store_recovery_settings
  └─ Se auto_enroll_enabled + elegível → enrollment imediato
       │
       ├─ Encontra/cria contacto CRM
       ├─ Insere email_sequence_enrollments
       ├─ Atualiza cart (outreach_status='enrolled')
       └─ Emite evento 'abandoned_cart_auto_enrolled'

process-store-recovery (cron/manual)
  │
  ├─ Processa enrollments ativos com next_send_at <= now
  ├─ Carrega step + template + merge variables
  ├─ Cria payload de envio / log
  ├─ Avança current_step / next_send_at
  └─ Exit se cart recovered/expired
```

### Compatibilidade
- `auto-followup-scheduler` permanece intacto (focado em AI inbox)
- `email_sequence_enrollments` reutilizado sem alterações de schema (usa `enrolled_by` com system UUID)
- Templates existentes funcionam com merge variables via `condition_value` ou body inline
- `StoreCartsTab` mantém layout base, apenas adiciona badges + ações + filtros + secção de settings

