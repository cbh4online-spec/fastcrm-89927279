
# Fix: Imagens e meta tags OG dinamicas para partilha de links

## Problema

Quando se partilha um link de funil/vertical (ex: `https://fastcrm.metodopare.ai/imobiliarias`) no WhatsApp, Facebook ou LinkedIn, a pre-visualizacao mostra sempre a imagem e descricao generica do FastCRM. Isto acontece porque os crawlers destes servicos nao executam JavaScript -- leem apenas o HTML inicial servido pelo servidor, que e sempre o `index.html` com os OG tags estaticos do FastCRM.

## Causa Raiz

A aplicacao e uma SPA (Single Page Application). O `index.html` tem:
```html
<meta property="og:title" content="FastCRM - CRM Inteligente" />
<meta property="og:description" content="Plataforma de CRM inteligente..." />
<meta property="og:image" content="/og-image.png" />
```

O react-helmet actualiza estas tags no browser, mas os crawlers nunca executam o React.

## Solucao

Criar uma **edge function `og-proxy`** que serve HTML minimo com os OG tags correctos para cada tipo de pagina. Os links de partilha passam a apontar para esta funcao, que:

1. Detecta se o visitante e um crawler (via User-Agent) -> serve HTML com OG tags correctos
2. Se for um utilizador real -> faz redirect 302 para a pagina SPA

### Tipos de pagina suportados

| Tipo | Slug exemplo | Fonte dos dados |
|------|-------------|-----------------|
| vertical | imobiliarias, clinicas | `verticalConfigs` estatico + `vertical_templates` DB |
| bio | workspace/page | tabela `bio_pages` |
| landing | workspace/page | tabela `landing_pages` |
| store | workspace | tabela `workspace_store_settings` |
| product | workspace/id | tabela `products` |

### Fluxo

```text
Link partilhado: https://fastcrm.lovable.app/api/og?type=vertical&slug=imobiliarias

Crawler (WhatsApp):
  -> Edge function serve HTML com OG tags da vertical "imobiliarias"
  -> WhatsApp le titulo, descricao e imagem correctos

Utilizador real:
  -> Edge function faz redirect 302 para https://fastcrm.lovable.app/imobiliarias
  -> Utilizador ve a pagina normal
```

## Alteracoes

### 1. Nova Edge Function: `supabase/functions/og-proxy/index.ts`

- Recebe query params: `type` (vertical, bio, landing, store, product) e `slug`
- Para verticais estaticas: mapeamento interno dos dados SEO (titulo, descricao)
- Para paginas dinamicas (bio, landing, store): consulta a base de dados
- Serve HTML minimo com OG tags + redirect JS para utilizadores reais
- Detecta crawlers via User-Agent (WhatsApp, Facebook, Twitter, LinkedIn, Telegram, Discord, Slack)

### 2. Actualizar componentes de partilha

Actualizar os componentes que geram links de partilha para usar o URL do og-proxy em vez do URL directo:
- `ShareButtons.tsx` (ja recebe url como prop)
- Copiar link nas listas de funis/verticais/bio

Criar uma funcao utilitaria `getShareUrl(type, slug)` que gera o URL correcto:
```text
getShareUrl("vertical", "imobiliarias")
-> https://[supabase-url]/functions/v1/og-proxy?type=vertical&slug=imobiliarias
```

### 3. Actualizar paginas que geram links de partilha

- `LandingPagesList.tsx` - links de partilha das landing pages
- `BioOS.tsx` - links de partilha das bio pages  
- Componentes de vertical landing que mostram URLs

## Detalhes Tecnicos

### Mapeamento de verticais estaticas (dentro da edge function)

```text
clinicas -> "FastCRM para Clinicas - Sistema com IA para Gestao Clinica"
imobiliarias -> "FastCRM para Imobiliarias - Pipeline Inteligente com IA"
formacao -> "FastCRM para Centros de Formacao..."
condominios -> ...
agencias -> ...
empresas -> ...
```

### Template HTML servido aos crawlers

```text
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="[titulo dinamico]" />
  <meta property="og:description" content="[descricao dinamica]" />
  <meta property="og:image" content="[imagem dinamica ou fallback]" />
  <meta property="og:url" content="[url real da pagina]" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=[url real]" />
</head>
<body>Redirecting...</body>
</html>
```

### Deteccao de crawlers

```text
User-Agents detectados:
- facebookexternalhit, Facebot
- WhatsApp
- Twitterbot
- LinkedInBot
- TelegramBot
- Slackbot
- Discordbot
- Googlebot (para SEO)
```

## Resultado

- Cada link partilhado no WhatsApp/Facebook/LinkedIn mostra titulo, descricao e imagem especificos da pagina
- Utilizadores reais sao redirecionados transparentemente para a pagina correcta
- Sem impacto na performance da SPA existente
- Extensivel para novos tipos de pagina no futuro
