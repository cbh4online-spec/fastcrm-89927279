# Fase B — Smart Offer Pages: fechar o motor

## Diagnóstico (verificado no código)

- `offerPageTypes.ts` declara 17 secções, mas `OfferSections.tsx` só renderiza 10 (`description`, `benefits`, `specifications`, `video`, `delivery`, `warranty`, `documents`, `reviews`, `faq`, `relatedProducts`).
- Ficam sem render: **Ingredientes, Modo de utilização, Programa, Formador, Sessões, Equipamentos, Instalação** — activá-las no editor não produz efeito visível.
- `sectorConfig` existe no tipo e é preservado no parse, mas **não tem editor nem consumo** em nenhum componente.
- Conversão: `useOfferConversion` já trata todos os objectivos, mas `request_contact`, `book_assessment`, `book_demo` e `enroll` caem todos no mesmo `StorePriceRequestDialog` ("Pedir preço"), com o mesmo texto e o mesmo registo — não há distinção de intenção nem campos próprios (ex.: data preferida).

## O que vai ser feito

### B1. Conteúdo sectorial editável
Novo bloco no separador de Página de Oferta do produto, que muda conforme o preset escolhido:

- Cosmética: Ingredientes (lista nome + função) e Modo de utilização (passos).
- Formação: Programa (módulos com título + descrição), Formador (nome, bio curta, foto opcional), Sessões (data, horário, local/online, vagas).
- Segurança: Equipamentos incluídos (lista) e Instalação (passos + nota de prazo).

Tudo gravado em `metadata.offer_page.sectorConfig`, com validação zod (limites de comprimento e nº de itens) e estados de vazio/erro claros.

### B2. Render das 7 secções em falta
`OfferSections.tsx` passa a renderizar cada uma a partir do `sectorConfig`, no mesmo estilo de acordeão já usado. Regra: secção activa mas sem conteúdo **não** renderiza (sem blocos vazios). Texto do lojista é sanitizado antes de render.

### B3. Objectivos de conversão com fluxo próprio
Um diálogo de conversão único, parametrizado pelo objectivo, reaproveitando a infraestrutura do pedido de preço:

| Objectivo | Título / CTA | Campos extra |
|---|---|---|
| request_quote | Pedir orçamento | quantidade, observações |
| request_contact | Pedir contacto | melhor horário de contacto |
| enroll (sem preço) | Inscrição | sessão pretendida (quando existem sessões) |
| book_assessment | Agendar avaliação | data e período preferidos |
| book_demo | Marcar demonstração | data preferida, presencial/online |

Cada submissão cria o mesmo tipo de registo já usado hoje pelo pedido de preço, com o objectivo e os campos extra guardados no pedido, e dispara evento de analytics distinto por objectivo.

### B4. Ordenação e antevisão
- Ordenar as secções activas por arrastar no editor (ordem persistida na config e respeitada no render).
- Botão de antevisão que abre a página pública da oferta numa nova aba.

## Notas técnicas

- Ficheiros tocados: `offerPageTypes.ts` (tipos de `sectorConfig` + ordem das secções), `OfferSections.tsx`, novos componentes de secção sectorial, `ProductOfferPageSettingsTab.tsx`, `useOfferConversion.ts`, novo diálogo de conversão a envolver o padrão de `StorePriceRequestDialog`.
- Sem alterações de schema: tudo continua em `products.metadata.offer_page`; o registo de pedidos usa a tabela já existente.
- Retrocompatível: configs antigas sem `sectorConfig` nem ordem continuam a funcionar com os defaults por preset.

## Critérios de aceitação

- Nenhuma secção configurável fica sem render.
- Secções sem conteúdo não aparecem na página pública.
- Cada objectivo de conversão produz um registo rastreável e um evento de analytics próprio.
- Editor valida limites e mostra erros; consola limpa; página pública responsiva e sem regressões de SEO.

## Riscos

- Conteúdo sectorial livre exige sanitização rigorosa (sem HTML cru).
- Sessões de formação com vagas são informativas neste MVP — não há reserva de lugar com stock.
