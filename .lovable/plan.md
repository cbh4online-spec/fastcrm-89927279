# Ser encontrado e citado por LLMs (ChatGPT, Perplexity, Gemini)

Já existe uma base: `robots.txt` permite bots de IA, e há `llm.txt`, `llms.txt`, `llm.html` e `sitemap.xml`. O que falta é atualizar, aprofundar e ligar tudo para que os modelos consigam ler, perceber e citar o FastCRM com informação correta.

## O que fica melhor para quem procura

1. **Ficheiro-fonte único e atual** — `llms.txt` (padrão que o ChatGPT, Perplexity e Claude usam) passa a ser o índice canónico, com links para cada página relevante e uma frase de contexto por link. O `llm.txt` (versão factual longa) fica alinhado com preços, módulos e contactos atuais — as datas atuais dizem "2026-05-08" e há dados provavelmente desatualizados.
2. **Página pública "FastCRM para IA"** (`/llm.html` já existe) reescrita como página real e legível: o que é, para quem, módulos, preços, integrações, conformidade RGPD/e-Fatura, FAQ. É a página que um LLM cita.
3. **Bloco de FAQ em texto** nas páginas de marketing (home, funcionalidades, preços) — perguntas diretas com respostas curtas e factuais, o formato que os modelos extraem melhor.
4. **Dados estruturados JSON-LD** nas páginas públicas: `Organization`, `SoftwareApplication` (com `offers` dos planos START/GROW/PRO) e `FAQPage`. Hoje só existem em algumas landings, não nas páginas de marketing principais.
5. **Sitemap com datas reais** e inclusão de `llms.txt`.

## Estrutura técnica

- `public/llms.txt` — reescrito no formato padrão: título, resumo, secções `## Docs`, `## Produto`, `## Optional`, cada linha `- [Título](URL absoluta): descrição`. URLs absolutas (hoje são relativas, o que reduz a utilidade para crawlers).
- `public/llm.txt` — atualizar preços, módulos, contactos (a partir da memória `mem://project/identity/corporate-metadata`) e data.
- `public/llm.html` — página HTML semântica (h1 único, h2 por secção, tabelas de planos), com `<link rel="canonical">` e JSON-LD `FAQPage` embebido.
- `src/marketing/**` — componente `MarketingFaqSection` reutilizável (perguntas/respostas em texto real, não só accordion JS) usado em home, funcionalidades e preços.
- Reutilizar `src/modules/growth-seo/components/seo/SEOHead.tsx` para injetar JSON-LD `Organization` + `SoftwareApplication` + `FAQPage` nas páginas de marketing.
- `public/sitemap.xml` — `lastmod` atualizados e entrada para `/llms.txt`.
- `public/robots.txt` — acrescentar as linhas `Sitemap:` e uma referência em comentário ao `llms.txt`; confirmar bots recentes (ClaudeBot, Google-Extended, Applebot-Extended, PerplexityBot, Bytespider).

## Critérios de aceitação

- `/llms.txt`, `/llm.txt` e `/llm.html` respondem 200 com conteúdo atual e coerente entre si.
- Todas as URLs nesses ficheiros são absolutas e resolvem sem redireção.
- Páginas de marketing servem JSON-LD válido (Organization, SoftwareApplication com preços, FAQPage).
- FAQ visível em texto na home, funcionalidades e preços.
- Sitemap com datas reais e sem 404.

## Riscos e pontos por validar

- Confirmar preços e contactos atuais antes de publicar (fonte da verdade: planos em `src/marketing/data/pricingPlans.ts`).
- O site é SPA: os bots de IA nem sempre executam JavaScript. Os ficheiros estáticos (`llm.txt`, `llms.txt`, `llm.html`) e o JSON-LD em `index.html` são o que garante leitura sem JS — as FAQ em React são complemento, não substituto.
- Ser citado por LLMs depende também de menções externas (diretórios, artigos); isto trata só da parte controlável no site.
