

## Plano: Integração de 9 Portais de Emprego Portugueses

### Contexto

O sistema actual permite pesquisar vagas via Firecrawl (busca web) ou importar feeds RSS manualmente. O objectivo é integrar 9 portais de emprego como fontes pré-configuradas, permitindo importação com um clique e aumentando a visibilidade das vagas agregadas no portal público.

### Portais a Integrar

| Portal | URL | Método |
|--------|-----|--------|
| JobLeads | jobleads.com | Scrape/Search |
| DataAnnotation | dataannotation.tech | Scrape |
| Sapo Emprego | emprego.sapo.pt | Scrape/Search |
| Alerta Emprego | alertaemprego.pt | Scrape/Search |
| Portal Emprego | portalemprego.pt | Scrape/Search |
| Indeed PT | pt.indeed.com | Search (já parcialmente suportado) |
| Expresso Emprego | expressoemprego.pt | Scrape/Search |
| IEFP | iefp.pt/emprego | Scrape |
| Emprego Público | empregopublico.gov.pt | Scrape |

### Alterações Planeadas

#### 1. Catálogo de Portais Pré-Configurados (Frontend)

Adicionar ao `TalentSearchPage.tsx` uma secção "Portais Integrados" com cards para cada portal, incluindo:
- Logo (favicon via Google S2)
- Nome e descrição curta
- Botão "Importar vagas" que dispara a pesquisa automaticamente
- Estado de última importação (timestamp + contagem)

Substituir o input manual de RSS por um selector de portais + campo de pesquisa opcional (keywords/localização).

#### 2. Actualização da Edge Function `hr-talent-search`

Adicionar um novo modo `portal_import` que:
- Recebe `portal_slug` + `keywords` opcionais
- Usa Firecrawl Search com queries optimizadas por portal (ex: `site:emprego.sapo.pt ${keywords}`)
- Para portais com estrutura conhecida (IEFP, Emprego Público), usa Firecrawl Scrape directamente nas páginas de listagem
- Detecta a plataforma correctamente para os 9 portais na função de detecção existente
- Deduplica resultados por `source_url` antes de inserir

#### 3. Detecção de Plataforma Expandida

Actualizar o mapeamento de plataformas na edge function para reconhecer todos os 9 domínios:

```text
jobleads.com       → JobLeads
dataannotation.tech → DataAnnotation
emprego.sapo.pt    → Sapo Emprego
alertaemprego.pt   → Alerta Emprego
portalemprego.pt   → Portal Emprego
pt.indeed.com      → Indeed PT
expressoemprego.pt → Expresso Emprego
iefp.pt            → IEFP
empregopublico.gov.pt → Emprego Público
```

#### 4. Logos no Portal Público (`CareersPage.tsx`)

Actualizar `getFaviconUrl` para usar favicons de alta qualidade e adicionar ícones específicos por plataforma nos cards de vagas externas.

### Ficheiros a Modificar

1. **`supabase/functions/hr-talent-search/index.ts`** — Novo modo `portal_import`, detecção de plataforma expandida, deduplicação
2. **`src/pages/dashboard/hr/recruitment/TalentSearchPage.tsx`** — Secção de portais pré-configurados com importação one-click
3. **`src/hooks/hr/useTalentSearch.ts`** — Novo hook/mutation para importação por portal
4. **`src/pages/public/CareersPage.tsx`** — Melhorar logos e labels das plataformas

### Critérios de Aceitação

- Utilizador pode importar vagas de qualquer dos 9 portais com um clique
- Resultados aparecem automaticamente no portal público `/careers/{slug}`
- Deduplicação por URL evita vagas repetidas
- Plataforma correctamente identificada em cada resultado
- Logos visíveis nos cards do portal público

### Riscos

- Portais governamentais (IEFP, Emprego Público) podem bloquear scraping — fallback para search
- Créditos Firecrawl consumidos por cada importação — alertar utilizador
- Estrutura HTML dos portais pode mudar — parsing via IA mitiga este risco

