# Pipeline como ferramenta rápida de proposta + fatura via WhatsApp

## Diagnóstico

A infraestrutura já existe — só falta cosê-la num fluxo 1-clique a partir da oportunidade:
- `proposals` + `proposal_items` (catálogo, qtd, total automático) ✅
- `invoices` com FK `opportunity_id` / `proposal_id` ✅
- `invoicexpress-proxy` + `invoicexpress-sync-invoices` ✅
- `whatsapp-pro-send` com suporte a `mediaUrl` (PDF) ✅
- `pipeline_stages` com `probability` (estágio "Ganho" = 100%) ✅
- Opportunity Detail já tem `OpportunityProposalsTab` ✅

Hoje o utilizador tem de: criar proposta noutra página → preencher tudo → publicar → ir a InvoiceXpress → criar fatura → copiar link → ir ao WhatsApp → enviar. Vamos colapsar isto em **2 cliques**.

## Decisões de produto/UX

**1. "Proposta Rápida" — drawer dentro da OpportunityDetail**
- Botão primário no header: **"Nova proposta rápida"**
- Drawer lateral (não modal full-page) com:
  - Seletor de produtos do catálogo (combobox com search) → adiciona linha
  - Linhas editáveis: nome, qtd, preço unitário, desconto % (preenche automático do produto)
  - Total/IVA/Final calculado em tempo real
  - Validade (default 7 dias) + condições pagamento (default da workspace)
  - 1 botão: **"Criar e enviar por WhatsApp"** → cria proposta `published`, gera link público, envia mensagem via `whatsapp-pro-send` com link curto + (opcional) PDF.

**2. Adjudicação automática ao mover para "Ganho"**
- Hook em `useUpdateOpportunityEnhanced`: quando `stage_id` novo tem `probability === 100`:
  - Procura proposta `accepted` ou mais recente `published` da oportunidade
  - Cria fatura local (`invoices`) a partir dos `proposal_items`
  - Sincroniza com InvoiceXpress (se integração ativa) → recebe `public_url` e PDF
  - Envia WhatsApp ao contacto com link curto + PDF anexo
  - Toast: "Fatura #INV-2025-001 enviada por WhatsApp ✅" com undo de 5s
- Confirmação prévia: AlertDialog "Adjudicar este negócio? Será gerada e enviada a fatura."

**3. Configuração mínima (Settings → Pipeline)**
- Toggle: "Gerar fatura automaticamente ao Ganhar" (default ON)
- Toggle: "Anexar PDF no WhatsApp" (default ON, só link se OFF)
- Template editável da mensagem WhatsApp: `Olá {{cliente}}, segue a fatura nº {{numero}} no valor de {{total}}. Link: {{link}}`

## Estrutura técnica

### Novos componentes
```
src/components/opportunities/quick-proposal/
  QuickProposalDrawer.tsx          # drawer principal
  QuickProposalProductPicker.tsx   # combobox catálogo
  QuickProposalLineRow.tsx         # linha editável
  QuickProposalSummary.tsx         # totais + envio
src/components/opportunities/AdjudicateDialog.tsx
src/components/settings/pipeline/PipelineAutomationSettings.tsx
```

### Novos hooks
```
src/hooks/proposals/useCreateQuickProposal.ts   # cria proposta + items + publica
src/hooks/opportunities/useAdjudicateOpportunity.ts  # ganha → fatura → whatsapp
```

### Nova edge function
```
supabase/functions/opportunity-adjudicate/index.ts
```
Input: `{ opportunityId }` | Auth: JWT + workspace check
Fluxo:
1. Carrega oportunidade + proposta ativa + items + contacto
2. INSERT `invoices` + `invoice_items` (workspace_id, opportunity_id, proposal_id)
3. Se workspace tem `billing_integrations.is_active` (InvoiceXpress) → POST via `invoicexpress-proxy` → guarda `external_id` + `public_url` + `pdf_url` em `invoices`
4. Resolve telefone do contacto → invoca `whatsapp-pro-send` com template + mediaUrl (PDF)
5. Atualiza `opportunities.status='won'` + `last_won_at`
6. Logs em `activity_logs` com `correlation_id`
7. Retorna 200 com `{ ok, invoiceId, publicUrl, whatsappStatus }`; em falha parcial devolve `{ ok: false, fallback: 'invoice_created_whatsapp_failed' }`

### Migration
```sql
-- Tabela de configuração por workspace
CREATE TABLE pipeline_automation_settings (
  workspace_id uuid PK FK,
  auto_invoice_on_won boolean DEFAULT true,
  attach_pdf_whatsapp boolean DEFAULT true,
  whatsapp_template text DEFAULT 'Olá {{cliente}}...',
  ...
);
-- RLS: SELECT/UPDATE para members; INSERT via trigger
```

## Plano de implementação

1. **Migration** — tabela `pipeline_automation_settings` + RLS
2. **Edge function** `opportunity-adjudicate` (núcleo: fatura + WhatsApp)
3. **Hook** `useCreateQuickProposal` — wrapper sobre `proposals` + `proposal_items` + publish
4. **QuickProposalDrawer** + sub-componentes — UI 1-clique
5. **Botão "Nova proposta rápida"** no `OpportunityDetail` header
6. **AdjudicateDialog** + integração no `OpportunityStagesStepper` e drag-drop kanban
7. **Settings → Pipeline** — toggles + template
8. **i18n PT** + estados (loading/erro/sucesso/sem integração) + toasts com undo
9. QA: oportunidade sem contacto WhatsApp, sem InvoiceXpress, sem produtos, com catálogo grande (virtualização do picker)

## Critérios de aceitação

- [ ] A partir de `/dashboard/opportunities/:id`, em ≤ 30s e ≤ 2 cliques crio proposta com 3 produtos do catálogo e envio por WhatsApp
- [ ] Mover deal para etapa "Ganho" no kanban dispara confirmação → fatura → WhatsApp automático
- [ ] Mensagem WhatsApp chega com link público da fatura (InvoiceXpress se ativo, senão local) + PDF anexo
- [ ] Se InvoiceXpress falhar: fatura local é criada na mesma + toast com erro acionável
- [ ] Se WhatsApp falhar: fatura permanece + utilizador vê botão "Reenviar por WhatsApp"
- [ ] Toggle "auto-fatura" em Settings desativa o trigger automático
- [ ] Sem contacto/telefone: bloqueia com mensagem clara antes de tentar enviar
- [ ] RLS: utilizador de outra workspace não consegue adjudicar
- [ ] Mobile: drawer responsivo, picker usável

## Riscos e pontos por validar

- **InvoiceXpress async**: a sincronização atual é via cron — vamos invocar `invoicexpress-proxy` em modo síncrono (POST `/invoices.json` + `finalise`) para obter `public_url` na hora. Confirmar que o proxy suporta este fluxo ou estender.
- **PDF do InvoiceXpress**: endpoint `/invoices/{id}/pdf` pode demorar a estar disponível após finalize → fazer poll curto (max 5s) e cair para "só link" se não vier a tempo.
- **Telefone do contacto**: alguns contactos podem ter telefone em `phone` ou `mobile_phone` — usar normalizador `src/utils/phone.ts`.
- **Numeração da fatura local**: já existe `invoice_number` — manter sequência via função existente; quando InvoiceXpress sincroniza, atualizar com número oficial.
- **Reversão**: se utilizador desadjudicar (move para outra etapa), NÃO eliminar fatura — apenas marcar `status='cancelled'` opcionalmente. Pedir confirmação ao utilizador.
- **Permissões**: só roles `admin`/`sales` podem adjudicar (verificar `has_role`).

Aprovas avançar com este plano? Posso começar pela migration + edge function `opportunity-adjudicate` e depois o drawer.
