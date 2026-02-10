
# Portal B2B 2.0 -- Client Control & Intelligence Hub

## Analise do Estado Atual vs. Spec

O portal atual cobre: login, catalogo com precos B2B, carrinho, checkout com notas de encomenda, historico de encomendas, favoritos, recompra rapida, assistente IA diagnostico e pesquisa semantica.

**Gaps identificados** (agrupados por prioridade):

---

## Fase 1 -- Gestao de Utilizadores e Permissoes B2B (Core)

Atualmente cada `client_user` e individual. Nao existe conceito de **roles B2B** (Admin do Cliente, Financeiro, Operacional, Viewer) nem gestao de sub-utilizadores por empresa.

### 1.1 Tabela `client_user_roles`
- Nova tabela com enum: `client_admin`, `client_financial`, `client_operational`, `client_viewer`
- FK para `client_users`, com RLS por `workspace_id`
- Campo `spending_limit` (plafond mensal) e `allowed_product_categories` (JSONB)

### 1.2 Pagina "Equipa" no Portal
- Nova rota `/client/team` -- so visivel para `client_admin`
- Listar sub-utilizadores da mesma `company_id`
- Convidar novos utilizadores (reutiliza edge function `create-client-auth-user`)
- Atribuir/editar roles e limites

### 1.3 Hook `useClientPermissions`
- Avalia o role do `clientUser` logado
- Exporta: `canApprove`, `canPurchase`, `canViewInvoices`, `canManageTeam`
- Usado no `ClientLayout` para filtrar menu e em cada pagina para controlo de acesso

---

## Fase 2 -- Fluxos de Aprovacao B2B

### 2.1 Tabela `client_approval_flows`
- Configuracao por empresa: thresholds de valor, quem aprova
- Tipos: `purchase`, `refund`, `upgrade`

### 2.2 Tabela `client_approval_requests`
- FK para `order_notes` ou generica (`entity_type` + `entity_id`)
- Status: `pending`, `approved`, `rejected`
- Campos: `requested_by`, `decided_by`, `decided_at`, `reason`
- Trigger de notificacao

### 2.3 UI de Aprovacao no Portal
- Badge no menu com contagem de pendentes
- Pagina `/client/approvals` -- lista de pedidos pendentes
- Acoes: aprovar/rejeitar com comentario
- Integrado no checkout: se o utilizador nao tiver permissao para o valor, cria um `approval_request` em vez de submeter diretamente

---

## Fase 3 -- Faturacao e Financeiro no Portal

### 3.1 Pagina `/client/invoices`
- Consulta da tabela `invoices` filtrada por `company_id` ou `contact_id` do `clientUser`
- Listar: numero, data, valor, estado, download PDF
- So visivel para roles `client_admin` e `client_financial`

### 3.2 Pagina `/client/financial`
- Dashboard financeiro: total faturado, pendente, vencido
- Grafico de evolucao mensal (recharts)
- Condicoes comerciais do cliente (payment_terms, credit_limit)
- Visivel para `client_admin` e `client_financial`

---

## Fase 4 -- Contratos e SLAs

### 4.1 Tabela `client_contracts`
- Campos: `company_id`, `workspace_id`, `title`, `type` (contrato/SLA), `start_date`, `end_date`, `renewal_date`, `status`, `terms` (JSONB), `document_url`
- RLS por workspace + empresa

### 4.2 Pagina `/client/contracts`
- Lista de contratos ativos
- Detalhes: termos, datas, SLA, documento anexo
- Alerta visual para contratos proximos da expiracao (< 30 dias)

---

## Fase 5 -- Tickets e Suporte B2B

### 5.1 Tabela `client_tickets`
- Campos: `company_id`, `client_user_id`, `workspace_id`, `type` (suporte/comercial/tecnico), `priority`, `subject`, `description`, `status`, `sla_deadline`
- Tabela `client_ticket_messages` para historico de conversa

### 5.2 Pagina `/client/support`
- Criar novo ticket (tipo, prioridade, descricao)
- Lista de tickets com filtros
- Detalhe com timeline de mensagens
- Indicador de SLA (tempo restante)

---

## Fase 6 -- Intelligence Hub (Dashboard Executivo + Copilot B2B)

### 6.1 Dashboard Executivo (`/client/dashboard` melhorado)
- KPIs: consumo total, evolucao mensal, top produtos, ROI estimado
- Graficos recharts integrados
- Alertas inteligentes (subutilizacao, renovacao proxima, oportunidades)

### 6.2 Copilot B2B (upgrade do Assistente IA)
- Contexto enriquecido: contrato, faturacao, historico de tickets, encomendas
- Capacidades: resumo da relacao comercial, sugestoes de upgrade/downgrade, rascunho de pedidos
- Usa edge function `ai-copilot` com contexto expandido
- Reutiliza a pagina `/client/assistant` existente com prompt system melhorado

---

## Fase 7 -- Navegacao e Layout Atualizado

### 7.1 `ClientLayout.tsx`
- Menu expandido com seccoes condicionais baseadas em `useClientPermissions`:
  - Dashboard, Catalogo, Carrinho, Encomendas (todos)
  - Faturas, Financeiro (admin/financeiro)
  - Aprovacoes (admin, com badge de contagem)
  - Contratos (admin/financeiro)
  - Suporte (todos)
  - Equipa (admin)
  - Assistente IA (todos)

---

## Resumo Tecnico de Ficheiros

| Acao | Ficheiro |
|------|----------|
| Criar | `supabase/migrations/xxx_b2b_portal_v2.sql` (roles, approvals, contracts, tickets) |
| Criar | `src/hooks/client-portal/useClientPermissions.ts` |
| Criar | `src/hooks/client-portal/useClientApprovals.ts` |
| Criar | `src/hooks/client-portal/useClientInvoices.ts` |
| Criar | `src/hooks/client-portal/useClientContracts.ts` |
| Criar | `src/hooks/client-portal/useClientTickets.ts` |
| Criar | `src/pages/client/ClientTeamPage.tsx` |
| Criar | `src/pages/client/ClientApprovalsPage.tsx` |
| Criar | `src/pages/client/ClientInvoicesPage.tsx` |
| Criar | `src/pages/client/ClientFinancialPage.tsx` |
| Criar | `src/pages/client/ClientContractsPage.tsx` |
| Criar | `src/pages/client/ClientSupportPage.tsx` |
| Criar | `src/pages/client/ClientTicketDetailPage.tsx` |
| Editar | `src/components/client-portal/ClientLayout.tsx` (menu expandido) |
| Editar | `src/pages/client/ClientDashboardPage.tsx` (KPIs executivos) |
| Editar | `src/pages/client/ClientCheckoutPage.tsx` (fluxo de aprovacao) |
| Editar | `src/App.tsx` (novas rotas) |

### Abordagem de implementacao
Implementar por fases, comecando pela Fase 1 (roles e permissoes) pois todas as outras fases dependem deste sistema de controlo de acesso. Cada fase e funcional de forma independente.
