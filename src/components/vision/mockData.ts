export const mockVisionProfile = {
  id: "mock-vision-1",
  title: "Faturar 100K€ até Dezembro 2026",
  objective: "Construir um negócio sustentável com receita recorrente de 100K€/ano através de consultoria e produtos digitais.",
  target_date: "2026-12-31",
  status: "active" as const,
  mode: "solo" as const,
  manifesto: `## O Meu Manifesto de Visão

Acredito que posso construir um negócio que impacta vidas e gera abundância.

### Os Meus Princípios
1. **Consistência supera intensidade** — Prefiro fazer pouco todos os dias do que muito esporadicamente.
2. **Vender é servir** — Cada venda é uma oportunidade de resolver um problema real.
3. **Dados guiam decisões** — Não sigo intuição cega, sigo métricas e feedback.

### O Que Não Negocio
- Saúde e família sempre em primeiro
- Ética em todas as negociações
- Qualidade sobre quantidade

### A Minha Identidade Futura
Sou um empresário confiante, disciplinado e generoso que cria valor genuíno no mercado.`,
  created_at: "2026-01-15T10:00:00Z",
};

export const mockBoardItems = [
  { id: "b1", type: "image", title: "Escritório dos sonhos", image_url: "", position_x: 0, position_y: 0, width: 200, height: 200, color: "#8B5CF6" },
  { id: "b2", type: "text", title: "100K€ em receita", content: "Meta anual de faturação", position_x: 220, position_y: 0, width: 180, height: 100, color: "#F59E0B" },
  { id: "b3", type: "text", title: "50 clientes ativos", content: "Base de clientes recorrentes", position_x: 0, position_y: 220, width: 180, height: 100, color: "#10B981" },
  { id: "b4", type: "text", title: "Equipa de 3 pessoas", content: "Crescer a equipa este ano", position_x: 220, position_y: 120, width: 180, height: 100, color: "#EC4899" },
];

export const mockSprints = [
  {
    id: "s1",
    title: "Sprint 1 — Fundação",
    goal: "Definir ICP, criar oferta core e landing page",
    start_date: "2026-03-01",
    end_date: "2026-03-14",
    status: "completed",
    metrics: { tasks_done: 12, tasks_total: 14, leads_generated: 8 },
    closed_at: "2026-03-14T18:00:00Z",
  },
  {
    id: "s2",
    title: "Sprint 2 — Primeiros Clientes",
    goal: "Fechar 3 clientes de consultoria e lançar funil de captação",
    start_date: "2026-03-15",
    end_date: "2026-03-28",
    status: "active",
    metrics: { tasks_done: 5, tasks_total: 10, leads_generated: 15 },
    closed_at: null,
  },
  {
    id: "s3",
    title: "Sprint 3 — Escala",
    goal: "Automatizar onboarding e lançar produto digital",
    start_date: "2026-03-29",
    end_date: "2026-04-11",
    status: "planned",
    metrics: { tasks_done: 0, tasks_total: 8, leads_generated: 0 },
    closed_at: null,
  },
];

export const mockDailyBriefings = [
  {
    id: "d1",
    date: "2026-03-10",
    energy_level: 8,
    focus_items: ["Finalizar proposta cliente X", "Gravar vídeo de vendas", "Rever métricas do funil"],
    blockers: ["Aguardar resposta do fornecedor"],
    intentions: ["Manter foco profundo até às 12h", "Não abrir redes sociais antes do almoço"],
    reflections: "Dia produtivo. Consegui fechar a proposta e o vídeo ficou melhor do que esperava.",
    duration_minutes: 45,
    status: "completed",
  },
  {
    id: "d2",
    date: "2026-03-09",
    energy_level: 6,
    focus_items: ["Preparar apresentação", "Follow-up com leads"],
    blockers: [],
    intentions: ["Começar o dia com exercício"],
    reflections: "Energia mais baixa mas cumpri o essencial.",
    duration_minutes: 35,
    status: "completed",
  },
];

export const mockWins = [
  { id: "w1", title: "Primeiro cliente de consultoria fechado!", description: "Contrato de 3 meses com empresa de tecnologia.", category: "revenue", impact_level: "high", date: "2026-03-08", celebrated: true },
  { id: "w2", title: "Funil com 15% de conversão", description: "Landing page a converter acima da média do mercado.", category: "marketing", impact_level: "medium", date: "2026-03-05", celebrated: true },
  { id: "w3", title: "Artigo viral no LinkedIn", description: "Post com 12K impressões e 200 leads.", category: "brand", impact_level: "high", date: "2026-03-02", celebrated: false },
  { id: "w4", title: "Rotina matinal de 30 dias consecutivos", description: "Consistência na rotina de briefing diário.", category: "habit", impact_level: "medium", date: "2026-02-28", celebrated: true },
];

export const mockDuoLink = {
  id: "duo1",
  invitee_email: "parceiro@exemplo.com",
  status: "pending" as const,
  created_at: "2026-03-08T10:00:00Z",
};
