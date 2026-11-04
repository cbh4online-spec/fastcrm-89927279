# Business Growth Intelligence 2.1 — Fase Zero (auditoria) e plano por etapas

O documento pede que a primeira execução seja apenas auditoria. Esta é a proposta; nada é alterado até aprovar cada etapa.

## Matriz da auditoria (estado atual verificado)

| Funcionalidade | Onde já existe | Estado | Reutilizar? | Alteração necessária | Risco |
|---|---|---|---|---|---|
| Dashboard executivo | Página Dashboard Executivo (`ExecutiveCommandDashboard`, 610 linhas, `useExecutiveDashboard`) | Existe, em "Estratégia IA" | Sim, como base | Tornar configurável por workspace | Médio |
| KPIs | Página KPIs (`KPIsModule`, `useKPIs`: grelha, KPIs por setor, previsões, IA) | Existe | Sim | Ligar ao catálogo de indicadores | Baixo |
| Objetivos | Centro de Objetivos (`business_objectives`, `objective_metrics`, `objective_plans`, recálculo por função) + `useSalesGoals`, `usePerformanceGoals`, `useAgentGoals`, `useGoalsVsResults` | Existe, mas fragmentado (4+ sistemas de metas) | Sim — `business_objectives` como sistema único | Unificar leitura; não criar outro | Médio |
| Previsões | Relatórios › Previsões (`useForecastsReports`, cálculo no navegador sobre oportunidades/contactos) | Existe | Parcial | Passar agregação para o servidor | Médio (desempenho) |
| Crescimento | Relatórios › Crescimento (`GrowthInsightsModule`) | Existe | Sim | Nenhuma no início | Baixo |
| Faturação/recebimentos | `useFinancialKPIs`, `useDashboardInvoices` (paginado), regra `amount_paid` | Existe | Sim, obrigatório | Nenhuma | Baixo |
| Funil/marketing | `useFunnelConversionKPIs`, oportunidades, leads | Existe | Sim | Ligação campanha→venda depois | Médio |
| Formação | Jornada do Aluno (inscrições, finanças Fase D) | Existe | Sim | Template "Formação" lê daqui | Baixo |
| Multi-workspace / permissões | `workspace_id` + RLS + capabilities | Existe | Sim, obrigatório | Nenhuma | — |
| IA com controlo de custo | `ai_usage_logs`, Cost Guard, `ai_settings` | Existe | Sim | Limites por workspace já suportados | Baixo |

Problemas encontrados: metas duplicadas em vários sistemas; previsões calculadas no navegador com leituras completas; três dashboards (Executivo, KPIs, Relatórios) com indicadores sobrepostos. Não há catálogo central de indicadores nem templates por setor.

Créditos: não tenho acesso a uma estimativa fiável por etapa; não invento números.

## Decisão proposta
Não criar módulo novo. Evoluir o que existe: um catálogo de indicadores com fórmulas fixas em código/SQL (sem fórmulas livres executáveis), templates de setor como configuração, e o Dashboard Executivo como ecrã único do BGI.

## Etapas (uma por pedido)

1. **Catálogo de indicadores + templates** — ficheiro de configuração com ~20 indicadores (id, nome, unidade, fonte, agregação, período) e 6 templates (comércio, formação, SaaS, serviços, imobiliário, personalizado). Escolha de template por workspace guardada nas definições existentes. Sem tabelas novas.
2. **Função de agregação no servidor** — uma única função que devolve os valores do catálogo por workspace e período (faturação via `amount_paid`, sem dupla contagem; faturado ≠ recebido ≠ oportunidades ≠ previsão). Índices só se a medição mostrar lentidão.
3. **Dashboard Executivo configurável** — mostra apenas os indicadores do template; meta anual, % atingida, valor em falta, homólogo, evolução mensal. Carregamento sob pedido.
4. **Objetivos unificados** — metas lidas de `business_objectives`; restantes sistemas passam a ler daí. Cenários conservador/base/otimista com média móvel simples e hipóteses visíveis.
5. **Growth Intelligence AI** — opcional por workspace, só por clique, com resumo agregado (nunca dados brutos), limite mensal e registo em `ai_usage_logs`.
6. **Alertas e funil campanha→venda** — depois das anteriores validadas.

## Critérios de aceitação da etapa 1
- Um workspace de formação não vê MRR; um SaaS não vê ocupação de turmas.
- Nenhum cálculo usa IA.
- Workspaces existentes sem template ficam com o atual comportamento.

## Pontos por validar
- Quer o BGI no Dashboard Executivo atual ou numa nova entrada de menu "Crescimento"?
- A PHARLISS usa os templates Comércio + Formação?
