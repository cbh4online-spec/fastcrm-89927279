

# Centro de Agendamento — Funcionalidades Premium Únicas

## O que já existe
- Calendário com dia/semana/mês + heatmap + lista
- Reuniões com kanban, preparação IA, gravação e transcrição
- Serviços com categorias, preços e filtros
- Disponibilidade com slots, exceções e timezones
- Links de agendamento público com fluxo 3 passos, multi-idioma e captura de leads
- Sincronização Google Calendar

## O que falta para ser único no mercado

### 1. Dashboard de Analytics de Agendamento (nova tab "Analytics")
- **Taxa de conversão** dos links de booking (visitantes vs agendamentos)
- **No-show rate** por cliente/serviço/dia da semana
- **Horários mais procurados** — heatmap de popularidade por hora/dia
- **Receita gerada** via agendamentos (cruzando com serviços pagos)
- **Tempo médio de antecedência** (quando marcam vs quando acontece)
- **Comparação mensal** com tendências

### 2. Lista de Espera (Waitlist)
- Quando um slot está cheio, o cliente entra numa waitlist automática
- Notificação automática quando abre vaga (cancelamento)
- Prioridade configurável (primeiro a chegar, clientes VIP, etc.)
- Visível no dashboard com contagem por serviço

### 3. Eventos Recorrentes Inteligentes
- Criar eventos com regra de recorrência (diário, semanal, mensal, custom)
- Editar "este evento" vs "todos os futuros"
- Visualização de série no calendário com ícone de recorrência
- Exceções por data (feriados auto-detetados)

### 4. Round-Robin Multi-Anfitrião
- Atribuição automática de reuniões entre membros da equipa
- Algoritmos: round-robin, por disponibilidade, por carga equilibrada
- Configurável por link de booking
- Dashboard de distribuição por membro

### 5. Widget Embeddable + QR Code
- Código embed (`<iframe>` ou `<script>`) para incorporar booking em sites externos
- Gerador de QR Code para cada link de agendamento
- Preview do widget dentro do hub
- Personalização de cores e branding do widget

### 6. Lembretes Inteligentes e Follow-ups
- Lembretes automáticos pré-reunião (email/WhatsApp) configuráveis (24h, 1h, 15min)
- Follow-up automático pós-reunião com template personalizável
- Confirmação obrigatória X horas antes (reduz no-shows)
- Integração com o módulo de inbox para envio

### 7. Check-in e Feedback
- Link de check-in enviado ao participante antes da reunião
- Formulário de feedback pós-reunião (NPS + comentário)
- Resultados visíveis no card da reunião e no analytics
- Score de satisfação por serviço/anfitrião

### 8. Mapa de Ocupação Visual
- Vista semanal tipo "resource view" (linhas = calendários/anfitriões, colunas = horas)
- Indicador visual de ocupação (verde/amarelo/vermelho)
- Útil para equipas verem a carga de todos de relance

---

## Ficheiros a criar/modificar

| Ficheiro | Ação |
|---|---|
| `src/components/scheduling/SchedulingAnalytics.tsx` | **Novo** — Dashboard analytics com KPIs e gráficos |
| `src/components/scheduling/WaitlistPanel.tsx` | **Novo** — Gestão de lista de espera |
| `src/components/scheduling/EmbedWidgetGenerator.tsx` | **Novo** — Gerador de embed + QR code |
| `src/components/scheduling/OccupancyMapView.tsx` | **Novo** — Resource/ocupação visual |
| `src/components/scheduling/SchedulingHub.tsx` | Adicionar tab Analytics + integrar novos componentes |
| `src/components/calendars/CalendarEventModal.tsx` | Adicionar recorrência |
| `src/components/scheduling/BookingPagesTab.tsx` | Adicionar QR code, embed code, e configuração round-robin |
| `src/hooks/useSchedulingAnalytics.ts` | **Novo** — Queries para métricas de agendamento |

## Prioridade de implementação
1. **Analytics** — impacto visual imediato, diferenciação clara
2. **QR Code + Embed** — funcionalidade prática rara em CRMs
3. **Lembretes + Follow-up** — redução de no-shows, valor tangível
4. **Waitlist** — funcionalidade premium que poucos têm
5. **Ocupação visual** — diferenciador para equipas
6. **Recorrência** — expectável mas complexo
7. **Round-Robin** — para equipas maiores
8. **Check-in/Feedback** — complementar

