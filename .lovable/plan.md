

## Plano: Enriquecimento do Módulo de Tickets (Fase 2 + Livrarias do documento)

O documento uploaded define um blueprint detalhado para o módulo de tickets, mapeando ~35 livrarias já instaladas e 4 novas (`react-timeago`, `react-mentions`, `@uidotdev/usehooks`, `ms`). O plano integra as recomendações do documento com a Fase 2 já aprovada.

---

### Estado Atual

- **DB**: 3 tabelas (`support_tickets` com 21 colunas, `support_ticket_messages` com 8 colunas, `support_canned_responses`)
- **UI**: Dashboard com 6 KPIs + gráficos, Lista com Kanban/Tabela + bulk actions, Detalhe com thread + sidebar, Respostas Rápidas
- **Em falta**: Audit log, anexos UI, tags editáveis, tabs no detalhe, CSAT, SLA configurável, react-timeago, @mentions, rich text editor

---

### Fase 2A — Instalar packages + Detalhe de Ticket Profissional

**Packages novos**: `react-timeago`, `react-mentions`, `@uidotdev/usehooks`, `ms`, `@types/ms`

**DB Migration**:
- Criar tabela `support_ticket_history` (audit log: ticket_id, field_changed, old_value, new_value, changed_by, created_at)
- Adicionar colunas `content_type` (text/markdown/html) e `sender_name` em `support_ticket_messages` (se não existirem)
- Criar storage bucket `ticket-attachments` para anexos
- RLS policies para ambas as tabelas

**HelpdeskTicketDetail.tsx** — Restruturar com Tabs:
- Tab "Conversação": thread de mensagens existente, melhorado com:
  - `react-timeago` em cada mensagem (substituir date-fns format por tempo relativo)
  - Mensagens renderizadas com `react-markdown` + `remark-gfm` + `dompurify`
  - Upload de anexos com `react-dropzone` + thumbnails para imagens + download com `file-saver`
  - Badge "IA" para mensagens `sender_type: 'ai'`
- Tab "Atividade": Timeline visual do audit log (`TicketActivityTimeline.tsx`)
- Tab "Relacionados": Tickets do mesmo contacto/empresa

**TicketMessageThread.tsx** — Enriquecer composer:
- Substituir Textarea por TipTap editor (bold, italic, links, listas)
- `react-mentions` para @menções de agentes
- Botão de emoji com `@emoji-mart/react`
- Atalhos: `Ctrl+Enter` enviar (já existe), `Cmd+Shift+N` nota interna
- Canned responses já existem — manter
- Botão placeholder "Sugerir resposta com IA"

**TicketSidebar.tsx** — Enriquecer:
- Dropdown de atribuição de agente com avatar (query profiles)
- Tags editáveis inline (adicionar/remover com autocomplete)
- Contacto/Empresa linkados com card visual
- CSAT rating (1-5 estrelas) quando ticket resolvido
- Tempos relativos com `react-timeago`
- Botão "Copiar ID" com `useCopyToClipboard`

### Fase 2B — Melhorias na Lista e Dashboard

**HelpdeskTicketsList.tsx**:
- Coluna "Última atualização" com `react-timeago`
- Coluna "Agente" com avatar (join profiles)
- Filtros sincronizados com URL via `nuqs`
- Pesquisa fuzzy com `fuse.js` + `use-debounce`

**HelpdeskDashboard.tsx**:
- Contadores animados com `react-countup`
- Tempos relativos nos tickets recentes

### Fase 2C — Rotas e Navegação

Adicionar ao `routeManifest.ts`:
- `helpdesk-sla` → `/dashboard/helpdesk/sla-policies` (Políticas SLA)
- `helpdesk-kb` → `/dashboard/helpdesk/knowledge-base` (Base de Conhecimento) — placeholder

---

### Novos Ficheiros

```text
src/components/helpdesk/
├── TicketActivityTimeline.tsx    — Audit log visual
├── TicketAttachments.tsx         — Upload + preview de anexos
├── AgentAssignDropdown.tsx       — Dropdown de agentes com avatar
├── TicketTagsEditor.tsx          — Tags editáveis inline
├── CSATWidget.tsx                — Rating 1-5 estrelas
├── TicketRelatedList.tsx         — Tickets relacionados
└── TicketRichComposer.tsx        — TipTap + mentions + emoji

src/hooks/
├── useHelpdeskHistory.ts         — Query audit log
└── useWorkspaceMembers.ts        — Listar membros para atribuição (se não existir)
```

### Ficheiros Modificados

- `HelpdeskTicketDetail.tsx` — Tabs (Conversação | Atividade | Relacionados)
- `TicketMessageThread.tsx` — Rich composer, react-timeago, markdown rendering
- `TicketSidebar.tsx` — Agent dropdown, tags editor, CSAT, contacto card
- `HelpdeskTicketsList.tsx` — react-timeago, agent avatar, nuqs, fuse.js
- `HelpdeskDashboard.tsx` — react-countup, react-timeago
- `routeManifest.ts` — Novas rotas SLA/KB

### Critérios de Aceitação

- Detalhe com 3 tabs funcionais
- Mensagens com markdown rendering e tempo relativo
- Anexos: upload, preview de imagens, download
- Tags editáveis no detalhe
- Atribuição de agente com avatar
- Audit trail visual de alterações
- Pesquisa fuzzy na lista
- Filtros persistidos no URL
- 0 erros TypeScript

### Riscos

- TipTap pode aumentar o bundle size — usar dynamic import
- `react-mentions` pode conflitar com TipTap — preferir `@tiptap/extension-mention` se possível
- Storage bucket precisa de políticas RLS para upload/download

