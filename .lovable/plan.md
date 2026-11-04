# Etapa 6 — Alertas e funil origem → venda (Crescimento)

## O que o utilizador vai ver
1. **Alertas no Crescimento**: uma secção «Alertas» no topo do painel com avisos do tipo:
   - Objetivo em risco (projeção abaixo de 90% do alvo a meio do período ou depois).
   - Queda forte de um indicador face ao período anterior (ex.: faturação −20%).
   - Saldo em aberto a subir (valor em dívida maior que o do período anterior).
   - Pipeline fraco (pipeline ponderado abaixo da meta de faturação restante).
   Cada alerta diz o indicador, o valor, a comparação e leva ao cartão ou objetivo respetivo. Pode ser dispensado até ao período seguinte.
2. **Funil origem → venda**: tabela por origem da lead (GHL, email, prospeção, Google, Instagram, registo, outro…) com: leads novas → convertidas em cliente → oportunidades → oportunidades ganhas → faturado (sem IVA) e taxa de conversão em cada passo. Ordenável, com o mesmo seletor de período do painel.
3. Gestores definem os limites dos alertas (percentagem de queda, margem de risco) em «Personalizar painel»; restantes membros só veem.

## Notas sobre os dados (verificado)
- As leads guardam apenas a **origem** (não há campanha/UTM). O funil será por origem; campanhas Meta concretas ficam para quando a Fase I (leads Meta) trouxer esse dado.
- Faturas e oportunidades já ligam a lead/contacto/empresa, o que permite seguir a lead até à venda.
- Sem envio de emails ou WhatsApp nesta etapa: os alertas aparecem no ecrã (e no sino de notificações apenas se confirmar).

## Detalhes técnicos
- Regras de alerta puras em `src/lib/bgi/alertRules.ts` (testadas), alimentadas pelos valores já devolvidos por `bgi_compute_indicators` e por `objectiveProgress.ts` — nenhum cálculo novo de números no cliente.
- Limites guardados em `workspace_bgi_settings` (nova coluna `alert_thresholds jsonb` com validação no servidor); dispensas em `bgi_alert_dismissals` (workspace, alert_key, period_key, user), RLS por workspace + GRANTs.
- Nova função SQL `bgi_funnel_by_source(_workspace_id, _period, _anchor)` SECURITY DEFINER, mesma verificação de pertença e módulo (fail-closed), janelas Europe/Lisbon, agregação num só pedido; origens normalizadas (ghl/ghl_sync/ghl_auto_sync → GHL; vazias → «Sem origem»).
- Componentes `BgiAlertsSection.tsx` e `BgiSourceFunnel.tsx` integrados em `BgiKpiGrid`/página; estados vazio, carregamento, erro e telemóvel (tabela com scroll horizontal).
- Testes: regras de alerta (limites concretos) e normalização de origens.
- Regra nova em `AGENTS.md` sobre alertas/funil usarem só os valores do servidor.

## Critérios de aceitação
- Com um objetivo abaixo do ritmo, aparece o alerta «Objetivo em risco».
- O faturado no funil, somado por todas as origens, não excede a faturação do cartão no mesmo período.
- Workspace sem o módulo não recebe dados (recusado no servidor).

## Por validar
- Quer que os alertas também vão para o sino de notificações (e, mais tarde, email)?
