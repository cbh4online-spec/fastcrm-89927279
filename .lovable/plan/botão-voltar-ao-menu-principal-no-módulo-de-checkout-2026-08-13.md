# Botão "Voltar ao menu principal" no módulo de Checkout

## Diagnóstico
As rotas `/dashboard/checkout/*` já são envolvidas pelo `DashboardLayout` em `src/routes/CheckoutRoutes.tsx`, mas na captura o ecrã aparece sem barra lateral visível e sem qualquer caminho de regresso. A página de listagem (`CheckoutFunnelsPage`) não tem nenhum controlo de navegação de retorno; só o detalhe do funil tem uma seta que volta à listagem.

## O que vai ser feito
1. **Cabeçalho de navegação na listagem de funis**
   - Botão "Voltar ao FastCRM" (seta + texto) no topo da `CheckoutFunnelsPage`, que navega para `/dashboard`.
   - Breadcrumb curto: `Dashboard / Funis de Checkout`.

2. **Detalhe do funil**
   - Manter a seta atual (volta à listagem) e acrescentar breadcrumb `Dashboard / Funis de Checkout / <nome do funil>`, com os dois primeiros níveis clicáveis.

3. **Consistência nas restantes páginas do módulo**
   - Aplicar o mesmo cabeçalho de regresso nas páginas Ofertas, Carrinhos abandonados, Bundles, Analytics, Testes A/B, Descontos e Métricas de recuperação, através de um pequeno componente partilhado `CheckoutBackHeader`.

4. **Verificação da barra lateral**
   - Confirmar em antevisão que o `DashboardLayout` está mesmo a renderizar a sidebar nestas rotas; se estiver colapsada/oculta por causa da largura ou do modo `?nav=ix`, corrigir para que fique coerente com o resto do dashboard.

## Detalhes técnicos
- Novo componente `src/components/checkout/admin/CheckoutBackHeader.tsx` (props: `title`, `parent?`), usando `Button variant="ghost"`, `ArrowLeft` e o `Breadcrumb` do shadcn já existente.
- Navegação via `useNavigate()`; destino principal `/dashboard`.
- Sem alterações de dados, hooks ou backend — apenas apresentação.

## Critérios de aceitação
- Em qualquer página de `/dashboard/checkout/*` existe um caminho claro de volta ao menu principal do FastCRM em 1 clique.
- Breadcrumbs corretos e clicáveis.
- Barra lateral visível como nas restantes páginas do dashboard.
- Funciona em mobile (botão não quebra o cabeçalho).
