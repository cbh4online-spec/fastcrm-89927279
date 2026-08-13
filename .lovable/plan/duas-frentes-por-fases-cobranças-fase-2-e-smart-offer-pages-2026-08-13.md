# Duas frentes por fases: Cobranças (Fase 2) e Smart Offer Pages

## Diagnóstico (estado verificado)

**Cobranças** — o schema e o motor já existem: tabelas `collection_cases`, `collection_actions`, `collection_case_invoices`, RPCs `collections_advance_step`, `collections_check_payment_promises`, `recompute_case_totals`, edge function `collections-auto-executor` e dois crons activos (`*/15` para o executor, diário às 06:00 para promessas). A UI tem inbox, detalhe do caso, importação e sequências.
Lacunas confirmadas:
- `useRegisterAction` apenas **regista** a acção em `collection_actions` — não envia nada por email/WhatsApp/SMS.
- Não existe ecrã de KPIs/analítica de cobrança (aging, DSO, recuperado, taxa de promessa cumprida).
- `collections_advance_step` avança o passo, mas o envio real de cada passo da sequência não tem executor de canal.

**Smart Offer Pages** — o motor existe: config em `products.metadata.offer_page`, editor no detalhe do produto (`ProductOfferPageSettingsTab`), render público (`StoreSmartOfferPage`) com galeria, painel de decisão, trust badges, CTA fixo e secções.
Lacunas confirmadas:
- Em `offerPageTypes.ts` estão declaradas secções sectoriais (`ingredients`, `howToUse`, `program`, `instructor`, `sessions`, `equipment`, `installation`) que **não são renderizadas** em `OfferSections.tsx` — activá-las no editor não produz efeito.
- `sectorConfig` existe no tipo mas não tem editor nem consumo.
- Os objectivos de conversão `request_contact`, `enroll`, `book_assessment`, `book_demo` precisam de validação de fluxo (hoje só `request_quote` tem tratamento explícito no render).

## Ordem de execução

Começo por **Cobranças (Fase 2)**: impacto financeiro directo e o motor automático já está a correr sem enviar nada — é a lacuna mais crítica. Smart Offer Pages entra a seguir.

---

## Fase A — Cobranças: envio real e analítica

**A1. Executor de canais**
- Nova edge function `collections-dispatch-action`: recebe `case_id`, `action_type`, `channel`, `subject`, `body`; valida JWT + pertença ao workspace (super admin bypass); resolve o destinatário a partir do devedor; envia por email (infra transacional existente) ou WhatsApp (conector activo do workspace); grava sempre `collection_actions` com resultado (`sent`/`failed`, erro, `correlation_id`), com CORS e resposta 200 controlada em erro.
- `collections-auto-executor` passa a invocar o dispatch para cada passo da sequência em vez de só avançar o contador; falha de canal não bloqueia o avanço, fica registada.
- Fallback: sem canal configurado, a acção fica como "para envio manual" no timeline.

**A2. Templates de mensagem por passo**
- Cada passo da sequência ganha assunto/corpo com variáveis (`{{nome}}`, `{{total_em_divida}}`, `{{dias_atraso}}`, `{{lista_faturas}}`, `{{link_extrato}}`), com antevisão no editor de sequências.

**A3. Painel de cobrança (KPIs)**
- Nova aba/página com: total em dívida, aging (0-30/31-60/61-90/90+), valor recuperado no período, DSO, promessas cumpridas vs quebradas, top devedores. Filtros por período e responsável; estados de loading/erro/vazio.

**A4. UI do caso**
- Botão "Enviar" no `SendActionDialog` passa a enviar mesmo (com estado a enviar/enviado/falhou) em vez de só registar; timeline mostra o estado de entrega.

**Critérios de aceitação (Fase A)**
- Uma acção enviada chega ao destinatário e aparece no timeline com estado de entrega.
- O executor automático regista envios reais a cada 15 min sem duplicar (idempotência por passo/caso/dia).
- KPIs cruzam com `amount_paid` das faturas (regra financeira do projecto).

---

## Fase B — Smart Offer Pages: fechar o motor

**B1. Secções sectoriais em falta**
- Renderizar em `OfferSections.tsx`: Ingredientes, Como usar, Programa, Formador, Sessões, Equipamento, Instalação — cada uma alimentada por `sectorConfig` ou por campos já existentes do produto, com estado vazio silencioso (não renderiza se não houver conteúdo).

**B2. Editor de conteúdo sectorial**
- No `ProductOfferPageSettingsTab`, um bloco por preset para preencher esses conteúdos (listas de items, texto rico curto), gravado em `metadata.offer_page.sectorConfig`, com validação zod e limites de comprimento.

**B3. Objectivos de conversão completos**
- `request_contact`, `enroll`, `book_assessment`, `book_demo` passam a ter formulário/fluxo próprio (lead + evento de tracking), reutilizando o padrão já usado no `request_quote`.

**B4. Ordenação e antevisão**
- Permitir ordenar as secções activas (drag simples) e ver antevisão da página no editor.

**Critérios de aceitação (Fase B)**
- Nenhuma secção configurável fica sem render.
- Cada objectivo de conversão produz um registo rastreável e um evento de analytics.
- Página pública mantém-se responsiva e sem regressões de SEO.

## Riscos e pontos por validar

- Envio por WhatsApp depende do conector activo por workspace; sem ele, só email.
- Conteúdo de texto do lojista tem de ser sanitizado antes de render (DOMPurify), sem `dangerouslySetInnerHTML` cru.
- Regras de cobrança são sensíveis: envios automáticos exigem interruptor por workspace e limite diário para evitar spam.
