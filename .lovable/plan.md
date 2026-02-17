

# Alterar URL das Bio Pages de UUID para slug legivel

## Problema actual
O URL publico das Bio pages usa o formato `/b/{workspace_uuid}/{page_slug}`, resultando em links como:
`/b/d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f/consultoria-marketing-digital-pro`

O formato desejado e:
`/bio/metodopare` (usando o slug do workspace em vez do UUID)

**Nota:** O workspace `d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f` ja tem o slug `metodopare` na base de dados.

## Alteracoes

### 1. Rota no `App.tsx`
- Mudar de `/b/:workspaceId/:pageSlug` para `/bio/:workspaceSlug/:pageSlug`
- Segue o padrao ja usado pelo Store (`/store/:workspaceSlug`) e Landing Pages

### 2. `src/pages/PublicBioPage.tsx`
- Mudar param de `workspaceId` para `workspaceSlug`
- Primeiro resolver o workspace pelo slug (query `workspaces` WHERE `slug = workspaceSlug`), seguindo o mesmo padrao do `PublicLandingPage.tsx`
- Depois buscar a `bio_page` usando o `workspace.id` resultante

### 3. URLs de copia/preview (3 locais)
- `src/components/bio/BioPageBuilder.tsx`: mudar `getPublicBaseUrl()/b/${workspace_id}/${slug}` para `getPublicBaseUrl()/bio/${workspace_slug}/${slug}`
  - Precisa buscar o workspace slug (ou receber como prop)
- `src/pages/BioOS.tsx`: mesma alteracao nos botoes de copiar link e abrir pagina
- `src/pages/BioOS.tsx`: actualizar texto de preview do slug no formulario de criacao

### 4. Obter workspace slug
- No `BioPageBuilder` e `BioOS`, o hook `useWorkspace()` ja existe e fornece o workspace actual com o slug -- basta usar `workspace.slug` em vez de `page.workspace_id`

## Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/App.tsx` | Rota `/b/:workspaceId/:pageSlug` -> `/bio/:workspaceSlug/:pageSlug` |
| `src/pages/PublicBioPage.tsx` | Resolver workspace por slug antes de buscar bio_page |
| `src/components/bio/BioPageBuilder.tsx` | URLs com `/bio/${workspace.slug}/${page.slug}` |
| `src/pages/BioOS.tsx` | URLs com `/bio/${workspace.slug}/${page.slug}` |

## Resultado
O link final sera: `https://fastcrm.metodopare.ai/bio/metodopare/consultoria-marketing-digital-pro`

**Nota:** Se cada workspace tiver apenas uma bio page principal, o `pageSlug` continua necessario para suportar multiplas paginas por workspace. Se preferir que `/bio/metodopare` funcione sem o page slug (redireccionando para a pagina principal), isso pode ser adicionado como melhoria futura.
