

## Plano: Exportar Produtividade Diária e Semanal (PDF/CSV) para Briefings

### Objetivo
Adicionar botões de exportação PDF e CSV à página de Produtividade para preparar reuniões de briefing com dados de prioridades, reuniões e metas.

### Implementação

**1. Criar utilitário `src/utils/productivityExport.ts`**
- Função `exportProductivityPDF(mode: 'daily' | 'weekly', data)` usando jsPDF (já disponível no projeto)
  - **Modo diário**: Data do dia, Top 3 prioridades (status ✓/○), reuniões do dia (hora + título + contacto), metas diárias com progresso
  - **Modo semanal**: Semana (segunda-domingo), resumo de metas semanais, progresso global, lista de reuniões da semana
  - Header com título "Briefing Diário/Semanal — [data]" e nome do workspace
  - Secções separadas com linhas divisórias
- Função `exportProductivityCSV(mode, data)` usando papaparse (já disponível)

**2. Atualizar `src/components/productivity/ProductivityDashboard.tsx`**
- Adicionar dropdown "Exportar" na Toolbar (ao lado do botão Atualizar) com opções:
  - "Briefing Diário (PDF)"
  - "Briefing Semanal (PDF)"
  - "Dados Diários (CSV)"
  - "Dados Semanais (CSV)"
- Recolher dados necessários dos hooks existentes (`useProductivityCoach`, `useMeetings`) e passar ao utilitário

**3. Dados incluídos no export**
- **Diário**: prioridades de hoje + estado, reuniões de hoje (hora, título, contacto, categoria), metas diárias + progresso
- **Semanal**: todas as prioridades da semana, reuniões da semana, metas semanais + progresso, KPIs resumidos (prioridades concluídas, reuniões totais, metas atingidas)

### Ficheiros a criar/alterar
- `src/utils/productivityExport.ts` — novo (funções PDF e CSV)
- `src/components/productivity/ProductivityDashboard.tsx` — adicionar dropdown de exportação na toolbar

