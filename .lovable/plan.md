

## eBook Module — Compliance, Conversão, SEO, Quality Gate, Governança e Assets

### 1. Diagnóstico das Lacunas Actuais

| Área | Estado actual | Lacuna |
|------|--------------|--------|
| **Lead Gate** | Formulário básico (nome+email), sem consentimento | Sem checkbox RGPD, sem texto configurável, sem registo de consentimento |
| **CTAs** | Inexistente | Sem tabelas, sem tracking, sem UI |
| **SEO** | Sem metadados | Sem og:tags, meta title/description, canonical, noindex |
| **Preflight** | Inexistente | Publicação directa sem validação |
| **Permissões** | Sem controlo granular | Qualquer membro do workspace pode tudo |
| **Assets** | Tabela `ebook_assets` existe mas sem UI | Sem picker, sem alt text, sem compressão integrada, sem limpeza de órfãos |
| **Analytics** | Views, drop-off, devices, sources | Sem métricas de conversão, CTA, lead gate rate, opt-in |

---

### 2. Plano de Batches (V1 vs V2)

Dada a dimensão, proponho dividir em **V1 (funcional core)** e **V2 (refinamento)**:

**V1 — 5 Batches sequenciais:**

| Batch | Conteúdo |
|-------|----------|
| **B1** | Schema: migração para campos SEO, consent, CTAs |
| **B2** | Lead Gate com compliance + SEO no leitor público |
| **B3** | CTA system (config no editor + tracking no leitor) |
| **B4** | Preflight check antes de publicar |
| **B5** | Analytics expandidas (conversão, CTA, lead gate) |

**V2 — Diferido:**

| Item | Razão |
|------|-------|
| Permissões granulares (5 roles) | Requer infra de roles por módulo — complexo |
| Asset picker / biblioteca reutilizável | UX significativa, pode ser feito depois |
| Limpeza automática de assets órfãos | Background job, sem impacto funcional imediato |
| Schema.org structured data | Valor incremental |

---

### 3. B1 — Migração de Schema

**Campos novos na tabela `ebooks`:**
```
privacy_policy_url    TEXT
consent_text          TEXT
marketing_opt_in_enabled  BOOLEAN DEFAULT false
marketing_opt_in_label    TEXT
seo_title             TEXT
seo_description       TEXT
og_image_url          TEXT
canonical_url         TEXT
noindex               BOOLEAN DEFAULT false
```

**Campos novos na tabela `ebook_views`:**
```
consent_given         BOOLEAN DEFAULT false
consent_text_version  TEXT
marketing_opt_in      BOOLEAN DEFAULT false
consent_timestamp     TIMESTAMPTZ
ip_address            TEXT
user_agent            TEXT
```

**Tabela nova `ebook_ctas`:**
```
id            UUID PK
ebook_id      UUID FK → ebooks
chapter_id    TEXT (nullable, referência lógica)
workspace_id  UUID FK → workspaces
label         TEXT NOT NULL
cta_type      TEXT NOT NULL (link, whatsapp, form, schedule, contact, internal)
target_url    TEXT
position      TEXT DEFAULT 'end' (end, inline, after_chapter)
is_active     BOOLEAN DEFAULT true
sort_order    INT DEFAULT 0
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

**Tabela nova `ebook_cta_events`:**
```
id            UUID PK
ebook_id      UUID FK → ebooks
cta_id        UUID FK → ebook_ctas
view_id       UUID FK → ebook_views (nullable)
workspace_id  UUID FK → workspaces
chapter_id    TEXT (nullable)
event_type    TEXT NOT NULL (cta_impression, cta_click, cta_conversion)
created_at    TIMESTAMPTZ
```

**RLS:** Ambas as tabelas com política por workspace_id (mesmo padrão de ebook_views).

---

### 4. B2 — Lead Gate com Compliance + SEO

**Editor (`EbookBrandingPanel`):**
- Secção "Consentimento" quando lead_gate_enabled:
  - Input: `consent_text` (texto do checkbox)
  - Input: `privacy_policy_url` (link)
  - Toggle: `marketing_opt_in_enabled`
  - Input: `marketing_opt_in_label`
- Secção "SEO e Partilha":
  - Input: `seo_title`, `seo_description`
  - Input: `og_image_url` (ou usar cover_url como fallback)
  - Input: `canonical_url`
  - Toggle: `noindex`

**Leitor público (`PublicEbookPage`):**
- Lead gate form expandido:
  - Checkbox obrigatório de consentimento com texto configurável
  - Link para política de privacidade
  - Checkbox opcional de marketing opt-in
- Ao submeter: gravar `consent_given`, `consent_text_version` (hash do texto), `marketing_opt_in`, `consent_timestamp`, `user_agent`
- Meta tags dinâmicas: `<title>`, `<meta description>`, `og:title/description/image`, canonical, robots noindex

**Ficheiros:**
| Ficheiro | Acção |
|----------|-------|
| `src/components/ebooks/editor/EbookBrandingPanel.tsx` | Adicionar secções Consentimento + SEO |
| `src/components/ebooks/editor/EbookEditorShell.tsx` | Passar novos campos ao BrandingPanel e queueSave |
| `src/pages/PublicEbookPage.tsx` | Expandir lead gate, adicionar meta tags, gravar consent |
| `src/hooks/useEbooks.ts` | Expandir tipo Ebook e updateEbook |

---

### 5. B3 — CTA System

**Editor:**
- Novo painel/secção "CTAs" no editor
- Lista de CTAs por ebook, com CRUD inline
- Selecção de tipo, label, URL, posição (final / após capítulo X)
- Toggle activo/inactivo

**Leitor público:**
- Renderizar CTA final após última página (antes da página de contacto)
- Renderizar CTA por capítulo se configurado
- Ao ver CTA: insert `cta_impression`
- Ao clicar: insert `cta_click`

**Ficheiros:**
| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useEbookCtas.ts` | Criar — CRUD de CTAs |
| `src/components/ebooks/editor/EbookCtaPanel.tsx` | Criar — UI de gestão |
| `src/components/ebooks/EbookCtaButton.tsx` | Criar — componente de CTA no leitor |
| `src/pages/PublicEbookPage.tsx` | Carregar e renderizar CTAs |
| `src/components/ebooks/FlipbookReader.tsx` | Integrar CTA nas páginas |

---

### 6. B4 — Preflight Check

**Lógica (função pura, não edge function):**
```typescript
function runPreflight(ebook: Ebook, ctas: EbookCta[]): PreflightResult {
  // Erros bloqueantes:
  // - título vazio
  // - slug inválido/vazio
  // - 0 capítulos
  // - capítulos vazios (< 50 chars)
  // - lead_gate activo sem consent_text
  // - CTAs activos com target_url vazio
  
  // Warnings:
  // - sem capa
  // - sem SEO configurado
  // - capítulos curtos (< 200 chars)
  // - sem página de contacto quando CTA tipo "contact"
  // - imagens referenciadas inexistentes
}
```

**UI:**
- Dialog "Verificação pré-publicação" com lista de ✅ / ❌ / ⚠️
- Score de completude (percentagem)
- Botão "Publicar" bloqueado se houver erros
- Botão "Publicar mesmo assim" se só houver warnings (com confirmação)

**Ficheiros:**
| Ficheiro | Acção |
|----------|-------|
| `src/utils/ebookPreflight.ts` | Criar — lógica de validação |
| `src/components/ebooks/editor/EbookPreflightDialog.tsx` | Criar — UI do preflight |
| `src/components/ebooks/editor/EbookEditorHeader.tsx` | Integrar botão de preflight antes de publicar |

---

### 7. B5 — Analytics Expandidas

**Novas métricas no `useEbookAnalyticsKPIs`:**
- Lead gate conversion rate: `(views com email / total views) * 100`
- Marketing opt-in rate: `(views com marketing_opt_in / views com email) * 100`
- CTR por CTA: `(clicks / impressions) * 100`
- Abandono por capítulo (já parcialmente existe via pageDropOff)
- Melhor CTA por ebook
- Readers-to-leads rate, leads-to-CRM rate

**UI (`EbookAnalytics.tsx`):**
- Secção "Conversão" com KPI cards
- Tabela de CTAs com CTR e clicks
- Gráfico de funil: Views → Leads → CRM → Conversão CTA

**Ficheiros:**
| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useEbookAnalytics.ts` | Expandir KPIs com CTA events e consent data |
| `src/components/ebooks/EbookAnalytics.tsx` | Adicionar secções de conversão e CTAs |

---

### 8. Resumo de Impacto

| Área | Impacto |
|------|---------|
| **Leitor público** | Lead gate com RGPD, meta tags SEO, CTAs renderizados e trackados |
| **Editor** | Novos painéis: Consentimento, SEO, CTAs, Preflight |
| **Analytics** | Métricas de conversão, CTA performance, lead gate rate |
| **Permissões** | Diferido para V2 (requer infra transversal) |
| **Base de dados** | ~10 campos novos em ebooks, ~6 em ebook_views, 2 tabelas novas |

### 9. Confirmação V1

Após implementação dos 5 batches, o módulo terá:
- ✅ Lead gate com consentimento RGPD
- ✅ CTA tracking e configuração
- ✅ Analytics de conversão
- ✅ SEO público configurável
- ✅ Preflight check antes de publicar
- ⏳ Permissões granulares (V2)
- ⏳ Gestão de assets com picker (V2)

### 10. Ordem de Implementação

Recomendo começar por **B1 (migração)** e depois **B2 (lead gate + SEO)**, pois são os mais impactantes para compliance e distribuição. Posso avançar com todos os 5 batches sequencialmente.

