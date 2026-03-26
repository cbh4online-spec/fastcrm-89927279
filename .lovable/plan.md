

## Diagnóstico: Porque o Lead Enricher não funciona

Identifiquei o problema raiz. A grande maioria dos teus leads (992 pendentes) são **empresas sem email nem telefone** — visível no ecrã com "Sem contacto". O motor de enriquecimento (`contact-enrich`) depende **completamente do email** para funcionar:

1. Extrai domínio do email → busca empresa no CRM → define website
2. Sem website, **salta toda a análise IA, Firecrawl, Google Places, NIF, Instagram**
3. Resultado: retorna `{}` vazio → nada é atualizado no lead → fica eternamente "Pendente"

Basicamente, um lead só com nome de empresa (ex: "ZPC - Serviços Informáticos") passa por toda a pipeline sem que nenhuma etapa se active.

---

## Plano de Correção

### 1. Adicionar path de enriquecimento por nome de empresa
Quando não há email nem phone, usar o **nome da empresa** como sinal primário:
- Pesquisar website via **Firecrawl Search** (`firecrawl-search`) usando o nome da empresa
- Se encontrar website, prosseguir com o fluxo normal de AI + scraping

### 2. Alterações na Edge Function `contact-enrich`
- **Novo bloco** entre os passos 1 e 4 (após extrações de email/phone): se `result.companyWebsite` ainda é `null` e existe `name` ou `company_name`, fazer Firecrawl search para descobrir o website
- Usar o website encontrado para alimentar o resto do pipeline (AI, Google Places, NIF)
- Garantir que o `company_name` do lead é usado como `result.company.value` quando não há email

### 3. Bug fix: variável `workspace_id` inexistente
- Linha 352: `logAIUsage` usa `workspace_id` (não existe), deveria ser `workspaceId` — causa erro silencioso na instrumentação

### 4. Melhorar o `getEnrichmentStatus`
- Incluir `website` e `industry` nos campos de enriquecimento para refletir melhor o que foi preenchido por empresa

### Ficheiros a modificar
- `supabase/functions/contact-enrich/index.ts` — novo path de busca por nome + bug fix
- `src/hooks/useLeadEnrichment.ts` — passar `company_name` no body + melhorar status check

### Resultado esperado
Leads com apenas nome de empresa passarão a ser enriquecidos: website descoberto via Firecrawl → AI extrai indústria, empregados, revenue, redes sociais → Google Places adiciona morada → NIF lookup adiciona dados fiscais. O status passará de "Pendente" para "Parcial" ou "Enriquecido".

