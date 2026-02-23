

# Sistema de Auditoria Global - Todas as Accoes de Todos os Utilizadores

## Problema

Actualmente, os logs de auditoria so capturam accoes do Super Admin (12 tipos de accao). O objectivo e registar TODAS as operacoes de TODOS os utilizadores em TODOS os modulos: criar lead, editar contacto, apagar oportunidade, enviar mensagem, etc.

Adicionar chamadas manuais `log_admin_action` a cada um dos 200+ hooks e componentes nao e viavel. A solucao correcta e implementar **triggers de auditoria a nivel da base de dados** que capturam automaticamente todas as operacoes.

## Arquitectura da Solucao

A abordagem usa triggers PostgreSQL que interceptam INSERT, UPDATE e DELETE em todas as tabelas relevantes, registando automaticamente quem fez o que, quando, e com que dados -- sem alterar nenhum codigo frontend.

```text
[Utilizador faz accao no UI]
         |
         v
[Hook faz INSERT/UPDATE/DELETE via Supabase client]
         |
         v
[PostgreSQL Trigger dispara automaticamente]
         |
         v
[Registo escrito na tabela activity_logs]
         |
         v
[UI de Logs mostra tudo filtrado por workspace/modulo/user]
```

## Fase 1: Base de Dados (Migracao SQL)

### 1.1 Nova tabela `activity_logs`

Tabela separada de `admin_audit_logs` (que continua para accoes Super Admin):

- `id` (uuid, PK)
- `workspace_id` (uuid, FK workspaces)
- `user_id` (uuid, referencia auth.users -- quem fez a accao)
- `table_name` (text -- ex: "leads", "contacts", "opportunities")
- `record_id` (uuid -- ID do registo afectado)
- `action` (text -- "INSERT", "UPDATE", "DELETE")
- `old_data` (jsonb -- dados antes da alteracao, para UPDATE/DELETE)
- `new_data` (jsonb -- dados apos a alteracao, para INSERT/UPDATE)
- `changed_fields` (text[] -- lista de campos alterados, so para UPDATE)
- `module` (text -- modulo calculado automaticamente: "CRM", "Inbox", "Loja", etc.)
- `created_at` (timestamptz, default now())

### 1.2 Funcao trigger generica

```text
audit_trigger_function():
  - Captura auth.uid() como user_id
  - Captura workspace_id do registo (NEW ou OLD)
  - Calcula o modulo baseado no nome da tabela
  - Para UPDATE: calcula changed_fields comparando OLD vs NEW
  - Remove campos sensiveis (password_hash, tokens, etc.)
  - Insere na tabela activity_logs
```

### 1.3 Mapeamento tabela -> modulo

| Tabelas | Modulo |
|---|---|
| leads | CRM - Leads |
| contacts | CRM - Contactos |
| companies | CRM - Empresas |
| opportunities, pipeline_stages | CRM - Oportunidades |
| tasks | Produtividade - Tarefas |
| meetings, calendar_events | Agenda |
| conversations, messages | Inbox |
| products, product_categories | Produtos |
| invoices, invoice_items | Facturacao |
| order_notes, order_note_items | Notas de Encomenda |
| proposals, proposal_items | Propostas |
| email_campaigns, email_templates | Marketing - Email |
| automations, automation_rules | Automacoes |
| workflows, workflow_executions | Workflows |
| bio_pages, bio_blocks | Bio Pages |
| store_orders, store_products | Loja Online |
| c2c_listings, c2c_offers | Marketplace C2C |
| community_channels, community_posts | Comunidade |
| ai_personas, knowledge_bases | IA - Motor Conversacional |
| ai_agents | IA - Agentes |
| documents, document_processing_jobs | Document Intelligence |
| funnels, funnel_steps | Funis |
| subscription_plans, subscriptions | Subscricoes |
| workspace_members, workspace_settings | Workspace Config |
| custom_fields, managed_fields | Configuracao |

### 1.4 Aplicar triggers a todas as tabelas

Cada tabela recebe:
```text
CREATE TRIGGER audit_[tabela]
AFTER INSERT OR UPDATE OR DELETE ON public.[tabela]
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 1.5 Politicas RLS em `activity_logs`

- Super Admins: veem todos os logs (via `is_super_admin()`)
- Membros do workspace: veem logs do seu proprio workspace
- Indices em `workspace_id`, `created_at`, `table_name`, `user_id` para performance

### 1.6 Retencao de dados

- Politica de retencao automatica: apagar logs com mais de 90 dias via funcao agendada (cron)
- Indice parcial em `created_at` para queries de periodo

## Fase 2: Interface de Visualizacao

### 2.1 Novo componente `ActivityLogsSection.tsx`

Painel completo de logs acessivel tanto no Super Admin como no dashboard de cada workspace:

**Filtros disponveis:**
- Por modulo (dropdown com todos os modulos mapeados)
- Por accao (INSERT/UPDATE/DELETE)
- Por utilizador (dropdown com membros do workspace)
- Por tabela especifica
- Por periodo (data inicio / data fim)
- Pesquisa livre (no record_id ou campos alterados)

**Tabela de resultados:**
- Data/hora
- Utilizador (nome do perfil, nao UUID)
- Modulo (badge colorido)
- Accao (INSERT verde, UPDATE amarelo, DELETE vermelho)
- Tabela + Record ID
- Campos alterados (para UPDATE)
- Botao de detalhe (mostra old_data vs new_data em diff visual)

**Dialog de detalhe:**
- Comparacao lado-a-lado old_data vs new_data
- Campos alterados destacados a cores
- Link para o registo (se ainda existir)

### 2.2 Integrar no Super Admin

- Adicionar nova opcao "Activity Logs" no `SuperAdminSidebar` (separada dos "Audit Logs" existentes)
- Ou substituir a seccao actual de Logs por uma com 2 tabs: "Admin Logs" + "Activity Logs"

### 2.3 Hook `useActivityLogs`

- Query paginada a `activity_logs` com filtros
- Join com `profiles` para mostrar nomes
- Suporte a export CSV

## Fase 3: Accesso por Workspace (opcional futuro)

- Os admins/owners de cada workspace podem ver os activity logs do seu workspace no dashboard
- Componente reutilizavel do Super Admin

## Ficheiros a criar/modificar

| Ficheiro | Accao |
|---|---|
| **Nova migracao SQL** | Criar tabela `activity_logs`, funcao trigger, aplicar triggers a ~30 tabelas, indices, RLS |
| `src/hooks/useActivityLogs.ts` | **Novo** - Hook de query paginada com filtros |
| `src/components/super-admin/ActivityLogsSection.tsx` | **Novo** - UI completa com tabela, filtros, dialog de detalhe |
| `src/components/super-admin/SuperAdminSidebar.tsx` | Adicionar item "Activity Logs" |
| `src/components/super-admin/index.ts` | Exportar novo componente |
| `src/pages/SuperAdmin.tsx` | Renderizar `ActivityLogsSection` no case "activity-logs" |

## Vantagens desta abordagem

1. **Zero alteracoes no codigo existente** - os triggers capturam tudo a nivel da BD
2. **Cobertura total** - qualquer operacao (mesmo via API directa) e registada
3. **Performance** - triggers sao nativos do PostgreSQL, executam no mesmo transaction
4. **Manutencao facil** - adicionar novo modulo = adicionar 1 trigger
5. **Consistencia** - impossivel "esquecer" de logar uma accao

## Estimativa

- Migracao SQL: ~200 linhas (funcao + triggers + tabela + RLS)
- Hook: ~80 linhas
- UI ActivityLogsSection: ~350 linhas
- Sidebar + routing: ~10 linhas

