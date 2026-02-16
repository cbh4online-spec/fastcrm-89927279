
# Corrigir URLs dos Templates Dinamicos: remover `/v/` do path

## Problema

Os templates dinamicos (criados via DB) usam o prefixo `/v/` no URL (ex: `/v/ginasios`), enquanto os estaticos usam o slug directo (ex: `/clinicas`). Todos devem seguir o mesmo padrao: `https://fastcrm.metodopare.ai/{slug}`.

## O que vai mudar

### 1. Rota no `src/App.tsx`

Substituir a rota `/v/:slug` por `/:slug` e mover para o final das rotas (catch-all) para nao interferir com outras rotas existentes:

```text
- <Route path="/v/:slug" element={<VerticalLandingPage />} />
+ <Route path="/:slug" element={<VerticalLandingPage />} />
```

Esta rota catch-all deve ser a **ultima** rota definida, para que todas as outras rotas especificas tenham prioridade.

### 2. Logica no `src/pages/VerticalLandingPage.tsx`

Simplificar a extraccao do slug -- agora vem sempre de `params.slug` ou do pathname directamente (sem prefixo `/v/`):

```text
const slug = params.slug || location.pathname.replace("/", "");
```

Isto ja funciona correctamente, apenas o comentario precisa de ser actualizado.

### 3. Link nos cards em `src/components/landing-pages/LandingPagesList.tsx`

Corrigir o URL de abertura dos templates custom:

```text
- window.open(`${getPublicBaseUrl()}/v/${tpl.slug}`, "_blank")
+ window.open(`${getPublicBaseUrl()}/${tpl.slug}`, "_blank")
```

### 4. Remover rotas estaticas redundantes (opcional mas recomendado)

Com a rota `/:slug` como catch-all, as rotas estaticas individuais (`/clinicas`, `/imobiliarias`, etc.) tornam-se redundantes e podem ser removidas para simplificar.

## Ficheiros a editar

- `src/App.tsx` -- substituir `/v/:slug` por `/:slug` (e opcionalmente remover rotas estaticas individuais)
- `src/components/landing-pages/LandingPagesList.tsx` -- corrigir URL de `/v/${slug}` para `/${slug}`
- `src/pages/VerticalLandingPage.tsx` -- actualizar comentario

## Risco

A rota `/:slug` como catch-all pode capturar URLs que nao sao templates. O `VerticalLandingPage` ja trata este caso mostrando a pagina NotFound quando o slug nao existe, portanto o comportamento e seguro.
