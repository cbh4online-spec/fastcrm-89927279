# Crescimento (BGI 2.1) — Etapa 2: valores reais calculados no servidor

## Objetivo
Depois de ativar o módulo e escolher os modelos (Comércio + Formação + Serviços…), o ecrã «Crescimento» passa a mostrar os indicadores com valores reais do workspace: mês atual, mês anterior, mesmo mês do ano anterior e variação.

## O que o utilizador vai ver
- Cartões de KPI agrupados (Faturação, Comercial, Operação/Setor), com valor, variação vs mês anterior e vs ano anterior.
- Seletor de período: Este mês / Mês anterior / Trimestre / Ano (calendário de Lisboa).
- Indicadores sem dados suficientes mostram «Sem dados» (nunca 0 inventado); indicadores ainda não suportados mostram «Em breve».
- Distinção clara entre Faturado, Recebido e Previsão.

## Âmbito desta etapa (indicadores calculados)
- Núcleo: Faturação, Recebimentos (amount_paid), Em aberto, Clientes ativos, Leads novas, Conversão lead→cliente, Valor em pipeline, Previsão ponderada, Negócios concluídos.
- Comércio: Encomendas, Valor médio, Taxa de recompra, Margem bruta (só se houver custos).
- Formação: Inscrições, Ocupação de turmas, Receita por formação.
- Serviços: Horas faturáveis, Projetos ativos.
- SaaS e Imobiliário (MRR, ARR, Churn, Angariações, Comissões): ficam «Em breve» nesta etapa.

## Regras
- Só fórmulas da lista fechada do catálogo; nada de expressões livres nem IA.
- Notas de crédito subtraem, pró-formas e anulados excluídos (mesma regra do SAF-T).
- Recebimentos sempre por valor pago, nunca pelo estado da fatura.
- Acesso só para membros do workspace com o módulo ativo; falha fechada caso contrário.

## Detalhes técnicos
- Nova função SQL `bgi_compute_indicators(_workspace_id uuid, _period text, _anchor date)` SECURITY DEFINER, `search_path=public`: valida pertença (`get_user_workspace_ids` / super admin) e `check_module_access('growth-intelligence')`; devolve `jsonb` `{indicator_id: {current, previous, yoy, status}}` apenas para ids da whitelist pedidos.
- Janelas de período calculadas em `Europe/Lisbon`.
- Uma única chamada RPC por ecrã (sem fan-out por indicador); hook `useBgiIndicators(period)` com chave incluindo workspace e modelos.
- `src/lib/bgi/formatIndicator.ts` para formatação (EUR/percent/count/hours) e cálculo de variação, com testes.
- Componentes: `BgiKpiGrid` com `IXCard`, tokens semânticos, loading/vazio/erro.
- Testes: variação/formatação e mapeamento de formulas suportadas vs «Em breve».
- Validação: comparar Faturação e Recebimentos da PHARLISS com o dashboard financeiro existente para o mesmo mês.

## Próximas etapas (não incluídas)
3 Dashboard configurável · 4 Objetivos unificados · 5 IA de crescimento · 6 Alertas e funil campanha→venda.
