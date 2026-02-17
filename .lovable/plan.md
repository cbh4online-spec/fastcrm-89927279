
# Corrigir link publico Bio OS - Criar rota e pagina publica

## Problema
O link `https://fastcrm.metodopare.ai/b/{workspace_id}/{slug}` da erro porque:
1. Nao existe nenhuma rota `/b/...` registada no `App.tsx`
2. Nao existe nenhum componente de pagina publica que renderize os blocos Bio

O URL cai na rota catch-all `/:slug` que tenta renderizar uma `VerticalLandingPage`, resultando em erro.

## Solucao

### 1. Criar componente publico: `src/pages/PublicBioPage.tsx`
- Recebe `workspaceId` e `pageSlug` dos params da rota
- Busca a `bio_page` pelo `workspace_id` + `slug` (sem autenticacao, usando anon key)
- Verifica se `status === "live"`, caso contrario mostra 404
- Busca os `bio_blocks` associados, ordenados por `order_index`
- Renderiza cada bloco conforme o `block_type`:
  - **link/button**: botao clicavel com URL
  - **text**: paragrafo/titulo
  - **image**: imagem com alt text
  - **whatsapp**: botao WhatsApp com mensagem pre-definida
  - **social**: icones de redes sociais
  - **divider**: separador visual
  - **hero**: secao hero com titulo/subtitulo
  - **form**: formulario de contacto (cria contacto no CRM)
  - **video**: embed de video
  - **faq**, **testimonials**, **countdown**, etc.
- Aplica `primary_color` da pagina como cor de destaque
- Aplica `background_style` (cor, gradiente, imagem)
- Inclui meta tags SEO (`seo_title`, `seo_description`, `og_image`) via react-helmet-async
- Regista evento `page_view` na tabela `bio_events`
- Layout centrado, mobile-first, sem sidebar/navbar do CRM

### 2. Registar rota no `App.tsx`
- Adicionar rota `/b/:workspaceId/:pageSlug` no bloco de rotas publicas (ao nivel do `<Routes>` principal, antes do `CRMRoutes`)
- Segue o padrao existente do Store (`/store/*`) e C2C (`/c2c/:workspaceSlug`)
- Nao requer autenticacao nem providers do CRM

### 3. Politicas RLS (verificacao)
- Garantir que `bio_pages` e `bio_blocks` tem politica SELECT para `anon` (leitura publica das paginas live)
- Se nao existirem, criar migration para adicionar

## Detalhes tecnicos

### Ficheiros

| Ficheiro | Accao |
|----------|-------|
| `src/pages/PublicBioPage.tsx` | Criar - componente completo da pagina publica |
| `src/App.tsx` | Editar - adicionar rota `/b/:workspaceId/:pageSlug` |
| Migration SQL (se necessario) | RLS policies para leitura anon de `bio_pages` e `bio_blocks` |

### Fluxo de renderizacao
1. Visitante acede a `/b/{workspace_id}/{slug}`
2. Componente busca `bio_pages` WHERE `workspace_id` = param AND `slug` = param AND `status` = 'live'
3. Se encontrado, busca `bio_blocks` WHERE `bio_page_id` = page.id AND `is_visible` = true
4. Renderiza pagina com blocos, cores e meta tags
5. Regista `page_view` em `bio_events` (fire-and-forget)
6. Se nao encontrado, mostra pagina 404 estilizada
