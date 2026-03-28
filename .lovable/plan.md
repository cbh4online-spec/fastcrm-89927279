

# B2B Portal — Backoffice Completo e Portal Premium

## Visão Geral

Duas frentes paralelas: um **dashboard admin potente** para gestão dos utilizadores do portal, e um **redesign premium do portal do cliente** com personalização por marca e widgets interativos.

---

## Parte 1 — Backoffice Admin (Vista Interna)

### Dashboard de Analytics de Utilizadores

Expandir a página `ClientUsersPage` com um dashboard completo:

- **KPIs expandidos**: Utilizadores activos/inativos, último login, sessões esta semana, taxa de activação (convites → activos)
- **Gráfico de actividade**: Logins por dia/semana nos últimos 30 dias (Recharts AreaChart)
- **Tabela de últimos logins**: Utilizador, hora, páginas visitadas, duração da sessão
- **Alertas de inactividade**: Clientes sem login há 14+ dias, destacados a vermelho

Dados extraídos das tabelas `client_users` (campo `last_login_at` se existir, ou `activity_logs` com eventos B2B).

### Gestão Avançada de Clientes

Adicionar acções directas na lista de clientes:

- **Bloquear/Desbloquear**: Toggle de status `active` ↔ `suspended`
- **Reset Password**: Chamar edge function `create-client-auth-user` com novas credenciais
- **Editar Permissões**: Dialog para alterar role (`client_admin`, `client_financial`, `client_operational`, `client_viewer`)
- **Histórico de Acções**: Timeline de actividade do cliente (encomendas, logins, alterações) via `activity_logs`

### Visão Comercial

Nova secção com insights de negócio:

- **Ranking de clientes**: Top 10 por volume de encomendas, valor total, frequência
- **Volume por cliente**: Gráfico de barras horizontal com os maiores compradores
- **Alertas comerciais**: Clientes com queda de volume >30%, clientes sem encomenda há 30+ dias
- **Métricas de conversão**: Taxa catálogo→carrinho→encomenda

### Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/pages/ClientUsersPage.tsx` | **Editar** — Adicionar tabs: Visão Geral, Clientes, Comercial |
| `src/hooks/useClientAnalytics.ts` | **Criar** — Queries para analytics de portal |
| `src/components/client-users/ClientAnalyticsDashboard.tsx` | **Criar** — Dashboard com gráficos |
| `src/components/client-users/ClientCommercialInsights.tsx` | **Criar** — Rankings e alertas |
| `src/components/client-users/ClientUsersList.tsx` | **Editar** — Adicionar acções de gestão |
| `src/components/client-users/ClientActivityTimeline.tsx` | **Criar** — Timeline de actividade |

---

## Parte 2 — Portal do Cliente (Vista Externa)

### Redesign Premium do Dashboard

Transformar o `ClientDashboardPage` com estética sofisticada:

- **Cards com gradientes**: KPIs com fundo gradient (ex: `from-blue-500/10 to-blue-600/5`), bordas subtis, sombras `shadow-lg`
- **Animações de entrada**: `animate-fade-in` com delay escalonado por card (stagger)
- **Gráficos animados**: Transições suaves no BarChart, tooltips estilizados
- **Layout premium**: Mais espaçamento, tipografia hierárquica, ícones com fundo circular colorido
- **Quick Actions redesenhados**: Cards com hover elevado, gradientes subtis, iconografia premium

### Personalização por Marca (Workspace Branding)

Extender o sistema de branding existente na `ClientLayout`:

- **Cores dinâmicas**: Ler `primary_color` do workspace e aplicar como CSS variables no portal
- **Logo em contexto**: Logo do workspace no header, footer e páginas de loading
- **Tema adaptativo**: Se o workspace tem cores definidas, aplicá-las nos botões, badges e acentos

Usar dados já existentes na tabela `workspaces` (`logo_url`, `primary_color`).

### Widgets Interativos

- **Notificações em tempo real**: Badge pulsante no header com novas mensagens/status de encomenda
- **Atalhos inteligentes**: Se o carrinho tem itens, mostrar CTA destacado; se há encomendas pendentes, mostrar status card
- **Gráfico de evolução animado**: AreaChart com gradient fill e animação de reveal
- **Reorder rápido**: Widget "Última Encomenda → Repetir" com um clique

### Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/pages/client/ClientDashboardPage.tsx` | **Editar** — Redesign completo com visual premium |
| `src/components/client-portal/ClientLayout.tsx` | **Editar** — Theming dinâmico por workspace |
| `src/components/client-portal/ClientNotificationBadge.tsx` | **Criar** — Badge de notificações real-time |
| `src/components/client-portal/QuickReorderWidget.tsx` | **Criar** — Widget de re-encomenda rápida |

---

## Detalhe Técnico

```text
Backoffice Analytics Query:
  SELECT cu.id, cu.name, cu.email, cu.status, cu.last_login_at,
         count(on.id) as total_orders,
         sum(on.total_gross) as total_value
  FROM client_users cu
  LEFT JOIN order_notes on ON on.client_user_id = cu.id
  WHERE cu.workspace_id = ?
  GROUP BY cu.id
  ORDER BY total_value DESC

Portal Theming:
  // Na ClientLayout, aplicar CSS variables:
  document.documentElement.style.setProperty('--portal-primary', workspace.primary_color);
  // Usar var(--portal-primary) nos componentes do portal
```

Total: ~10 ficheiros, 4 novos componentes, 2 novos hooks.

