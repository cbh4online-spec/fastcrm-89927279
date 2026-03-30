

# Corrigir redes sociais no footer das páginas públicas (SEOFooter)

## Diagnóstico
O `SEOFooter.tsx` tem links de redes sociais hardcoded para URLs fictícios (`twitter.com/fastcrm`, `linkedin.com/company/fastcrm`). O utilizador quer que apontem para as redes da Metodopare. Os campos `linkedin_url`, `facebook_url`, etc. existem na tabela `workspaces` mas estão todos `null`, e o footer é público (sem contexto de workspace/auth).

## Solução
Armazenar os links das redes sociais em `admin_settings` (chave `company_social_links`), seguindo o mesmo padrão de `company_legal_data`. Criar um hook público para os consumir e atualizar o SEOFooter para usar dados dinâmicos. Incluir também Facebook e Instagram (além de Twitter/X e LinkedIn).

## Plano

### 1. Criar setting `company_social_links` na DB
Inserir entrada em `admin_settings` com os URLs reais da Metodopare (o utilizador terá de fornecer os URLs, ou deixamos defaults vazios editáveis via backoffice).

### 2. Expandir `usePublicCompanyData` 
Adicionar query para `company_social_links` e expor os links sociais (`linkedin_url`, `facebook_url`, `instagram_url`, `twitter_url`).

### 3. Atualizar `SEOFooter.tsx`
- Importar e usar os links sociais dinâmicos
- Renderizar apenas os ícones cujos URLs existam (não vazio)
- Adicionar ícones para Facebook e Instagram se existirem

### 4. (Opcional) Adicionar secção de redes sociais ao backoffice RGPD
Para permitir edição futura via UI.

### Ficheiros
- **Editado**: `src/modules/growth-seo/hooks/usePublicCompanyData.ts` (nova query)
- **Editado**: `src/modules/growth-seo/components/layout/SEOFooter.tsx` (links dinâmicos)
- **DB**: Insert em `admin_settings` com chave `company_social_links`

