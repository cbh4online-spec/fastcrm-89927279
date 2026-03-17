

## Plano: Command Center mais abrangente + Metas via conversa IA

### Problema
1. O chat "Pergunte algo" apenas responde a queries de pipeline/deals — não cobre brief executivo, CEO copilot, revenue flight control nem permite definir metas por conversa
2. Para definir metas, o utilizador tem de usar o sheet de formulário (⚙️ Metas) — não pode simplesmente dizer "a minha meta de receita esta semana é 5000€"

### Solução

**1. Expandir sugestões e placeholders do Command Center** (`AIQuestionBox.tsx`)
- Adicionar placeholders que cobrem as áreas estratégicas: "Gera um brief executivo", "Como está a saúde do pipeline?", "Qual o risco de churn esta semana?"
- Adicionar chips de sugestão rápida para: Brief Executivo, Revenue Radar, CEO Copilot, Flight Control
- Quando não há conversa activa, mostrar grid de atalhos agrupados por categoria (Estratégia, Revenue, Operações)

**2. Novos slash commands** (`useSlashCommands.ts`)
- `/ceo` → invoca CEO Copilot summary (redireciona ask-fastcrm com intent "ceo copilot executive summary")
- `/revenue` → invoca Revenue Radar summary
- `/flight` → invoca Revenue Flight Control status
- `/metas` → mostra metas actuais da semana e permite alterá-las via conversa

**3. Intent de metas conversacional** (`ask-fastcrm` edge function)
- Detectar intenções de definição de metas no texto: "meta de receita 5000", "quero fechar 3 deals", "objetivo: 10 reuniões"
- Extrair via IA: `metric_type` + `target_value`
- Chamar upsert em `performance_targets` directamente a partir da edge function
- Responder com confirmação: "Meta de receita semanal definida: 5.000€ ✅"

**4. Enriquecer respostas do chat com navegação contextual** (`AIQuestionBox.tsx`)
- Nas sugestões de follow-up, incluir links directos: "Ver Brief completo →", "Abrir Revenue Radar →", "Ajustar metas →"
- Após definir metas via chat, sugerir: "Gerar brief com base nas novas metas", "Ver progresso actual"

### Ficheiros a editar
- `src/components/command-center/AIQuestionBox.tsx` — placeholders, chips estratégicos, sugestões expandidas
- `src/hooks/useSlashCommands.ts` — novos comandos `/ceo`, `/revenue`, `/flight`, `/metas`
- `supabase/functions/ask-fastcrm/index.ts` — detectar intent de metas, fazer upsert em `performance_targets`, responder com confirmação
- `src/components/command-center/QuickCommandGrid.tsx` — adicionar novos comandos ao grid

### Sem alterações de base de dados
Usa a tabela `performance_targets` existente para guardar metas definidas via conversa.

