# Ficha de produto pública — o que está errado no ecrã que enviou

## Diagnóstico (verificado no preview)

O layout que enviou vem de `fastcrm.metodopare.ai` (versão publicada), não do preview atual.

Reproduzindo o mesmo produto no preview a 1180px, os problemas do seu screenshot **já não existem**:
- os cartões "Comprar agora" e "Fazer uma oferta" já empilham em coluna única (deixaram de ficar espremidos a dois);
- o botão "Adicionar ao carrinho" aparece completo (no publicado surge cortado: "dicionar ao car");
- a barra fixa do topo com o preço já não sobrepõe o conteúdo.

Ou seja: a correção de responsividade (container queries na buy box) está no código mas **ainda não foi publicada**.

Contudo, no preview continuam dois defeitos reais:
1. **Passos vazios**: "2 Leva mais desta loja" e "3 Alternativas mais acessíveis" aparecem só com o número e o título, sem qualquer conteúdo, quando não há bundles nem alternativas para o produto.
2. **Espaço morto**: a coluna da galeria e a coluna de informação terminam muito acima da buy box, deixando uma grande área branca entre elas e a secção "Sobre este produto".

## Plano

1. **Publicar** a versão atual para o layout corrigido chegar a `fastcrm.metodopare.ai` (é o que resolve o screenshot).
2. **Esconder passos sem conteúdo**: cada passo do painel de compra só é renderizado se tiver dados (bundles existentes, alternativas encontradas). A numeração recalcula-se para ficar sempre sequencial.
3. **Fechar o espaço morto**: alinhar a altura das colunas — a área de conteúdo passa a ocupar o espaço disponível e a secção "Sobre este produto" sobe, sem alterar a ordem dos blocos.
4. **Validação** a 1180px, 1440px e 390px (mobile): botões completos, sem sobreposições, sem passos vazios, consola limpa.

## Notas técnicas

- Ficheiros: `src/components/store/purchase/StorePurchasePanel.tsx` (renderização condicional dos passos), `src/components/store/purchase/BundleTierSelector.tsx` e `src/components/store/sections/StoreCheaperAlternatives.tsx` (reportar "sem resultados" ao painel), `src/pages/store/StoreProductPage.tsx` (grelha de 3 zonas).
- Sem alterações de dados, RLS ou lógica de preços — apenas apresentação.
