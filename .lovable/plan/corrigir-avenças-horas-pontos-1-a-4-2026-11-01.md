# Corrigir Avenças & Horas (pontos 1 a 4)

## O que muda para o utilizador
1. **Ligar/desligar projeto ou ticket** — ao ligar, todo o tempo já registado nesse projeto/ticket passa a contar para a avença; ao desligar, deixa de contar. Antes de confirmar, aparece um aviso com quantas horas vão entrar ou sair.
2. **Mensalidade só nos meses ativos** — meses antes do início, depois da data de fim, ou com a avença pausada/terminada mostram "Sem mensalidade neste mês" e o total a faturar fica só com as horas extra (se houver).
3. **Empresa sempre do mesmo espaço de trabalho** — a base de dados recusa guardar uma avença com uma empresa de outro espaço.
4. **Formulário no telemóvel** — os campos Mensalidade / Horas / €/hora extra ficam alinhados (empilhados no telemóvel, lado a lado no computador).

## Detalhes técnicos
- Migração:
  - Função/trigger `AFTER UPDATE OF retainer_id` em `implementation_projects` e `support_tickets` que atualiza `retainer_id` nas respetivas entradas de tempo (todas as do projeto/ticket). Corre como SECURITY DEFINER com `search_path=public`, mantendo o guard de workspace existente.
  - Trigger de validação em `service_retainers` (INSERT/UPDATE de `company_id`/`workspace_id`): `company_id` tem de pertencer ao mesmo `workspace_id`.
- `src/lib/retainers/retainerUsage.ts`: nova função `isRetainerBillableMonth(retainer, monthKey)` (status ativo, mês ≥ início, mês ≤ fim). `RetainerKpis` recebe a mensalidade efetiva do mês.
- `RetainerDetailPage`: diálogo de confirmação ao ligar/desligar, com as horas existentes (consulta por projeto/ticket); invalidar a cache após ligar.
- `RetainerFormDialog`: grelha `grid-cols-1 sm:grid-cols-3`.
- Testes novos em `src/test/retainers/`: meses fora do período/pausados sem mensalidade; meses ativos com mensalidade.

## Critérios de aceitação
- Ligar um projeto com 3h antigas → o extrato do mês dessas horas mostra-as; desligar → desaparecem.
- Avença com início em dezembro → novembro mostra 0 € de mensalidade.
- Guardar avença com empresa de outro espaço → erro.
- Formulário a 390px sem campos desalinhados.

## Fora deste plano
- Ponto 5 (rascunho de fatura das horas extra) — mexe na faturação, fica para decisão posterior.
