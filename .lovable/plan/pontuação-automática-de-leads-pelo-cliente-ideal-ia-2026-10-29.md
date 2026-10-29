# Pontuação automática de leads pelo cliente ideal (IA)

## Objetivo
Cada lead nova, incluindo as importadas, é pontuada de 0 a 100 em relação ao cliente ideal do espaço de trabalho. Recebe um resumo curto (1–2 frases) e fica destacada como «Vale uma ligação» quando tem 70 ou mais.

## Como funciona para o utilizador
- **Lista de Leads:** coluna «Encaixe» com a pontuação e um crachá «Ligar» (≥ 70). Há um filtro rápido «Vale uma ligação» e é possível ordenar pela pontuação.
- **Ficha da lead:** cartão com a pontuação, o resumo e os 2–3 motivos (ex.: «setor certo», «decisor», «sem telefone»). Tem o botão «Repontuar».
- **Alertas:** as leads novas com ≥ 70 aparecem no ecrã Alertas, no separador «Leads para ligar».
- **Cliente ideal:** usa a descrição que já existe nas definições do negócio (descrição, setores, dimensão, decisor, dores). Se estiver vazia, a lead fica «Sem pontuação» com um aviso e um link para preencher. Não se inventa pontuação.

## Fluxo
```text
lead criada (qualquer origem) -> fila de pontuação (1 por lead)
cada 2 min: processa até 20 leads -> IA -> guarda pontuação + resumo + motivos
```
- Importações grandes entram na mesma fila e são processadas aos poucos.
- Se faltarem créditos de IA ou houver bloqueio, a fila para e aparece um aviso ao dono. Retoma com o botão «Retomar».
- Se a IA estiver sobrecarregada, a fila tenta de novo na volta seguinte.

## Critérios de aceitação
- Uma lead nova criada à mão fica pontuada em menos de 3 minutos.
- Uma importação de 200 leads fica toda pontuada, sem duplicados, mesmo que a fila corra duas vezes ao mesmo tempo.
- Uma lead com pontuação 70 ou mais aparece com o crachá «Ligar» e nos Alertas.
- Um espaço sem cliente ideal definido não gasta créditos.
- Cada lead só vê a pontuação do seu próprio espaço de trabalho.

## Riscos
- Custo: cada lead gasta um pedido de IA. Importações de milhares de leads gastam créditos à mesma proporção.
- Leads com poucos dados (só nome e telefone) terão pontuações baixas e pouco fiáveis. O resumo indica «dados insuficientes».

## Detalhes técnicos
- Migração: em `leads`, adicionar `icp_summary text`, `icp_reasons jsonb`, `icp_scored_at timestamptz` e `call_worthy boolean GENERATED (icp_fit_score >= 70)`. Reutilizar a coluna existente `icp_fit_score`. Criar a tabela `lead_icp_score_queue` (lead_id único, workspace_id, status, tentativas, erro) com GRANT e RLS por workspace. Criar a tabela `lead_icp_job_state` (lock com expiração, pausa por workspace e motivo). Acrescentar um trigger AFTER INSERT em `leads` que coloca a lead na fila (`ON CONFLICT DO NOTHING`).
- Nova função de backend `score-leads-icp`, chamada por um agendamento de 2 em 2 minutos: obtém o lock, verifica a pausa, processa um lote de 20 leads e marca cada lead feita na mesma operação. Respostas 402/403 pausam o espaço de trabalho; 429 fica para a volta seguinte. Lê o cliente ideal com `business-context-loader`.
- IA: Lovable AI Gateway, modelo `openai/gpt-6-astra` via Responses, com resposta JSON estrita `{score, summary, reasons[]}`, em streaming e com registo de uso via `logAIUsage` (`workspaceId`).
- Frontend: coluna, filtro e ordenação na lista de leads; cartão na ficha; fonte «Leads para ligar» em `useProductivityHub`. O botão «Repontuar» volta a pôr a lead na fila.
- Teste: regra «≥ 70 = vale ligação» e validação do formato da resposta da IA.
