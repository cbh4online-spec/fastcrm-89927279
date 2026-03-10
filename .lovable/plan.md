

## Plan: Preview de Funil

### Problema
Não existe uma página pública nem um mecanismo de pré-visualização para os funis. O botão ExternalLink no step overview não faz nada.

### Solução
Criar uma página pública de renderização do funil (`/funnel/:slug`) e ligar o botão de preview no editor a ela.

### Alterações

**1. Criar `src/pages/PublicFunnelPage.tsx`**
- Rota pública `/funnel/:slug` (sem autenticação)
- Busca o funil pelo slug via `supabase.from("funnels").select("*").eq("slug", slug).eq("is_published", true)`
- Busca os steps ordenados por `sort_order`
- Renderiza o primeiro step (ou o step indicado por query param `?step=0`) com o conteúdo (headline, subheadline, body, CTA) usando os estilos de `design/appearance`
- Navegação entre steps via CTA (avança para o próximo step)
- Modo preview: se query param `?preview=true`, ignora o filtro `is_published` (para permitir preview de funis não publicados — valida que o user está autenticado)

**2. Registar rota em `src/App.tsx`**
- Adicionar `<Route path="/funnel/:slug" element={<PublicFunnelPage />} />` nas rotas públicas

**3. Atualizar `FunnelStepsTab.tsx`**
- No botão `ExternalLink` (linha 206-208): adicionar `onClick` que abre `/funnel/${funnel.slug}?preview=true` numa nova tab
- Precisa receber o `funnelId` já disponível como prop, buscar o slug do funil

**4. Atualizar `FunnelBuilder.tsx`**
- Adicionar botão "Preview" no header ao lado do Share, que abre `/funnel/${funnel.slug}?preview=true` numa nova tab
- Passar o slug do funil para `FunnelStepsTab` como prop

### Ficheiros
- **Criar:** `src/pages/PublicFunnelPage.tsx`
- **Editar:** `src/App.tsx` (adicionar rota)
- **Editar:** `src/components/funnels/FunnelBuilder.tsx` (botão preview no header, passar slug)
- **Editar:** `src/components/funnels/tabs/FunnelStepsTab.tsx` (onClick no ExternalLink)

