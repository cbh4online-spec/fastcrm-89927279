## Objetivo

Permitir importar para o **HTML Builder Studio** uma **cópia integral e fiel** de qualquer site, landing ou funil público — todas as páginas, CSS, imagens, fontes, scripts permitidos, cores e layout — guardada dentro do workspace para edição. Argumento comercial: o cliente migra com 1 clique e fica preso à plataforma.

## Diagnóstico do estado atual

- `builder-import-url` (edge) faz fetch de **1 só URL** e devolve HTML em bruto, com `<src>`/`<href>` apenas absolutizados (continuam a apontar para o domínio original).
- `builder_assets` guarda `html` + `css` por asset, sem ligação entre páginas, sem storage de assets binários.
- Não existe tabela para "site multi-página", nem bucket no storage para os assets clonados.
- Já existem `firecrawl-*` edge functions a usar `FIRECRAWL_API_KEY` — temos infra para `map` (descobrir URLs) e `scrape` (HTML + screenshot + branding) sem reinventar crawler.

## Decisões de produto / UX

1. **Novo modo no diálogo "Novo asset" → tab "Clonar site completo"**
   - Input: URL inicial (ex.: `https://exemplo.com`).
   - Opções: profundidade máx. (1/2/3), nº máx. de páginas (10/50/200), incluir subdomínios (off por defeito), seguir só caminhos (regex opcional).
   - Pré-visualização: lista de URLs detetadas via `map` antes de iniciar a clonagem (utilizador pode des-marcar páginas).
2. **Resultado**: 1 asset do tipo `site` que agrega N páginas filhas + assets binários locais. Edição abre num **navegador interno** com árvore de páginas à esquerda.
3. **Estados visíveis**: progresso por página (`pendente / a clonar / ok / erro`), barra global, possibilidade de cancelar e retomar.
4. **Branding extraído** (Firecrawl `branding`) é guardado como `design_tokens` do site → útil no editor visual para "manter design".
5. **Link rewriting**: links internos passam a apontar para slugs internos do builder; assets externos (img/css/js/fonts) são re-escritos para URLs do bucket público do workspace.
6. **Garantias legais/segurança**: aviso pré-import "garante que tens direitos sobre o conteúdo", bloqueio de hosts privados (já existe), respeito por `robots.txt` opcional, limite de 200 páginas e 50 MB de assets por clone.

## Estrutura técnica

### Base de dados (migração)

```text
builder_sites               -- agrupa páginas de um clone
  id, workspace_id, asset_id (FK builder_assets), source_url,
  pages_count, status, design_tokens jsonb, created_*

builder_site_pages
  id, site_id, path, slug, title, html, status,
  source_url, order_index, created_*

builder_site_assets         -- imagens/css/js/fontes baixados
  id, site_id, original_url, storage_path,
  content_type, bytes, sha256, created_*
```

- RLS por `workspace_id` (via join a `builder_assets`).
- Bucket Storage **público** `builder-site-assets/{workspace_id}/{site_id}/...`.

### Edge Functions

1. `builder-site-discover` — recebe URL → chama Firecrawl `map` → devolve lista de URLs candidatas + branding inicial (Firecrawl `scrape` na home).
2. `builder-site-clone` — recebe `{ source_url, pages: string[], options }`:
   - cria registo em `builder_sites` + asset agregador,
   - para cada página: scrape HTML, parse com `linkedom`, extrai/baixa assets (img, link[rel=stylesheet], script[src] permitidos, fontes), rewrite de URLs, guarda `builder_site_pages`,
   - usa `Background.runUntilEnd`/processamento por lotes para não exceder timeout, emite progresso por canal Realtime (`channel: site:{id}`),
   - SSRF guard, limites de tamanho, `Content-Type` allow-list.
3. `builder-site-asset-fetch` (interno, chamado pelo clone) — faz download de 1 asset binário com timeout e upload ao bucket. Deduplica por sha256.

### Frontend

- `CreateBuilderAssetDialog`: nova tab `clone` com 2 passos (descobrir → confirmar páginas → iniciar).
- Hook `useSiteClone` com subscrição Realtime para mostrar progresso.
- Página `BuilderAssetEditorPage` ganha modo "site": árvore de páginas, switcher entre páginas, edição por página individual (reusa o editor existente).
- `BuilderPublicPage` resolve sub-rotas `/{slug-do-site}/{slug-da-pagina}` via nova RPC `get_published_builder_site_page`.

### Sanitização

- Reusar `sanitizeBuilderHtml` (já existe) para HTML por página.
- CSS externo é descarregado, guardado em `builder_site_assets` e re-injetado por referência no `<head>`.
- Scripts: por defeito **removidos**; checkbox opcional "manter scripts (risco)".

## Plano de implementação (ordem)

1. **Migração SQL**: tabelas `builder_sites`, `builder_site_pages`, `builder_site_assets` + RLS + bucket `builder-site-assets`.
2. **Edge `builder-site-discover`** (Firecrawl map + scrape inicial).
3. **Edge `builder-site-clone`** (loop scrape + rewrite + storage + progresso Realtime).
4. **UI tab "Clonar site"** no `CreateBuilderAssetDialog` (passo 1: URL → lista de páginas).
5. **UI confirmação** (selecionar/deselecionar páginas, opções avançadas).
6. **Hook `useSiteClone` + barra de progresso** (Realtime).
7. **Editor multi-página** (árvore lateral em `BuilderAssetEditorPage` quando `type=site`).
8. **Publicação multi-página** (RPC + resolução em `BuilderPublicPage` para sub-paths).
9. **QA**: clonar 3 sites reais (1 estático, 1 com fontes Google, 1 funil multi-step), verificar visual, links internos, mobile.

## Critérios de aceitação

- Clonar `https://exemplo.com` com 5 páginas resulta em 1 asset `site` + 5 `builder_site_pages` + N assets binários no bucket.
- A pré-visualização do site clonado é **pixel-similar** à original (≥ 90 % no Lighthouse de visual diff manual).
- Links internos navegam dentro do builder; nenhum recurso continua a fazer fetch ao domínio original.
- Cores e fontes detetadas aparecem nos `design_tokens` e ficam disponíveis no editor visual.
- Progresso e erros visíveis em tempo real; possibilidade de retomar páginas falhadas.
- RLS impede leitura cruzada entre workspaces.

## Riscos e pontos por validar

- **Direitos de autor**: precisamos de aviso explícito + log de quem clonou o quê.
- **Sites com SPA/JS pesado** (React/Vue): Firecrawl renderiza, mas estado interativo perde-se. Deixar claro que se clona o **resultado renderizado**, não a aplicação.
- **Custos Firecrawl**: cada clone consome créditos (1 por página + 1 por map). Mostrar estimativa antes de iniciar; ler [Cost Guard](mem://features/communications/cost-guard-module) para limites por workspace.
- **Tamanho de assets**: vídeos/PDFs grandes — propomos *skip* por defeito (>10 MB), apenas referência.
- **Timeout edge function** (150 s): clones grandes precisam de chunking + retomar; alternativa é mover para Trigger.dev (ver [Background Jobs](mem://architecture/scheduling/background-jobs-trigger-dev)) — recomendo Trigger.dev se >50 páginas.
- **Domínios com Cloudflare/anti-bot**: alguns sites bloqueiam Firecrawl; documentar fallback "pedir export ao cliente".
- **Funis com forms**: `<form action>` aponta para backend do cliente — re-escrever para um endpoint placeholder do workspace e avisar utilizador.

Pontos a confirmar contigo antes de implementar:
1. **Profundidade máxima por defeito**: 2 níveis e 50 páginas chega para 90 % dos casos?
2. **Onde correr clones grandes**: aceitas mover para Trigger.dev (mais robusto, +1 dia de trabalho) ou começamos só com edge function (limite ~30 páginas seguras)?
3. **Scripts JS originais**: removidos por defeito (recomendado) ou manter com aviso?
