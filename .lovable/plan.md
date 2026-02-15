
# FastCRM Vertical Landing System -- Metodo AIDA

## Visao Geral

Criar um sistema de landing pages verticais reutilizavel, alimentado por configuracao estatica (ficheiro de config por vertical), com template AIDA completo, formulario inteligente, e integracao automatica com o pipeline CRM existente.

## Arquitetura

O sistema sera composto por:

1. **Ficheiro de configuracao centralizado** (`src/config/verticalConfigs.ts`) com todas as verticais
2. **Componente de template AIDA reutilizavel** (`src/components/vertical-landing/`) com 7 blocos
3. **Pagina dinamica** que le o slug da rota e renderiza o template com a config correspondente
4. **Edge function** para processar submissions com criacao de lead, contacto, oportunidade e pipeline
5. **Rotas publicas** em `/clinicas`, `/imobiliarias`, `/formacao`, `/condominios`, `/agencias`, `/empresas`

## Plano Tecnico

### Fase 1: Configuracao e Dados

**Ficheiro:** `src/config/verticalConfigs.ts`

Cada vertical tera um objecto tipado com:
- `slug` (clinicas, imobiliarias, etc.)
- `nome` (Clinicas, Imobiliarias, etc.)
- `dor_principal` (frase curta)
- `resultado_prometido` (frase curta)
- `dores` (array de 4 strings)
- `modulos_ativos` (subset dos 7 modulos do FastCRM)
- `antes_depois` (objecto com arrays de strings)
- `roi_exemplo` (texto com simulacao)
- `cores` (primaria, accent)
- `cta_principal` e `cta_secundario`
- `ai_persona_nome` (ex: "AI CRM Clinicas Specialist")
- `seo` (title, description, canonical)

Verticais iniciais: clinicas, imobiliarias, formacao, condominios, agencias, empresas.

### Fase 2: Componentes do Template AIDA

Criar na pasta `src/components/vertical-landing/`:

| Componente | Bloco AIDA | Conteudo |
|---|---|---|
| `VerticalHero.tsx` | Atencao | Headline dinamica, subheadline, 2 CTAs, badge vertical |
| `VerticalProblems.tsx` | Interesse | 4 dores com icones, texto de impacto |
| `VerticalSolution.tsx` | Desejo | Modulos ativos filtrados da config |
| `VerticalTransformation.tsx` | Desejo | Antes vs Depois lado a lado |
| `VerticalAuthority.tsx` | Prova | Metricas da plataforma, badges de seguranca |
| `VerticalROI.tsx` | Desejo | Simulacao de ROI com numeros editaveis |
| `VerticalCTAForm.tsx` | Acao | Formulario completo (7 campos) com submit |
| `VerticalLandingTemplate.tsx` | -- | Componente orquestrador que monta todos os blocos |

**Design:** Reutiliza o design system dark da `FastCRMLanding` existente (bg `hsl(222,47%,4%)`, cards com borders `hsl(217,33%,17%)`, gradients primary-to-purple, framer-motion animations). Cores de accent adaptaveis por vertical via config.

### Fase 3: Pagina e Rotas

**Ficheiro:** `src/pages/VerticalLandingPage.tsx`

- Le `useParams<{ verticalSlug: string }>()`
- Procura a config em `verticalConfigs` pelo slug
- Se nao encontra, mostra 404
- Se encontra, renderiza `<VerticalLandingTemplate config={config} />`
- Inclui `<Helmet>` com SEO dinamico

**Rotas em `App.tsx`:**

Adicionar dentro do bloco de rotas publicas (antes do `/*` CRM catch-all), 6 rotas fixas:
```
<Route path="/clinicas" element={<VerticalLandingPage />} />
<Route path="/imobiliarias" element={<VerticalLandingPage />} />
<Route path="/formacao" element={<VerticalLandingPage />} />
<Route path="/condominios" element={<VerticalLandingPage />} />
<Route path="/agencias" element={<VerticalLandingPage />} />
<Route path="/empresas" element={<VerticalLandingPage />} />
```

Alternativamente, usar uma rota generica `/:verticalSlug` mas isso conflitua com rotas existentes. As rotas fixas sao mais seguras.

### Fase 4: Edge Function para Submission

**Ficheiro:** `supabase/functions/vertical-landing-submit/index.ts`

Recebe:
```json
{
  "vertical": "clinicas",
  "name": "...",
  "company": "...",
  "email": "...",
  "phone": "...",
  "team_size": "...",
  "main_challenge": "...",
  "monthly_revenue": "..."
}
```

Executa (usando service role para bypass RLS):
1. Busca o workspace "metodopare" (ou workspace principal configurado)
2. Busca o owner do workspace
3. Cria contacto em `contacts` com tag da vertical
4. Cria lead em `leads` com source `"Landing Vertical: {vertical}"` e status `"new"`
5. Procura ou cria pipeline `"{vertical_nome} - Sales Flow"` com etapas predefinidas
6. Cria oportunidade em `opportunities` na primeira etapa do pipeline
7. Cria actividade em `crm_activities` (tipo `form_submission`)
8. Retorna `{ success: true, lead_id, opportunity_id }`

### Fase 5: Formulario Inteligente (VerticalCTAForm)

- 7 campos: Nome, Empresa, Email, Telefone, Tamanho da equipa (select), Principal desafio (textarea), Faturacao mensal estimada (select de ranges)
- Validacao com zod client-side
- Botao dinamico: "Quero Modernizar a Minha {vertical_nome}"
- Estado de sucesso com animacao (similar ao `QualificationModal` existente)
- Chama `supabase.functions.invoke("vertical-landing-submit", { body: ... })`

### Migracao de Base de Dados

Nao e necessaria nenhuma migracao. O sistema usa tabelas existentes: `leads`, `contacts`, `opportunities`, `pipelines`, `pipeline_stages`, `crm_activities`. A edge function cria os registos necessarios.

---

## Ficheiros a Criar

| Ficheiro | Tipo |
|---|---|
| `src/config/verticalConfigs.ts` | Novo |
| `src/components/vertical-landing/VerticalHero.tsx` | Novo |
| `src/components/vertical-landing/VerticalProblems.tsx` | Novo |
| `src/components/vertical-landing/VerticalSolution.tsx` | Novo |
| `src/components/vertical-landing/VerticalTransformation.tsx` | Novo |
| `src/components/vertical-landing/VerticalAuthority.tsx` | Novo |
| `src/components/vertical-landing/VerticalROI.tsx` | Novo |
| `src/components/vertical-landing/VerticalCTAForm.tsx` | Novo |
| `src/components/vertical-landing/VerticalLandingTemplate.tsx` | Novo |
| `src/components/vertical-landing/VerticalStickyHeader.tsx` | Novo |
| `src/components/vertical-landing/VerticalFooter.tsx` | Novo |
| `src/pages/VerticalLandingPage.tsx` | Novo |
| `supabase/functions/vertical-landing-submit/index.ts` | Novo |

## Ficheiros a Editar

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Adicionar 6 rotas para verticais |

## Notas

- As "AI Personas por vertical" e "Automacoes com triggers" mencionadas no brief sao funcionalidades que dependem de configuracao manual no painel de AI Assistants e Automations apos a captura do lead. O sistema de landing pages cria o lead e oportunidade; a activacao de automacoes especificas (email personalizado, WhatsApp, follow-up task) pode ser configurada nos workflows existentes usando o trigger `form_submission` e a tag da vertical como condicao.
- Testes A/B, blog dinamico, chat AI embutido e video explicativo sao identificados como "Futuro" no brief e nao serao implementados nesta fase.
- O design reutiliza o mesmo visual SaaS premium da landing principal (dark mode, gradients, framer-motion).
