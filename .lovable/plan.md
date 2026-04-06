## Plano de Evolução do Helpdesk

### Fase 1 — Histórico Completo do Cliente (sidebar do ticket)
- **Tickets anteriores**: Lista dos últimos tickets do mesmo contacto/empresa com estado e data
- **Timeline CRM**: Últimas interações do contacto (deals, notas, atividades)
- **CSAT histórico**: Média de satisfação do contacto e tendência
- **Impacto**: Componente `TicketClientHistory.tsx` no sidebar, reutiliza dados existentes

### Fase 2 — Métricas e SLA Avançados (dashboard melhorado)
- **KPIs**: MTTR (tempo médio resolução), FRT (primeira resposta), taxa de reabertura, volume por dia/hora
- **Heatmap de carga**: Visualização de volume de tickets por hora/dia da semana
- **SLA compliance por agente/departamento**: Breakdown detalhado
- **Exportação**: CSV/PDF dos relatórios
- **Impacto**: Evolução do `HelpdeskDashboard.tsx` existente

### Fase 3 — Automações e Workflows
- **Auto-assign**: Atribuição automática por departamento/tipo de ticket
- **Escalação SLA**: Notificação automática quando SLA está a 80% do prazo
- **Auto-close**: Fecho automático após X dias sem resposta do cliente
- **Templates contextuais**: Sugestão de respostas baseadas no tipo de ticket
- **Impacto**: Evolução da tabela `support_ticket_automations` + edge function para processamento

### Fase 4 — Portal do Cliente (público)
- **Portal web**: Página pública onde clientes podem criar tickets, ver estado e responder
- **Autenticação leve**: Login por email/código sem precisar de conta interna
- **Base de conhecimento**: Artigos de ajuda pesquisáveis integrados
- **Impacto**: Novas rotas `/portal/*`, edge functions para auth de cliente, RLS dedicado

---

**Ordem sugerida**: Fase 1 → 2 → 3 → 4 (cada fase entrega valor independente)

**Nota**: A Fase 4 (Portal) é a mais complexa e requer novo fluxo de autenticação separado. Sugiro começar pelas fases 1-3 que melhoram imediatamente a produtividade da equipa interna.