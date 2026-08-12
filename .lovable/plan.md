# IA conversacional no Builder (estilo Lovable)

Objetivo: falar com a IA em linguagem natural e ver a página a ser criada e alterada, com histórico guardado por asset.

## O que muda para o utilizador

1. **Criar asset com IA** — o separador "IA" do diálogo "Criar novo asset" deixa de estar desativado. Escreves o que queres ("landing para curso de nutrição, tom direto"), vês a pré-visualização e crias o rascunho já com HTML gerado.
2. **Chat no editor** — o painel lateral "IA" passa a ser um chat contínuo:
   - escreves um pedido → a IA altera a página → o canvas atualiza-se de imediato;
   - modo **híbrido**: se houver um bloco selecionado no canvas, a IA edita só esse bloco; sem seleção, reescreve a página inteira;
   - cada resposta mostra um resumo do que mudou, com botões *Aplicar* / *Reverter*;
   - Undo/Redo (⌘Z) continua a funcionar sobre as alterações da IA;
   - sugestões rápidas ("adicionar FAQ", "mudar cores", "adicionar formulário de contacto").
3. **Histórico persistente** — a conversa fica guardada no asset; ao voltar à página retomas onde ficaste. Botão para limpar conversa.
4. As ações atuais (refactor, variantes A/B, tradução, imagem) mantêm-se, movidas para um submenu para não competir com o chat.

## Estados e erros

Loading por mensagem, streaming de estado ("a gerar…"), mensagens claras para limite de pedidos (429), créditos esgotados (402) e falha de rede, com opção de repetir. Bloco selecionado indicado no topo do chat.

## Estrutura técnica

**Base de dados** (migração):
- `builder_ai_messages`: `id`, `workspace_id`, `asset_id` (FK `builder_assets`), `role` (`user`/`assistant`), `content`, `html_snapshot` (nullable, para reverter), `bid` alvo (nullable), `created_at`.
- GRANTs para `authenticated`/`service_role`; RLS por membros do workspace do asset (padrão já usado nas tabelas `builder_*`).

**Edge Function `builder-ai`**:
- novo modo `chat`: recebe `messages` (histórico resumido), `fullHtml`, `selectionHtml`, `assetType`;
- system prompt de "engenheiro de landing pages": devolve JSON `{ summary, html }` — `html` é o bloco quando há seleção, ou a página completa quando não há;
- preserva `data-bid`, estrutura e assets existentes; nunca injeta scripts externos;
- passa `workspace_id` ao `logAIUsage` (hoje vai `null`, pelo que não há registo de consumo);
- mantém os limites de erro atuais (200 OK + `error`).

**Frontend**:
- `src/modules/builder/hooks/useBuilderAIChat.ts` — carrega/guarda mensagens, invoca a função, devolve estado.
- `src/modules/builder/components/BuilderAIChatPanel.tsx` — lista de mensagens, composer, sugestões, aplicar/reverter.
- `BuilderAIPanel.tsx` — passa a alojar o chat + submenu "Ferramentas" com as ações existentes.
- `CreateBuilderAssetDialog.tsx` — separador IA ativo, com prompt, tom, idioma e pré-visualização antes de criar.
- Aplicação ao canvas via `onReplaceFullHtml` / `onPatch` já existentes, integrado no `useBuilderHistory`.

## Critérios de aceitação

- Criar um asset apenas a partir de um prompt, com pré-visualização.
- Conversar com a IA no editor e ver o canvas a mudar a cada pedido.
- Com bloco selecionado, só esse bloco muda.
- Recarregar a página mantém a conversa.
- Reverter uma resposta devolve o HTML anterior.
- Erros de créditos/limite aparecem como aviso claro, sem crash.

## Riscos

- Páginas grandes podem exceder o contexto do modelo: em edição de página inteira o pedido é enviado com o HTML atual; para páginas muito longas privilegiar seleção de bloco.
- Geração de página inteira demora dezenas de segundos; o UI mostra progresso.
