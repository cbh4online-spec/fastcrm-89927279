# O que fazer no ecrã de importação SAF-T

## Situação atual (verificada na base de dados)

Workspace PHARLISS, últimas importações:

| Ficheiro | Estado | Faturas | Recibos |
|---|---|---|---|
| SAF-T 2026_6 (junho) | concluída | 205 criadas | 0 registos de pagamento |
| SAF-T 2026_5 (maio) | concluída | 222 | 0 |
| SAF-T 2024_1_12 "Com erros" | falhou (timeout no parse) | — | — |
| SAF-T 2025_1_6 | falhou (timeout no parse) | — | — |

O "Concluída (parcial) 1284/1482" que aparece no ecrã é a importação de junho: 205 faturas criadas e 744 ignoradas por duplicado (já existiam) — isso é normal e não é erro. O que falta mesmo são os **recibos**: essa importação não gerou nenhum registo de pagamento.

As duas importações de 2024 e 2025_1_6 morreram logo no passo `parse_xml_start`, sem qualquer progresso, e foram marcadas como falhadas pelo watchdog ao fim de 15 minutos.

## Ação recomendada, por ordem

### 1. Reimportar o ficheiro de junho com "Importar pagamentos" ativo
É o passo que recupera os ~68 recibos em falta (~44 mil €) e corrige a conta corrente. As faturas não duplicam (dedupe por `saft_invoice_no`), por isso é seguro repetir. Depois da importação, confirmar no painel "Conferência de recibos" que os recibos criados + já existentes cobrem os 135 do Excel.

### 2. Repetir maio (2026_5) da mesma forma
Mesma situação: 222 faturas sem qualquer recibo associado.

### 3. Tratar os dois ficheiros que falharam
Os ficheiros de 2024 e 2025 (11–15 MB) bloqueiam no arranque do parser. Antes de voltar a tentar às cegas, investigar porquê:
- ler os logs da edge function `saft-import` para a janela dessas execuções;
- confirmar se o parser em streaming está a emitir heartbeats nesses ficheiros (nenhum passo depois de `parse_xml_start` foi registado);
- se for limite de recursos, dividir o ficheiro por trimestre no software de gestão e importar por partes.

## Nota técnica
Nenhuma alteração de código é obrigatória para os pontos 1 e 2 — as correções ao importador (procura de faturas na base de dados para ligar recibos, e cálculo de totais a partir das linhas) já estão aplicadas. O ponto 3 pode exigir alterações no `saft-stream-parser.ts` consoante o que os logs mostrarem.

## Critérios de aceitação
- Junho 2026 com 135 recibos e 62.302,48 € recebidos.
- Maio 2026 com recibos importados e `amount_paid` reconciliado.
- Causa do timeout dos ficheiros de 2024/2025 identificada e documentada.
