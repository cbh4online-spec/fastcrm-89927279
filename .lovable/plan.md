

## Plano: Mover Lead Enricher para Marketing + Sincronizar dados enriquecidos com Contactos e Empresas

### Problema 1 — Menu lateral
O Lead Enricher não aparece no grupo **Marketing** da sidebar. Está registado no `extensionRegistry.ts` mas não tem entrada no `src/config/nav.v2.ts` dentro do `groupMarketing`.

### Problema 2 — Dados enriquecidos não aparecem em Contactos/Empresas
O `useLeadEnrichment.ts` atualiza apenas a tabela `leads` (linhas 123-129). Após enriquecer, os campos `company_name`, `website`, `city`, `inferred_profession` ficam no lead mas nunca são propagados para:
- **Contactos** (`contacts`) — se o lead tiver um contacto associado
- **Empresas** (`companies`) — se a empresa enriquecida existir ou precisar ser criada

### Solução

**Ficheiro 1: `src/config/nav.v2.ts`** (linha ~208)
- Adicionar entrada `leadEnricher` no grupo `groupMarketing`:
  ```
  { nameKey: "leadEnricher", name: "Lead Enricher", href: "/dashboard/lead-enricher", 
    icon: Sparkles, moduleSlug: "lead-enricher", iconColor: "text-indigo-500" }
  ```

**Ficheiro 2: `src/hooks/useLeadEnrichment.ts`** (após o update do lead, ~linha 130)
- Após atualizar o lead, propagar dados para entidades relacionadas:
  1. **Empresa**: Se `company_name` foi enriquecido, verificar se já existe na tabela `companies` (por nome + workspace). Se não existir, criar automaticamente com `name`, `website`, `city`. Se existir, atualizar campos em falta.
  2. **Contacto**: Se o lead tem `email` ou `phone` que corresponde a um contacto existente na tabela `contacts`, atualizar campos como `company`, `job_title`, `city`.
- Após criar/atualizar empresa, associar o `company_id` ao lead (se o campo existir na tabela leads).
- Invalidar queries de `contacts` e `companies` no `onSuccess`.

**Ficheiro 3: Traduções** — adicionar `leadEnricher` key nos ficheiros i18n relevantes.

### Resultado
- Lead Enricher aparece no menu Marketing
- Dados enriquecidos propagam automaticamente para Contactos e Empresas existentes/novos

