

## Evolução do Módulo de eBooks — Plano de Implementação

### Estado Atual

| Área | Estado |
|------|--------|
| **P0.1 — Editor modular** | ✅ Feito (Batch 1 anterior) — Shell + 9 sub-componentes |
| **P0.2 — Persistência robusta** | ❌ Não existe — saves dispersos, sem dirty state, sem fila, sem recovery |
| **P0.3 — Geração IA server-side** | ❌ Não existe — 775 linhas de orquestração no frontend (EbookWizard.tsx) |
| **P0.4 — Estados editoriais** | ❌ Limitado a `draft | published | archived` |
| **P1.1 — Modelo normalizado** | ❌ Chapters em JSON na tabela `ebooks` |
| **P1.2 — Versionamento** | ❌ Zero |
| **P1.3 — Workflow editorial** | ❌ Zero |
| **P1.4 — Analytics** | ⚠️ Básico — `ebook_views`, `ebook_page_events`, `ebook_leads` existem |
| **P1.5 — Fluxo criação** | ⚠️ Wizard funcional mas sem presets nem completude |

O `EbookEditorShell.tsx` (472 linhas) continua com toda a lógica de saves, AI actions e state management. O `ebook-ai-assist` edge function (177 linhas) serve outline, chapters, images e improve/condense/expand.

---

### Plano por Batches

#### Batch 1 — P0.2: Persistência Robusta

**Criar** `src/hooks/useEbookPersistence.ts`:
- `isDirty`, `saveStatus`, `lastSavedAt`
- `queueSave()` com debounce 1.5s e merge de updates pendentes
- `forceSave()` para save imediato
- Recovery via `localStorage` (`ebook:{id}:draft`)
- `beforeunload` warning quando dirty
- Centraliza todos os saves (chapters, branding, theme, metadata)

**Alterar** `EbookEditorShell.tsx`:
- Remover saves manuais dispersos (branding debounce, `saveChapters`)
- Usar `useEbookPersistence` como fonte única de persistência
- Passar `isDirty` ao `EbookStatusBar`

**Alterar** `EbookStatusBar.tsx`:
- Adicionar indicador `isDirty` ("Alterações por guardar")

---

#### Batch 2 — P0.3: Geração IA Assíncrona

**Migração SQL** — tabela `ebook_generation_jobs`:
```sql
CREATE TABLE ebook_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT,
  steps_completed TEXT[] DEFAULT '{}',
  total_steps INTEGER DEFAULT 6,
  progress INTEGER DEFAULT 0,
  config JSONB NOT NULL,
  result JSONB DEFAULT '{}',
  error_message TEXT,
  error_step TEXT,
  retry_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: workspace members podem SELECT; INSERT autenticado; UPDATE/DELETE via service_role

**Criar** edge function `ebook-generate/index.ts`:
- Recebe `job_id`, executa etapas sequencialmente
- Actualiza `ebook_generation_jobs` entre etapas
- Reutiliza lógica de `ebook-ai-assist` para chamadas AI
- Etapas: `generate_outline` → `create_ebook` → `generate_chapters` → `generate_cover` → `generate_images` → `finalize`
- Em caso de erro: grava `error_step` + `error_message`, marca `status = 'failed'`
- Suporta retry: recomeça a partir do `error_step`

**Criar** `src/hooks/useEbookGenerationJob.ts`:
- `startJob(config)` — insere job + invoca edge function
- `useQuery` com polling a cada 2s enquanto `status in (queued, running)`
- `retryJob(jobId)` — reinicia a partir do passo falhado
- `cancelJob(jobId)`

**Alterar** `EbookWizard.tsx`:
- `handleGenerate()` → criar job na tabela → invocar edge function → mostrar progresso via polling
- Remover toda a orquestração sequencial do frontend (~200 linhas)
- UI de progresso lê de `useEbookGenerationJob`
- Permitir fechar wizard sem perder geração

---

#### Batch 3 — P0.4: Estados Editoriais

**Migração SQL**:
- Garantir que `ebooks.status` aceita: `draft`, `generating`, `ready_for_review`, `published`, `archived`, `generation_failed`

**Alterar** `useEbooks.ts`:
- Actualizar tipo `Ebook.status` com novos valores

**Alterar** `EbooksList.tsx`:
- Badges com cores por estado
- Filtros por estado
- Ações condicionais (só publicar se `ready_for_review` ou `draft` com conteúdo)

**Alterar** `EbookEditorHeader.tsx`:
- Badge de estado no header
- Botão "Marcar para revisão" quando `draft`
- Proteger publicação de conteúdo incompleto

**Alterar** `ebook-generate/index.ts`:
- Marcar ebook como `generating` ao iniciar
- Marcar como `draft` ao finalizar com sucesso
- Marcar como `generation_failed` em caso de erro

---

#### Batch 4 — P1.1: Normalizar Modelo de Dados

**Migração SQL** — tabela `ebook_chapters`:
```sql
CREATE TABLE ebook_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT DEFAULT '',
  cover_image TEXT,
  layout_key TEXT,
  blocks JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Migração SQL** — tabela `ebook_versions`:
```sql
CREATE TABLE ebook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  is_published_version BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Criar** `src/hooks/useEbookChapters.ts`:
- CRUD para `ebook_chapters` com fallback para `ebooks.chapters` JSON
- `useEbookChapters(ebookId)` — lê de `ebook_chapters`, fallback `ebooks.chapters`
- `addChapter`, `updateChapter`, `deleteChapter`, `reorderChapters`

**Criar** `src/hooks/useEbookVersions.ts`:
- `createVersion(ebookId, summary)` — snapshot completo
- `listVersions(ebookId)`
- `rollbackToVersion(versionId)`
- Auto-snapshot antes de publicar

**Criar** edge function `ebook-migrate-chapters/index.ts`:
- One-shot: migra `ebooks.chapters` JSON → `ebook_chapters` rows
- Idempotente (ignora ebooks já migrados)

**Alterar** `EbookEditorShell.tsx`:
- Integrar `useEbookChapters` (substituir leitura directa de `ebook.chapters`)

---

#### Batch 5 — P1.2-P1.5: Versionamento + Completude + Analytics + Workflow

**Criar** `src/components/ebooks/EbookCompletenessScore.tsx`:
- Checklist: título ✓, capítulos ✓, conteúdo ✓, capa ✓, branding ✓
- Score visual (barra + percentagem)
- Integrar no `EbookEditorHeader` ou `EbookRightPanel`

**Migração SQL** — tabela `ebook_events`:
```sql
CREATE TABLE ebook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  chapter_index INTEGER,
  page_number INTEGER,
  metadata JSONB DEFAULT '{}',
  visitor_id TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Melhorar** `EbookAnalytics.tsx`:
- Drop-off por capítulo (não só por página)
- Leads gerados por eBook
- Taxa de conversão lead gate
- Fontes UTM
- Tempo por capítulo

**Criar** preset configs no wizard:
- "Lead Magnet", "Guia de Autoridade", "Onboarding", "Playbook Comercial"
- Pré-preenchem audience, objective, depth, tone, chapterCount

**Workflow básico**:
- Botão "Pronto para revisão" (status → `ready_for_review`)
- Botão "Aprovar e publicar" (status → `published` + auto-snapshot versão)
- Botão "Rejeitar" (status → `draft` + motivo opcional)

---

#### Batch 6 — P2: Colaboração + Export + Templates

**Migração SQL** — `ebook_comments`:
```sql
CREATE TABLE ebook_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  chapter_id UUID,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Criar** `src/utils/ebookPdfExport.ts`:
- Export PDF via `jspdf` + `jspdf-autotable`
- Capa + capítulos + branding
- Botão no editor e na lista

**Criar** `src/components/ebooks/EbookComments.tsx`:
- Painel de comentários no `EbookRightPanel`

**Expandir** templates:
- Presets por indústria (marketing, SaaS, coaching, educação)
- Usar `ebook_templates` existente

---

### Ficheiros a Criar (~15)

| Ficheiro | Batch |
|----------|-------|
| `src/hooks/useEbookPersistence.ts` | 1 |
| `src/hooks/useEbookGenerationJob.ts` | 2 |
| `supabase/functions/ebook-generate/index.ts` | 2 |
| `src/hooks/useEbookChapters.ts` | 4 |
| `src/hooks/useEbookVersions.ts` | 4 |
| `supabase/functions/ebook-migrate-chapters/index.ts` | 4 |
| `src/components/ebooks/EbookCompletenessScore.tsx` | 5 |
| `src/components/ebooks/EbookComments.tsx` | 6 |
| `src/utils/ebookPdfExport.ts` | 6 |

### Ficheiros a Alterar (~8)

| Ficheiro | Batches |
|----------|---------|
| `src/components/ebooks/editor/EbookEditorShell.tsx` | 1, 4 |
| `src/components/ebooks/editor/EbookStatusBar.tsx` | 1 |
| `src/components/ebooks/EbookWizard.tsx` | 2 |
| `src/hooks/useEbooks.ts` | 3 |
| `src/components/ebooks/EbooksList.tsx` | 3 |
| `src/components/ebooks/editor/EbookEditorHeader.tsx` | 3, 5 |
| `src/components/ebooks/EbookAnalytics.tsx` | 5 |
| `src/components/ebooks/editor/EbookRightPanel.tsx` | 5, 6 |

### Migrações SQL (~5)

1. `ebook_generation_jobs` (Batch 2)
2. Expandir `ebooks.status` (Batch 3)
3. `ebook_chapters` (Batch 4)
4. `ebook_versions` (Batch 4)
5. `ebook_events` + `ebook_comments` (Batch 5-6)

### V1 vs V2

| V1 (este plano) | V2 (futuro) |
|---|---|
| Persistência centralizada com dirty/autosave | Conflict resolution multi-user |
| Geração IA server-side com retry por etapa | Pipeline com queue e prioridades |
| 6 estados editoriais | Workflow customizável |
| Chapters em tabela separada | Blocks em tabela separada |
| Snapshots de versão | Diff visual entre versões |
| Analytics por capítulo/página | Heatmap de leitura real |
| Export PDF básico | Export multi-formato premium |
| Comentários simples | Review workflow com aprovações |
| Presets de criação | Marketplace de templates |

### Critérios de Aceitação

1. `useEbookPersistence` centraliza todos os saves; dirty warning ao sair
2. Save status real visível (saving/saved/failed) com retry
3. Geração IA corre no backend; frontend só faz polling
4. Job falhado pode ser retomado a partir da etapa que falhou
5. 6 estados editoriais com transições e badges
6. Capítulos em tabela normalizada com fallback para JSON legacy
7. Versão guardada automaticamente antes de publicar
8. Score de completude visível no editor
9. Analytics com drop-off por capítulo e conversão de leads
10. Export PDF funcional
11. Zero regressões na experiência actual

