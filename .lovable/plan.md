# CloudTalk — Fase 2: transcrição e resumo com IA

## Objetivo
Cada chamada registada passa a mostrar, na ficha do contacto ou da lead, a transcrição, um resumo curto, o sentimento do cliente e os próximos passos. Os próximos passos podem passar a tarefa com um clique.

## O que o utilizador vai ver
- No cartão «Chamadas CloudTalk», cada chamada tem «Ver transcrição» (agente e cliente separados), um resumo de 2–4 linhas, o sentimento (Positivo / Neutro / Negativo) e uma lista de próximos passos.
- Em cada próximo passo, o botão «Criar tarefa» cria a tarefa com prazo de 3 dias, sem duplicados.
- Estados possíveis: «A aguardar transcrição», «Resumo indisponível» (com motivo) e «Gerar resumo» (manual, para gestores).

## Duas origens possíveis, por esta ordem
1. **CloudTalk Conversation Intelligence (plano Expert):** quando a CloudTalk envia a transcrição, o resumo e o sentimento, guardamos esses dados diretamente. Não há custo de IA para o FastCRM.
2. **Alternativa FastCRM:** se a CloudTalk só enviar a transcrição, a IA do FastCRM gera o resumo, o sentimento e os próximos passos a partir dela.
   - Pode correr automaticamente ou a pedido.
   - Tem limite diário por organização e passa pelo controlo de orçamento de IA já existente.
   - Não transcrevemos áudio: não descarregamos gravações para transcrição.

## Privacidade e segurança
- Só os membros da organização veem as transcrições, tal como já acontece com as chamadas.
- A IA recebe apenas o texto da chamada, nunca outros dados do cliente.
- O resultado da IA é validado antes de ser guardado. Se a validação falhar, a chamada fica «Resumo indisponível».
- Opção por organização: «Gerar resumos com IA automaticamente», desligada por omissão.

## Detalhes técnicos
- Base de dados: novas colunas em `cloudtalk_calls`: `transcript` (jsonb, segmentos com orador e texto), `summary`, `sentiment` (`positive|neutral|negative`), `action_items` (jsonb), `ai_source` (`cloudtalk|fastcrm`), `ai_status` (`pending|done|failed|skipped`), `ai_error`, `ai_generated_at`. Também a coluna `auto_ai_summary` (boolean, por omissão false) em `cloudtalk_connections`. Sem novas permissões de escrita para o browser.
- `_shared/cloudtalk.ts`: `normalizeCloudtalkCall` passa a extrair os campos de transcrição, resumo e sentimento dos eventos de Conversation Intelligence (`transcription`/`ai_summary`/`sentiment`). O webhook junta os dados à chamada existente, sem apagar campos.
- Nova função `cloudtalk-ai-summary`:
  - Chamada pelo webhook quando há transcrição sem resumo e `auto_ai_summary` está ativo, ou manualmente por gestores (JWT + membro + gestor + módulo `cloudtalk`).
  - Usa o modelo predefinido do Lovable AI Gateway com saída estruturada validada por zod.
  - Respeita o `aiGate` e o orçamento de IA, com limite de 50 chamadas por organização por dia, registo em `ai_usage_logs` e idempotência por `ai_status`.
- Frontend: `CloudtalkCallHistory` ganha a transcrição expansível, o resumo, o selo de sentimento e os próximos passos. «Criar tarefa» reutiliza a deduplicação das tarefas pendentes (related_id + título). O interruptor da IA automática fica no `CloudtalkConnectionCard`, visível só a gestores.
- Teste unitário à normalização dos eventos de IA e à validação do resultado do resumo.
- Regra curta em `AGENTS.md`.

## Critérios de aceitação
- Um evento com transcrição e resumo da CloudTalk aparece na ficha sem chamar a IA.
- Um evento só com transcrição, com a IA automática ligada, gera o resumo uma única vez, mesmo que o evento chegue repetido.
- Com a IA automática desligada, o gestor vê «Gerar resumo» e um utilizador normal não vê.
- Atingido o limite diário, aparece uma mensagem clara e não há nova chamada à IA.
- Os próximos passos criam tarefas sem duplicar.

## Riscos e pontos por validar
- O formato exato dos eventos de IA da CloudTalk só se confirma com uma conta Expert real. O normalizador aceita variantes conhecidas e guarda sempre o original.
- Custo de IA em organizações com muitas chamadas: mitigado pelo limite diário e pela opção desligada por omissão.
- Transcrições longas: o texto é cortado (por exemplo, 30 000 caracteres) antes de ir para a IA.
