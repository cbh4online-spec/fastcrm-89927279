

## Pesquisa Ativa de Redes Sociais no Lead Enricher

### Problema
Atualmente, as redes sociais (LinkedIn, Facebook, Instagram, Twitter) só são extraídas se estiverem presentes no conteúdo do website da empresa (via scraping + IA). Se o website não mencionar links sociais, o lead fica sem essa informação.

### Solução
Adicionar um **bloco de pesquisa ativa** após o passo 4 (AI enrichment) que usa **Firecrawl Search** para encontrar perfis de redes sociais quando a IA não os conseguiu extrair do website.

### Alterações

**`supabase/functions/contact-enrich/index.ts`** — Novo passo 4b entre AI (passo 4) e Google Places (passo 5):

1. Após o AI enrichment, verificar se `linkedinUrl`, `facebookUrl`, `instagramUrl` ou `twitterUrl` ficaram vazios
2. Se o nome da empresa existe e faltam perfis sociais, fazer até 2 pesquisas Firecrawl:
   - **Pesquisa 1**: `"<nome empresa>" LinkedIn OR Facebook OR Instagram site:linkedin.com OR site:facebook.com OR site:instagram.com`
   - **Pesquisa 2** (se necessário): `"<nome empresa>" Twitter OR X site:twitter.com OR site:x.com`
3. Parsear os URLs retornados e preencher os campos correspondentes com `confidence: "medium"` e `source: "Pesquisa web"`
4. Validar URLs com regex para cada plataforma (ex: `linkedin.com/company/`, `facebook.com/`, `instagram.com/`, `twitter.com/` ou `x.com/`)

**Condições de execução**:
- Só executa se `webscrapingEnabled` estiver activo e `FIRECRAWL_API_KEY` disponível
- Só pesquisa os perfis que faltam (não sobrescreve dados já encontrados pela IA)
- Limitado a 3 resultados por pesquisa para poupar créditos

### Resultado esperado
Leads passarão a ter perfis de redes sociais descobertos mesmo que o website da empresa não os mencione. O ICP Fit Score também beneficia, pois a presença social contribui +10 pontos.

