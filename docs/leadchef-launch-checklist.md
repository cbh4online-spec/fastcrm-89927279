# LeadChef — Checklist de lançamento

## Build & qualidade
- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` (se existir) sem erros críticos
- [ ] `npm run typecheck` (se existir) limpo
- [ ] Sem `console.log` espalhados (apenas `console.warn` defensivos nos hooks)
- [ ] Sem `TODO`/`FIXME` críticos nos ficheiros LeadChef
- [ ] Sem referências às marcas proibidas (Bimby, Vorwerk, Cookidoo) nos ficheiros LeadChef

## Segurança
- [ ] RLS activa em todas as tabelas `leadchef_*`
- [ ] Policies escopadas por `workspace_id`
- [ ] Sem policies `USING (true)` em tabelas operacionais
- [ ] Service role nunca exposta no frontend
- [ ] `.env` revisto, sem credenciais commitadas
- [ ] Secrets sensíveis configurados em runtime secrets

## Permissões
- [ ] Agente vê apenas os seus dados
- [ ] Líder vê visão agregada da equipa
- [ ] Admin vê tudo do workspace + permissões
- [ ] Acessos defensivos via `useLeadChefPermissions` + `<LeadChefPermissionGate />`

## Fluxos ponta a ponta
- [ ] Criar lead → ver em Hoje/Leads
- [ ] Mudar stage (new → talking → demo_scheduled → demo_done → proposal_decision → won)
- [ ] Marcar/reagendar/concluir demonstração
- [ ] Won sincroniza `leads.status = completed`
- [ ] Cliente aparece em `/clientes` após won
- [ ] Pós-venda cria compromisso e aparece no Hoje
- [ ] Pedir referência → aparece em `/referencias`
- [ ] Converter referência → cria lead + `converted_lead_id` preenchido
- [ ] Ficha Experiência Cliente: guarda jsonb e reabre correctamente
- [ ] Objetivos calculam dados reais e refletem no Dashboard
- [ ] Templates: render de variáveis sem quebrar; WhatsApp só por ação do utilizador

## Mobile
- [ ] Testado em 320, 375, 390, 430, 768px
- [ ] Bottom nav não cobre conteúdo
- [ ] Sheets/drawers cabem no ecrã
- [ ] Botões com área de toque ≥44px
- [ ] Filtros com scroll horizontal
- [ ] Texto longo quebra linha

## Estados
- [ ] Loading, erro, lista vazia, sem permissão tratados em todas as páginas
- [ ] Mensagens em português, simples e amigáveis (via `getLeadChefErrorMessage`)

## Performance
- [ ] Índices DB criados (`idx_leadchef_*`)
- [ ] Listas com `staleTime` adequado em React Query
- [ ] Páginas lazy-loaded em `LeadChefRoutes`
- [ ] Sem refetch excessivo

## Lançamento
- [ ] Migrations aplicadas em staging
- [ ] Backup feito antes de produção
- [ ] Defaults por workspace são idempotentes
- [ ] Testes com utilizadores piloto
- [ ] Plano de rollback definido
- [ ] Feature flag/visibilidade do menu definida (se aplicável)
