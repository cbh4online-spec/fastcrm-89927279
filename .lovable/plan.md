

# Enriquecer Módulo de Eventos — Plano Completo

O módulo atual é funcional mas básico: lista de cards simples, formulário de criação num dialog, e página de detalhe com RSVPs em lista. Vamos transformá-lo numa experiência de autoridade.

---

## 1. Página de Listagem — Visual e Informativa

**Atual**: Grid de cards simples sem métricas, sem pesquisa, sem imagens.

**Proposta**:
- **Barra de KPIs no topo**: Total de eventos, RSVPs confirmados, próximo evento (countdown), receita total
- **Barra de pesquisa + filtros**: Por categoria, data, status — com visual refinado
- **Cards visuais**: Cover image (se existir), barra de progresso de capacidade (ex: 15/30 lugares), cor da categoria como borda lateral, badge de preço, avatar do anfitrião
- **Vista alternativa**: Toggle entre grid e lista compacta

## 2. Página de Detalhe — Centro de Operações do Evento

**Atual**: Info cards + lista de RSVPs + detalhes básicos.

**Proposta**:
- **Hero com cover image** e overlay com título, data, local
- **Donut chart de RSVPs**: Convidados vs Confirmados vs Recusados vs Presentes
- **Check-in tab**: Botão rápido para marcar presença, com pesquisa
- **Timeline de atividade**: Quem confirmou, quem foi convidado, quando
- **Ações rápidas**: Duplicar evento, exportar lista de convidados (CSV), partilhar link
- **Bulk invite**: Selecionar múltiplos contactos existentes do CRM para convidar de uma vez
- **Edição inline** dos campos do evento diretamente na página de detalhe

## 3. Formulário de Criação/Edição — Mais Rico

**Atual**: Dialog com campos básicos.

**Proposta**:
- **Upload de cover image** com preview (usando Storage)
- **Campos adicionais**: Agenda/programa, oradores, URL de registo externo
- **Preview de partilha social**: Como o evento aparecerá quando partilhado
- **Eventos recorrentes**: Toggle para criar séries (semanal, mensal)
- **Templates**: Guardar e reutilizar configurações de eventos frequentes

## 4. Widgets no Dashboard

- **Banner "Próximo Evento"**: Com countdown, botão de check-in rápido
- **Alertas de RSVPs pendentes**: Quantos convites sem resposta
- **Quick-invite**: Convidar diretamente do dashboard

---

## Implementação Técnica

### Base de Dados
- Criar bucket `event-covers` no Storage para imagens
- Adicionar colunas: `agenda jsonb`, `speakers jsonb`, `registration_url text`, `recurring_rule text` à tabela `community_events`
- Adicionar coluna `checked_in_at timestamptz` à tabela `event_rsvps`

### Componentes Novos
- `EventStatsBar.tsx` — KPIs do topo da listagem
- `EventVisualCard.tsx` — Card rico com imagem e progress bar
- `EventHero.tsx` — Hero da página de detalhe
- `RSVPDonutChart.tsx` — Gráfico de distribuição de RSVPs
- `EventCheckInTab.tsx` — Tab de check-in com pesquisa
- `EventActivityTimeline.tsx` — Timeline de atividade
- `BulkInviteDialog.tsx` — Convidar múltiplos contactos
- `EventCoverUpload.tsx` — Upload de imagem de capa

### Ficheiros Editados
- `EventsManagementPage.tsx` — Adicionar stats bar, filtros, cards visuais
- `EventDetailPage.tsx` — Adicionar hero, chart, check-in, timeline, ações
- `CreateEventDialog.tsx` — Adicionar cover upload, campos extra
- `useEvents.ts` — Adicionar queries para stats agregados

### Ordem de Execução
1. Migração DB (novas colunas + storage bucket)
2. Página de listagem enriquecida
3. Formulário de criação melhorado
4. Página de detalhe completa
5. Widgets de dashboard

