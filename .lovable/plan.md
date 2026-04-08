

## Problema

Quando um link direto de produto (ex: `fastcrm.metodopare.ai/store/simplesedivertido/product/...`) é colado no Facebook, o crawler do Facebook **não executa JavaScript**. Portanto, apenas vê as meta tags genéricas do `index.html` (imagem: banner FastCRM, título: "FastCRM com Método PARE") em vez da imagem e título do produto.

O sistema já tem uma edge function `og-proxy` que serve OG tags corretas server-side, mas só é usada pelos botões de partilha internos.

## Solução

Criar uma edge function de **rewrite/proxy** que intercepta URLs diretas da loja quando acedidas por crawlers, servindo as meta tags OG corretas com a imagem do produto.

### 1. Nova edge function: `store-og-rewrite`

Uma edge function leve que:
- Recebe o path da loja (ex: `/store/{slug}/product/{id}`)
- Deteta se o user-agent é crawler (Facebook, WhatsApp, Twitter, etc.)
- Se for crawler: consulta a BD, obtém dados do produto (nome, descrição, imagem) e serve HTML com OG tags corretas (reutilizando a lógica do `og-proxy` existente)
- Se for utilizador real: faz redirect 302 para o URL direto da SPA

### 2. Atualizar `og-proxy` para aceitar paths diretos

Em vez de criar uma nova função, **estender a edge function `og-proxy` existente** para também aceitar um parâmetro `path` (ex: `?path=/store/simplesedivertido/product/12d8e...`), fazendo parse automático do tipo e slug a partir do path.

### 3. Configuração no custom domain

Adicionar regras de rewrite no hosting (ou via Cloudflare/proxy reverso) para redirecionar crawlers para a edge function. Como alternativa pragmática:

**Abordagem implementável sem configuração de hosting:**

- Adicionar um **`_redirects`** ou configurar no domínio customizado um worker/rule que deteta crawlers e redireciona para `og-proxy`
- OU, a solução mais prática: **garantir que todos os pontos de cópia/partilha de URL usam `getShareUrl()`** em vez do URL direto

### 4. Corrigir todos os pontos de partilha

Verificar e corrigir:
- **Copy link** nos botões de partilha: já usa `getShareUrl()` ✓
- **URL do browser** (address bar): impossível controlar diretamente
- **Canonical URL** no `ProductSeoHead`: manter o URL direto para SEO do Google (que executa JS)

### Plano de implementação recomendado

Como não é possível controlar o URL que o utilizador cola manualmente (da barra de endereço), a solução robusta é:

**A) Estender `og-proxy` para parsing de paths diretos**
- Aceitar `?path=/store/slug/product/id` como alternativa a `?type=product&slug=slug/id`
- Manter retrocompatibilidade com o formato atual

**B) Adicionar regra de rewrite no domínio customizado**
- Configurar no proxy reverso / Cloudflare uma regra: se user-agent é crawler E path começa com `/store/`, redirecionar para `og-proxy?path={original_path}`
- Isto resolve o problema para **qualquer URL** colado, sem depender dos botões de partilha

**C) Fallback: melhorar index.html**
- Não resolve por produto, mas pode incluir meta tags genéricas mais úteis como fallback

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/og-proxy/index.ts` | Adicionar parsing de `?path=` para extrair tipo e slug automaticamente |
| Configuração de domínio/proxy | Regra de rewrite para crawlers (requer configuração externa) |

### Limitação

A solução completa (crawlers verem OG tags no URL direto) requer configuração no proxy reverso do domínio `fastcrm.metodopare.ai`. Se o domínio está no Cloudflare, pode-se criar um Worker. Sem isso, apenas os links partilhados via botões internos terão OG tags corretas.

### Critérios de aceitação

- Ao partilhar `og-proxy?path=/store/simplesedivertido/product/{id}` no Facebook, aparece imagem, título e preço do produto
- Links existentes via `getShareUrl()` continuam a funcionar
- Utilizadores reais são redirecionados para a página correta sem delay perceptível

