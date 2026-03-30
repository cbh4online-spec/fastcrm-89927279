

# Gestão de Páginas Legais no Backoffice

## Diagnóstico

Actualmente, o conteúdo das 4 páginas legais (Privacidade, Termos, RGPD, Cookies) está **hardcoded em TSX**. O backoffice RGPD só gere dados da empresa (nome, NIF, morada, emails). Não existe forma de editar o texto das páginas sem alterar código.

## Abordagem

Armazenar o conteúdo de cada página legal como JSON na tabela `admin_settings` (já existente, com RLS para super_admin). Cada página terá uma chave (ex: `legal_page_privacy`) com um array de secções editáveis.

### Estrutura de dados

```json
{
  "title": "Política de Privacidade",
  "description": "Meta description...",
  "lastUpdated": "2026-03-30",
  "sections": [
    { "title": "1. Responsável pelo Tratamento", "content": "O responsável..." },
    { "title": "2. Dados Recolhidos", "content": "Recolhemos..." }
  ]
}
```

## Plano de Implementação

### 1. Hook `useLegalPageContent`
- Leitura/escrita de conteúdo de página legal em `admin_settings`
- Chaves: `legal_page_privacy`, `legal_page_terms`, `legal_page_gdpr`, `legal_page_cookies`
- Inicialização automática com o conteúdo actual hardcoded como default

### 2. Hook `usePublicLegalPage`
- Versão pública (sem autenticação) para as páginas front-end
- Fallback para defaults hardcoded se não existir na DB
- Necessita RLS `SELECT` para anon/public na `admin_settings` filtrado por chave `legal_page_*`, ou usar edge function

**Nota importante**: a tabela `admin_settings` tem RLS restrito a super_admin. Para as páginas públicas lerem o conteúdo, criar uma **database function `SECURITY DEFINER`** que retorna apenas as chaves `legal_page_%` sem exigir autenticação.

### 3. Componente `LegalPageEditor`
- Interface no backoffice com tabs para cada página (Privacidade, Termos, RGPD, Cookies)
- Cada tab mostra lista de secções editáveis (título + textarea com conteúdo)
- Botões para adicionar/remover/reordenar secções (drag ou setas)
- Campo para título da página, meta description e data de última actualização
- Botão guardar com preview
- Suporte para variáveis dinâmicas: `{{company_name}}`, `{{email_dpo}}`, `{{email_general}}`, `{{address}}`, `{{nif}}`, `{{phone}}` — substituídas automaticamente na renderização pública

### 4. Expandir GDPRBackofficePage
- Adicionar tabs: "Dados da Empresa" (actual) + "Privacidade" + "Termos" + "RGPD" + "Cookies"
- Cada tab legal usa o `LegalPageEditor`

### 5. Actualizar páginas públicas
- `PrivacyPolicyPage`, `TermsOfUsePage`, `GDPRPage`, `CookiePolicyPage` passam a ler conteúdo da DB via `usePublicLegalPage`
- Substituem variáveis `{{company_name}}` etc. pelos dados reais
- Mantêm o layout actual (`LegalPageLayout`) mas o conteúdo vem da DB
- Fallback para conteúdo hardcoded actual se DB vazio

### 6. Migration: função pública de leitura

```sql
CREATE OR REPLACE FUNCTION public.get_legal_page_content(page_key text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM admin_settings WHERE key = page_key AND key LIKE 'legal_page_%'
$$;
```

## Ficheiros

| Ficheiro | Alteração |
|---|---|
| `supabase/migrations/new` | Função `get_legal_page_content` |
| `src/modules/growth-seo/hooks/useLegalPageContent.ts` | Novo — CRUD admin |
| `src/modules/growth-seo/hooks/usePublicLegalPage.ts` | Novo — leitura pública |
| `src/modules/growth-seo/components/admin/LegalPageEditor.tsx` | Novo — editor de secções |
| `src/modules/growth-seo/pages/GDPRBackofficePage.tsx` | Expandir com tabs por página |
| `src/modules/growth-seo/pages/PrivacyPolicyPage.tsx` | Ler conteúdo da DB |
| `src/modules/growth-seo/pages/TermsOfUsePage.tsx` | Ler conteúdo da DB |
| `src/modules/growth-seo/pages/GDPRPage.tsx` | Ler conteúdo da DB |
| `src/modules/growth-seo/pages/CookiePolicyPage.tsx` | Ler conteúdo da DB |
| `src/modules/growth-seo/index.ts` | Exportar novos hooks |

## Critérios de Aceitação
- Super admin pode editar título, descrição, data e secções de cada página legal
- Variáveis dinâmicas (empresa, emails) são substituídas na renderização
- Páginas públicas mostram conteúdo da DB com fallback para o actual
- Conteúdo inicial pré-populado com o texto hardcoded existente

