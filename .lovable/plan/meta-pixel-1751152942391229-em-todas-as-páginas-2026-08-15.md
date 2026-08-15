# Meta Pixel 1751152942391229 em todas as páginas

## Diagnóstico
- O pixel atual (909068581793930) já está montado globalmente: `<MetaPixelLoader />` está dentro do `GTMProvider` em `src/App.tsx`, acima de todas as rotas, e o `<noscript>` de fallback está no fim do `<body>` do `index.html`.
- Logo, a cobertura "todas as páginas" já existe — falta apenas trocar o ID e garantir que o PageView é enviado em cada mudança de rota (hoje o efeito depende de `window.location.pathname` lido fora do router, o que não reage a navegações SPA).

## Decisões
- Substituir totalmente o ID antigo pelo novo `1751152942391229` (sem duplo tracking).
- Manter o gating por consentimento de marketing (RGPD) — o pixel só inicializa depois do aceite no banner de cookies.

## Alterações
1. `src/modules/growth-seo/components/tracking/MetaPixelLoader.tsx`
   - `DEFAULT_META_PIXEL_ID = '1751152942391229'` (chave de sessão passa a refletir o novo ID).
   - Passar a usar `useLocation()` do react-router para disparar `fbq('track','PageView')` a cada mudança de rota, em vez de ler `window.location.pathname`.
   - Evitar PageView duplicado no arranque (o `initializeMetaPixel` já envia o primeiro).
2. `index.html`
   - Atualizar o `<noscript>` do fim do `<body>` para o novo ID.
3. `src/lib/ecommerceTracking.ts` — sem alterações (usa `window.fbq`, herda o novo pixel automaticamente).

## Critérios de aceitação
- Com consentimento de marketing aceite, `fbq` inicializa com 1751152942391229 em qualquer rota (dashboard, loja, páginas públicas).
- Navegar entre rotas gera um PageView por página, sem duplicados no primeiro carregamento.
- Sem consentimento, nenhum pedido para `connect.facebook.net`/`facebook.com/tr`.
- O ID antigo deixa de existir no código.

## Riscos
- Eventos de e-commerce existentes passam a ser atribuídos ao novo pixel; o histórico do antigo mantém-se apenas no Gestor de Eventos do Meta.
