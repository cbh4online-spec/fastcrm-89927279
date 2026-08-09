# Fase 4 — Backoffice das novas secções da ficha de produto

As Fases 1–3 criaram na loja pública: faixa de confiança, aviso de decisão, secções de conteúdo, packs, alternativas e Q&A. Falta o lado de gestão no FastCRM.

## Diagnóstico (verificado no código)

- `ProductContentSectionsEditor.tsx` existe mas **não está montado em lado nenhum** — as secções que a loja mostra não têm editor acessível.
- `ProductOfferPageSettingsTab.tsx` também **não está montado** — só é referenciado por si próprio e pela página pública.
- `product_qa` tem `is_approved`, `answer`, `moderated_by`, `moderated_at`, mas **não existe ecrã de moderação** no dashboard (só o formulário público e o uso por bots).
- `BundlesManager` existe como aba global do catálogo, sem ligação a partir do detalhe do produto.
- A faixa de confiança lê `shipping_methods` reais; não há onde ligar/desligar sinais nem editar o texto de apoio.

## O que vai ser feito

### 1. Detalhe do produto — nova sub-aba "Ficha pública"
No grupo **Conteúdo** do detalhe do produto:
- Montar o editor de secções estruturadas (visão geral, como usar, especificações, clínico) com estado publicado/rascunho por secção.
- Montar as definições de Página de Oferta (presets e objetivos) já existentes.
- Atalho para os packs do produto (abre o gestor de packs filtrado por este produto).
- Pré-visualização: link direto para a ficha pública.

### 2. Moderação de Perguntas & Respostas
Novo ecrã em Produtos → Perguntas, no padrão IX:
- Separadores por estado: Por moderar · Respondidas · Publicadas · Rejeitadas.
- Ações: responder, aprovar, despublicar, eliminar; registo de quem moderou e quando.
- Pesquisa por produto/texto, ordenação e paginação; contador de pendentes visível na aba.
- Bloco por produto no detalhe (aba Conteúdo) com as perguntas desse produto.

### 3. Definições de confiança na loja
Em Definições da Loja → Ficha de produto:
- Ligar/desligar cada sinal da faixa de confiança (entrega, portes grátis, devoluções, pagamento seguro, apoio).
- Texto editável para devoluções e apoio (com valores por omissão atuais).
- Ligar/desligar aviso de decisão, packs, alternativas mais baratas e Q&A na ficha pública.
- Aviso quando não há métodos de envio ativos (a faixa fica incompleta), com atalho para os configurar.

### 4. Qualidade da ficha
- Indicador "Ficha completa/incompleta" no detalhe do produto, com a mesma regra usada para `noindex` (imagem + descrição suficiente), e lista do que falta.

## Notas técnicas

- Configuração da loja guardada nas definições de loja já existentes (chave `product_page`), sem nova tabela; migração só se o campo de definições não suportar o objeto.
- Moderação de Q&A: novas políticas de escrita restritas a membros do workspace (`workspace_id`), leitura pública mantém-se apenas para `is_approved = true`; `moderated_by`/`moderated_at` preenchidos no update.
- Reutilizar `IXCard`, `IXEntityTabs`, `DocumentListToolbar` e componentes de listagem existentes; nada de componentes novos paralelos.
- Sem alterações às regras de negócio da loja pública — apenas passa a ler configuração em vez de constantes.

## Critérios de aceitação

- Editar uma secção no backoffice reflete-se na ficha pública após publicar.
- Uma pergunta submetida na loja aparece em "Por moderar" e só fica visível após aprovação.
- Desligar um sinal de confiança remove-o da ficha pública.
- Estados de carregamento, vazio e erro tratados em todos os ecrãs novos; consola limpa.

## Riscos / por validar

- Verificar se o campo de definições da loja aceita objeto aninhado antes de decidir por migração.
- Volume de perguntas pode exigir paginação server-side desde o início.
