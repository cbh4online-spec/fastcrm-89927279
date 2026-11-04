# FastCRM Quality AI — Auditoria da página Crescimento (/dashboard/growth)

Modo: AUDITORIA (só leitura). Correções só depois de aprovação.

## 1. Achados preliminares (já com evidência)

| ID | Prioridade | Estado | Evidência | Impacto |
|---|---|---|---|---|
| G-01 | P2 | Confirmado | Aviso na consola às 16:09: "Function components cannot be given refs" dentro de `BgiKpiGrid` | Um componente (provavelmente um tooltip/botão do editor ou dos alertas) não recebe a referência; pode falhar o posicionamento ou o foco |
| G-02 | P2 | Confirmado | Erro de cálculo mostra a mensagem técnica do servidor ao utilizador | Mensagens confusas em pt-PT |
| G-03 | P3 | Confirmado | Botões «Ativar» e «Guardar modelos» mostram só o ícone a rodar, sem texto | Leitores de ecrã não anunciam o estado |
| G-04 | P2 | Suspeito | Super admin vê o painel sem módulo ativo; falta confirmar se o servidor aplica a mesma exceção | Painel vazio ou com erro para super admin |
| G-05 | P3 | Suspeito | Ordem atual: alertas → IA → objetivos → indicadores → funil; muito scroll no telemóvel antes dos números | Hierarquia visual fraca |

## 2. Auditoria completa a executar

1. Inventário: página, 8 componentes, 7 regras em `src/lib/bgi`, funções `bgi_compute_indicators`, `bgi_funnel_by_source`, `bgi-insights`, tabelas de definições/objetivos/insights/notificações.
2. Funcionalidade: ativação (mensal/único), escolha de modelos, editor de painel, objetivos (criar, duplicado, arquivar), IA (limite 3/dia), alertas + sino, funil — estados loading, vazio, erro e sem permissão.
3. Segurança: verificar RLS e controlo do módulo no servidor; testar com gestor, membro sem permissão e outra organização.
4. Visual: capturas reais a 390x844, 768x1024 e 1440x900 com sessão iniciada na PHARLISS; contraste, foco e teclado.
5. Testes: correr os 30 testes BGI existentes.

## 3. Correções propostas (baixo risco, após aprovação)

- G-01: identificar o componente sem `forwardRef` e corrigir.
- G-02: mensagem amigável em pt-PT + botão «Tentar novamente».
- G-03: texto «A guardar…» / «A ativar…» com `aria-live`.
- G-04: alinhar a regra do super admin entre a página e o servidor (só leitura, sem alterar permissões sem nova aprovação).
- G-05: proposta de reordenação para revisão, sem aplicar sem aprovação.

## 4. Entregável

Relatório no formato Quality AI: resumo, cobertura, achados, auditoria visual, testes, scorecard ponderado (N/A onde não for avaliado) e veredito.

## Riscos e limites

Não serão feitos pagamentos reais nem alteradas permissões ou dados. Sem sessão de teste válida, a parte visual autenticada fica marcada como não verificada.
