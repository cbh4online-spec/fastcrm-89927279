<final-text>Diagnóstico

- O problema não é a rota: `/marketplace/:workspaceSlug/live/:id` já está envolvida em `StoreCartProvider` em `src/App.tsx`.
- O chat demo continua diferente porque `LiveChat.tsx` ainda depende do momento em que cada dispositivo monta o componente e usa `new Date()` local. Mesmo com seed, isso gera linhas temporais diferentes.
- Os produtos continuam “demo” por 3 falhas reais no fluxo:
  1. `usePublicLivestreamById` não devolve `product_ids`;
  2. `C2CGoLiveSetup.tsx` deixa selecionar produtos, mas `useCreateLivestream` não os grava;
  3. `C2CPublicGoLiveSetup.tsx` nem sequer tem seleção de produtos.
- O carrinho não fecha o circuito: o estado até pode receber itens, mas a live não renderiza `StoreCartDrawer`, e o checkout actual `/store/:slug/checkout` pertence ao fluxo da loja (`store_orders`), não ao C2C (`c2c_orders`).
- O vídeo entre dispositivos ficou igual porque o código actual só faz preview local do broadcaster. Sem transporte real de vídeo, viewers nunca verão a mesma imagem.

Decisões de produto/UX

- Na live C2C, a compra deve seguir fluxo C2C real, não um reaproveitamento parcial do checkout da loja.
- Assumo como abordagem recomendada:
  - produtos reais na live;
  - CTA “Comprar” ligado a compra C2C real;
  - drawer apenas como resumo visual, não como destino final errado.
- Mantemos a restrição “sem MUX WHIP”; logo o vídeo cross-device fica tratado como tema separado.

Estrutura técnica

- `src/hooks/c2c/usePublicLivestreams.ts`
  - incluir `product_ids` no select público.
- `src/hooks/c2c/useLivestreams.ts`
  - aceitar e persistir `product_ids`, `description` e `replay_available` na criação da live.
- `src/pages/c2c/C2CGoLiveSetup.tsx`
  - enviar `selectedProductIds` ao criar a live.
- `src/pages/c2c/C2CPublicGoLiveSetup.tsx`
  - adicionar seleção de produtos e persistência igual ao dashboard.
- `src/components/c2c/livestream/LiveChat.tsx`
  - refazer a simulação com base em `livestreamId + started_at`, por blocos temporais fixos.
- `src/pages/c2c/C2CPublicLivestreamViewer.tsx` e `src/pages/c2c/C2CLivestreamViewer.tsx`
  - passar `started_at` e `product_ids` correctos aos componentes.
- Fluxo de compra
  - ligar a live ao checkout C2C real, não ao `create-store-checkout`.

Plano de implementação

1. Corrigir a origem dos dados da live
- Gravar `product_ids` quando a live é criada.
- Expor `product_ids` na query pública.
- Uniformizar o setup público e o setup do dashboard para criarem a mesma live.

2. Corrigir o chat demo
- Substituir a lógica baseada em montagem local por uma linha temporal determinística.
- Gerar mensagens por slots fixos, por exemplo de 3 em 3 segundos, usando timestamps calculados a partir de `started_at`.
- Aproveitar para remover duplicação entre mensagem local e mensagem persistida.

3. Corrigir os produtos destacados
- Mostrar listings reais quando existirem `product_ids`.
- Usar demo apenas como fallback verdadeiro.
- Garantir ordem estável, imagem válida e preço correcto no viewer público e no viewer interno.

4. Fechar a compra real
- Trocar o CTA “Comprar” da live para um fluxo C2C utilizável.
- Se ainda quiser um carrinho visual na live, renderizar o drawer na página, mas com CTA final alinhado ao checkout C2C.
- Não manter o estado “parece que adicionou” sem um caminho real até encomenda.

5. Isolar o tema do vídeo
- Sem MUX WHIP, o problema de vídeo entre PC/iPhone/Android não fica resolvido só com UI.
- Se quiser mesmo corrigir vídeo cross-device, teremos de aprovar outro transporte real de streaming browser→viewer.

Critérios de aceitação

- A mesma live mostra exactamente as mesmas mensagens demo em todos os dispositivos.
- Uma live criada com produtos mostra esses produtos reais no viewer público.
- O botão “Comprar” deixa de ser apenas visual e entra num fluxo de compra utilizável.
- O comportamento fica coerente entre setup público, viewer público e viewer interno.
- Fica claro o que está resolvido sem streaming real e o que continua dependente de transporte de vídeo.

Riscos e pontos por validar

- O principal bloqueio actual é arquitectural: live C2C está ligada a peças da loja, mas a compra real C2C vive noutro domínio.
- Se o objectivo for um carrinho multi-item C2C numa única encomenda, isso já exige desenho próprio de checkout C2C agregado.
- Se mantivermos “sem MUX WHIP” e sem alternativa equivalente, o vídeo continuará local e não partilhado.</final-text>