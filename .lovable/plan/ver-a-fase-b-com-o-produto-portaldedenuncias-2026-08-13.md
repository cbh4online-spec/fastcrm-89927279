# Ver a Fase B com o produto PORTALDEDENUNCIAS

## Estado verificado

O SKU `PORTALDEDENUNCIAS` existe em três workspaces (METODOPARE, CENTRALITY e Centrality 2026), todos com `status = active`. Em todos eles o campo `metadata.offer_page` está **vazio** — ou seja, a Página de Oferta nunca foi ativada para este produto, por isso a loja pública mostra a ficha normal e não a Smart Offer Page.

Notei também que o nome do produto é uma frase muito longa (lista de características) e o `store_slug` herdou essa frase inteira, gerando um URL enorme. Não é bloqueante para ver a Fase B, mas é mau para SEO e para o cabeçalho da página.

## O que vou fazer

1. **Ativar e configurar a Página de Oferta** neste produto (workspace METODOPARE, salvo indicação contrária):
   - Preset **Serviço / Software** com objetivo de conversão **Pedir demonstração**.
   - Título e subtítulo curtos ("Plataforma de Denúncias"), com a frase longa a passar para a descrição.
   - Secções ativas: Descrição, Benefícios, Especificações, Instalação/Setup, Documentos, FAQ.
   - Conteúdo sectorial de exemplo: passos de instalação/configuração, equipamento/requisitos, e 3 FAQ.
   - Ordem das secções definida para validar a persistência de `sectionOrder`.

2. **Validar em antevisão real** (Playwright na rota pública da loja):
   - Confirmar que as secções sectoriais aparecem pela ordem definida e que secções ativas sem conteúdo não renderizam.
   - Abrir o botão principal e confirmar que o diálogo de **Pedir demonstração** mostra os campos próprios (modalidade, data preferida, janela de contacto) e regista o lead.
   - Consola sem erros e comportamento correto em desktop e mobile.

3. **Entregar os links** do editor (detalhe do produto → separador da ficha pública) e da página pública para poder rever.

## Notas técnicas

- A configuração fica em `products.metadata.offer_page` (inclui `preset`, `sections`, `sectionOrder`, `sectorConfig`, `conversionGoal`, `faqItems`).
- Nada de schema novo, nenhuma alteração de código: é só dados de um produto.
- Rota pública: `/store/metodopare/product/<store_slug>`.

## Por validar

- Confirmar o workspace pretendido (METODOPARE, CENTRALITY ou Centrality 2026) — assumo METODOPARE.
- Se quiser, encurto o `store_slug` para `plataforma-de-denuncias` (o antigo continua a resolver por ID, mas links já partilhados com o slug longo deixariam de funcionar). Por defeito **não** mexo no slug.
