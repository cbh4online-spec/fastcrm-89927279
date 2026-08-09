# Ficha de produto pública — o que trazer do VendeSimples

## Diagnóstico

A ficha pública do FastCRM (`/store/:slug/product/:id`) já é rica: galeria com zoom, vídeos, badges, preço com/sem IVA e tiers B2B, countdown de promoção, wishlist, oferta/pedido de preço, alertas de stock, histórico e comparação de preço, comprados juntos, relacionados, compatíveis, documentos, avaliações, AI Advisor, barras sticky mobile/desktop, partilha e SEO via `ProductSeoHead`.

O VendeSimples tem blocos que aqui **não existem**. Comparando os dois ecrãs, estas são as lacunas reais:

| Bloco no VendeSimples | Existe no FastCRM? |
|---|---|
| Perguntas e respostas públicas no produto | Tabela `product_qa` existe, mas não é mostrada na ficha |
| Faixa de confiança (envio, devoluções, pagamento seguro) junto ao CTA | Só existe secção de confiança na homepage |
| Packs/bundles do mesmo vendedor com poupança calculada | Só "comprados juntos" (sem preço de pack) |
| Alternativas mais baratas (down-sell) quando o preço trava a decisão | Não existe |
| Nudge de decisão (stock baixo, visitas recentes, prazo de promoção) num único aviso | Sinais dispersos |
| Fotos 360º | Não existe |
| Especificações estruturadas por secções com âncoras | Specs em lista simples |
| Guarda de indexação: `noindex` quando a ficha está incompleta | JSON-LD é emitido mesmo sem foto/preço válido |
| Denúncia de anúncio / conteúdo | Não aplicável a loja própria (excluído) |

## O que proponho construir

### Fase 1 — Confiança e conversão (maior impacto, sem alterações de schema)
1. **Faixa de confiança** por baixo do botão de compra: prazo de entrega estimado, política de devoluções, pagamento seguro, apoio ao cliente. Textos vêm das definições da loja; a faixa só mostra o que estiver configurado.
2. **Aviso de decisão único**: consolida stock baixo, visitas recentes e fim de promoção numa só mensagem, em vez de vários avisos concorrentes.
3. **Especificações em blocos com navegação por âncoras** (Visão geral, Como usar, Especificações, Clínico), reaproveitando `product_content_sections` já existente e o mapeamento canónico documentado.
4. **Guarda de SEO**: `noindex` automático quando faltam foto, preço válido ou o produto está inativo; JSON-LD só é emitido quando passa validação.

### Fase 2 — Aumentar valor médio da encomenda
5. **Packs do mesmo vendedor/marca** com preço do conjunto e poupança, adicionando todos os itens ao carrinho de uma vez.
6. **Alternativas mais baratas** apresentadas apenas quando o visitante mostra hesitação (saída de rato/scroll sem ação), para não canibalizar a venda principal.

### Fase 3 — Conteúdo gerado por clientes
7. **Perguntas e respostas** na ficha: listagem pública das respondidas, formulário para colocar pergunta, resposta pela equipa no backoffice. Usa a tabela `product_qa` que já existe, respeitando as restrições de exposição de nome já aplicadas.
8. **Fotos 360º** (opcional, só se houver produtos que justifiquem).

## Notas técnicas

- Novos componentes em `src/components/store/`: `StoreTrustStrip.tsx`, `StoreDecisionNudge.tsx`, `StoreSpecSections.tsx`, `sections/StoreProductQA.tsx`, `sections/StoreBundleOffers.tsx`, `sections/StoreDownsellAlternatives.tsx`.
- `StoreProductPage.tsx` passa a compor estes blocos; a lógica de preço/IVA continua em `StoreVatContext` e `useStoreTierPricing`, sem duplicação.
- Secções de conteúdo lidas via `useProductContentSections` / RPC `get_product_full_content`, sem novas colunas.
- Q&A: leitura pública apenas de perguntas com resposta publicada; inserção validada com zod e limite de comprimento; políticas RLS por `workspace_id`, sem expor email do autor.
- Bundles: total calculado no servidor com a mesma matemática do checkout, para o preço mostrado nunca divergir do carrinho.
- Cada bloco é ligado/desligado nas definições da loja, para não obrigar todas as lojas a mostrar tudo.

## Critérios de aceitação

- Nenhum bloco novo aparece vazio; sem dados configurados, não renderiza.
- Preço de pack igual ao total do carrinho após adicionar os itens.
- Q&A: sem nomes completos nem emails expostos; pergunta só visível depois de respondida.
- Fichas incompletas deixam de emitir JSON-LD e passam a `noindex`.
- Sem regressões em mobile (barra de conversão continua acessível) e sem erros de consola.

## Por validar

- Ordem de fases: começo pela Fase 1 ou há preferência por Q&A primeiro?
- Os textos de entrega/devoluções devem vir das definições da loja ou ser por produto?
