

## Análise: Dados Atuais vs Dados Possíveis

### O que o Enricher recolhe HOJE

O `contact-enrich` edge function atualmente extrai apenas:
- **Empresa** (do domínio do email)
- **País/Idioma** (do código do telefone)
- **Canal preferido** (do histórico de conversas)
- **Cargo/Função** (via IA, se houver website)
- **Website da empresa** (do domínio do email)

### O que PODE ser adicionado (campos já existem na tabela `leads`)

A tabela já tem colunas vazias que o enricher poderia preencher:

1. **Indústria/Setor** (`industry`) — via scraping do website + IA
2. **Nº de Funcionários** (`number_of_employees`) — via scraping/IA
3. **Receita Anual estimada** (`annual_revenue`) — via IA com base no website
4. **Pessoa de Contacto e Cargo** (`contact_person`, `contact_person_role`) — via IA
5. **Morada completa** (`address`, `postal_code`, `region`, `county`, `parish`) — via Google Places ou scraping
6. **Descrição/About** (`about`, `activity_description`) — via scraping do website
7. **Redes sociais** (`linkedin_url`, `facebook_url`, `instagram_url`, `twitter_url`) — via scraping do website
8. **NIF e dados fiscais** (`tax_id`, `cae_codes`, `cae_description`, `legal_nature`, `capital_social`, `founding_date`) — já existe o `lookup-company-nif` edge function
9. **Instagram métricas** (`instagram_followers_count`, `instagram_bio`, etc.) — já existe o `enrich-instagram-profile` edge function
10. **ICP Fit Score** (`icp_fit_score`) — calculável via IA com base nos dados enriquecidos

### Plano de Implementação

#### 1. Expandir o prompt IA no `contact-enrich`
- Pedir à IA que extraia do website: indústria, nº funcionários, receita estimada, descrição, redes sociais
- Usar tool calling estruturado em vez de JSON livre

#### 2. Integrar Google Places (já existe `google-places-enrich`)
- Após identificar a empresa, chamar Google Places para morada completa
- Preencher `address`, `city`, `postal_code`, `region`

#### 3. Integrar NIF lookup (já existe `lookup-company-nif`)
- Se o lead for empresa portuguesa, tentar lookup por nome
- Preencher campos fiscais (`tax_id`, `cae_codes`, `legal_nature`, etc.)

#### 4. Integrar Instagram enrich (já existe `enrich-instagram-profile`)
- Se o lead tiver `instagram_url`, extrair métricas do perfil

#### 5. Calcular ICP Fit Score
- Com os novos dados, calcular score de adequação ao perfil ideal de cliente

#### 6. Atualizar `useLeadEnrichment.ts`
- Mapear os novos campos retornados para updates na tabela `leads`
- Propagar dados adicionais para `companies` e `contacts`

#### 7. Adicionar toggles nas configurações
- Novos switches: "Google Places", "NIF Lookup", "Instagram Enrich", "ICP Score"
- No `LeadEnricherSettings` e na UI de configurações

### Detalhes técnicos

```text
contact-enrich (expandido)
├── Email domain → empresa + website
├── Phone → país + idioma
├── Firecrawl scrape → conteúdo do website
├── IA (Gemini) → cargo, indústria, funcionários, receita, descrição, redes sociais
├── Google Places → morada completa
├── NIF lookup → dados fiscais (empresas PT)
├── Instagram profile → métricas sociais
└── ICP Score → cálculo final
```

**Ficheiros a alterar:**
- `supabase/functions/contact-enrich/index.ts` — expandir IA e integrar sub-serviços
- `src/hooks/useLeadEnrichment.ts` — mapear novos campos
- `src/hooks/useLeadEnricherSettings.ts` — adicionar novos toggles
- Página de configurações do Lead Enricher — novos switches na UI

