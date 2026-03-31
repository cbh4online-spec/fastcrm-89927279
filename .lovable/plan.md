

## Evolução do Módulo de eBooks — Diagnóstico e Plano

### Diagnóstico Técnico

| Problema | Evidência |
|----------|-----------|
| **EbookEditor monolítico** | 1052 linhas, ~20 useState, mistura header/sidebar/canvas/branding/notas/preview/status bar |
| **Geração IA 100% frontend** | `EbookWizard.tsx` (775 linhas) orquestra outline → chapters → cover → images sequencialmente no browser, sem retry, sem resume, perde tudo se a tab fechar |
| **Chapters como JSON** | `ebooks.chapters` é `jsonb[]` — impossível queries por capítulo, sem analytics granular, sem versionamento |
| **Autosave frágil** | Debounce de 800ms em branding, mas `saveChapters()` chama `updateEbook.mutate` diretamente sem dirty-checking, sem fila, sem status real |
| **Estados editoriais limitados** | Apenas `draft | published | archived` — falta `generating`, `ready_for_review`, `generation_failed` |
| **Sem versionamento** | Zero histórico de alterações |
| **Edge function monolítica** | `ebook-ai-assist` faz outline + chapter + improve + condense + expand + image — sem separação de responsabilidades |

### Arquitectura-Alvo

```text
┌─────────────────────────────────────────────────────────┐
│                    EbookEditorShell                      │
│  ┌──────────┬──────────────────┬──────────────────────┐  │
│  │ Chapter  │                  │  Right Panel (Tabs)  │  │
│  │ Sidebar  │  EbookCanvas     │  - Insert            │  │
│  │          │  Editor          │  - Style/Theme       │  │
│  │          │  (visual/classic)│  - Branding          │  │
│  │          │                  │  - AI Actions         │  │
│  │          │                  │  - Notes              │  │
│  └──────────┴──────────────────┴──────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  EbookStatusBar (dirty/saving/saved/failed + stats)│  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────┐     ┌───────────────────────┐
│  EbookWizard (frontend) │────►│  ebook-generate (EF)  │
│  Inicia job + polling   │◄────│  Orquestra etapas     │
│                         │     │  Persiste progresso   │
└─────────────────────────┘     └───────────────────────┘
        ▲                              │
        │ polling/realtime             ▼
        │                    ┌───────────────────┐
        └────────────────────│ ebook_generation  │
                             │ _jobs (tabela)    │
                             └───────────────────┘
```

---

## P0 — Crítico: Estabilizar Editor + Geração IA

### P0.1 — Refatorar EbookEditor (1052→~200 linhas no shell)

**Componentes a extrair:**

| Componente | Responsabilidade | Linhas aprox. |
|-----------|------------------|---------------|
| `EbookEditorShell.tsx` | Layout 3-colunas, state management central, dirty tracking | ~200 |
| `EbookEditorHeader.tsx` | Title edit, status badge, settings dropdown, preview/publish buttons | ~100 |
| `EbookChapterSidebar.tsx` | Lista de capítulos, drag-drop, add/remove | ~120 |
| `EbookCanvasEditor.tsx` | Switch visual/clássico, chapter toolbar, AI actions dropdown | ~180 |
| `EbookBrandingPanel.tsx` | Tab "Marca": header/footer, contactos, proteção, lead gate | ~120 |
| `EbookThemePanel.tsx` | Tab "Estilo": theme selector, typography | ~80 |
| `EbookAIActionsPanel.tsx` | Dropdown IA (gerar, melhorar, condensar, expandir) | ~80 |
| `EbookPreviewDialog.tsx` | Dialog fullscreen FlipbookReader | ~30 |
| `EbookStatusBar.tsx` | Footer: chapters count, words, progress, save status | ~40 |

**Ficheiro principal** `EbookEditor.tsx` passa a ser re-export de `EbookEditorShell` para backward-compatibility.

### P0.2 — Persistência Robusta

**Criar** `src/hooks/useEbookPersistence.ts`:
- `isDirty: boolean` — compara snapshot vs estado actual
- `saveStatus: 'idle' | 'saving' | 'saved' | 'failed'`
- `lastSavedAt: Date | null`
- `queueSave(updates)` — debounce 1.5s, merge updates pendentes
- `forceSave()` — save imediato
- Recuperação local: `localStorage` com `ebook:{id}:draft` como fallback
- `beforeunload` warning quando dirty
- Centraliza **todos** os saves (chapters, branding, theme, metadata)
- Substitui os múltiplos `updateEbook.mutate()` dispersos

### P0.3 — Geração IA Server-Side

**Nova tabela** `ebook_generation_jobs`:
```sql
CREATE TABLE ebook_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  current_step TEXT, -- generate_outline, create_ebook, generate_chapters, generate_cover, generate_images, finalize
  steps_completed TEXT[] DEFAULT '{}',
  total_steps INTEGER DEFAULT 6,
  progress INTEGER DEFAULT 0,
  config JSONB NOT NULL, -- prompt, tone, audience, chapterCount, imageStyle, etc
  result JSONB, -- outline, chapter contents, image urls
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Nova edge function** `ebook-generate/index.ts`:
- Recebe `job_id`, executa etapas sequencialmente
- Actualiza `ebook_generation_jobs` entre cada etapa
- Em caso de erro: marca etapa como failed, permite retry
- Reutiliza lógica existente de `ebook-ai-assist` (que se mantém para acções individuais no editor)

**Frontend** `EbookWizard.tsx`:
- `handleGenerate()` passa a: criar job → chamar edge function → polling via `useQuery` com refetch a cada 2s
- Mostra progresso real a partir da tabela
- Permite fechar e voltar — job continua no backend

### P0.4 — Estados Editoriais

**Migração** para expandir o enum de status:
```sql
ALTER TABLE ebooks 
  DROP CONSTRAINT IF EXISTS ebooks_status_check;
-- Add new statuses via text (já é text, verificar)
```

Actualizar `Ebook` interface:
```typescript
status: "draft" | "generating" | "ready_for_review" | "published" | "archived" | "generation_failed";
```

Actualizar `EbooksList.tsx` com badges e filtros por estado.

---

## P1 — Alto Impacto: Modelo de Dados + Robustez Editorial

### P1.1 — Normalizar Modelo de Dados

**Nova tabela** `ebook_chapters`:
```sql
CREATE TABLE ebook_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT DEFAULT '',
  cover_image TEXT,
  layout_key TEXT,
  blocks JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Migração progressiva**:
1. Criar tabela `ebook_chapters`
2. Criar hook `useEbookChapters.ts` que lê de `ebook_chapters` com fallback para `ebooks.chapters` JSON
3. Migrar dados existentes via edge function de migração one-shot
4. Editor passa a usar `ebook_chapters` nativamente
5. Manter `ebooks.chapters` como cache/fallback temporário

Tabelas `ebook_assets` e `ebook_pages` já existem — reaproveitar.

### P1.2 — Versionamento

**Nova tabela** `ebook_versions`:
```sql
CREATE TABLE ebook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- full ebook state
  change_summary TEXT,
  is_published_version BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Auto-snapshot antes de publicar
- Manual snapshot via botão "Guardar versão"
- Rollback carrega snapshot → escreve no ebook
- Hook `useEbookVersions.ts`

### P1.3 — Melhorar Fluxo de Criação

- Score de completude no editor: título ✓, capítulos ✓, conteúdo ✓, capa ✓, branding ✓
- Checklist visual na sidebar ou header
- Quick-start: "eBook Lead Magnet", "Guia Técnico", "Playbook Comercial" — presets que preenchem wizard
- Sem nova UI complexa — reaproveitar `EbookWizard` com presets

### P1.4 — Reforçar Leitor Público

- Analytics de drop-off: `ebook_read_events` com `chapter_id` + `page_number` + `time_spent`
- CTAs contextuais por capítulo (campo `cta_text` + `cta_url` em `ebook_chapters`)
- Dashboard de analytics por eBook: pages read, time spent, completion rate, lead conversions
- Heatmap simples (bar chart de tempo por capítulo) usando `recharts`

---

## P2 — Evolução e Diferenciação

### P2.1 — Colaboração Editorial
- `ebook_comments` tabela (block_id, chapter_id, content, status: open/resolved)
- Painel de comentários no editor
- Status de review: pending_review → approved → needs_changes
- Locking por capítulo (optimistic, campo `locked_by` + `locked_at`)

### P2.2 — Exportação Multi-Formato
- PDF editorial via `jspdf` + `jspdf-autotable` (já instalados)
- Flipbook web (já existe)
- Botão "Exportar PDF" no editor e na lista

### P2.3 — Biblioteca Premium
- Templates por indústria (marketing, SaaS, educação, coaching)
- Blocos premium reutilizáveis (testimonial, stats, timeline)
- Sistema de layout com `ebook_templates` já existente — expandir catálogo

---

### Ficheiros a Criar

| Ficheiro | Prioridade |
|----------|-----------|
| `src/components/ebooks/editor/EbookEditorShell.tsx` | P0 |
| `src/components/ebooks/editor/EbookEditorHeader.tsx` | P0 |
| `src/components/ebooks/editor/EbookChapterSidebar.tsx` | P0 |
| `src/components/ebooks/editor/EbookCanvasEditor.tsx` | P0 |
| `src/components/ebooks/editor/EbookBrandingPanel.tsx` | P0 |
| `src/components/ebooks/editor/EbookThemePanel.tsx` | P0 |
| `src/components/ebooks/editor/EbookAIActionsPanel.tsx` | P0 |
| `src/components/ebooks/editor/EbookPreviewDialog.tsx` | P0 |
| `src/components/ebooks/editor/EbookStatusBar.tsx` | P0 |
| `src/hooks/useEbookPersistence.ts` | P0 |
| `src/hooks/useEbookGenerationJob.ts` | P0 |
| `supabase/functions/ebook-generate/index.ts` | P0 |
| `src/hooks/useEbookChapters.ts` | P1 |
| `src/hooks/useEbookVersions.ts` | P1 |
| `src/components/ebooks/EbookCompletenessScore.tsx` | P1 |
| `src/components/ebooks/EbookAnalyticsDashboard.tsx` | P1 |
| `src/components/ebooks/EbookComments.tsx` | P2 |
| `src/utils/ebookPdfExport.ts` | P2 |

### Ficheiros a Alterar

| Ficheiro | Prioridade |
|----------|-----------|
| `src/components/ebooks/EbookEditor.tsx` | P0 (re-export shell) |
| `src/components/ebooks/EbookWizard.tsx` | P0 (polling instead of orchestration) |
| `src/hooks/useEbooks.ts` | P0 (new statuses) |
| `src/components/ebooks/EbooksList.tsx` | P0 (status badges + filters) |
| `supabase/functions/ebook-ai-assist/index.ts` | P0 (minor — keep for individual actions) |

### V1 vs V2

| V1 (este plano) | V2 (futuro) |
|------------------|-------------|
| Editor modular (10 componentes) | Editor colaborativo real-time |
| Autosave centralizado com dirty state | Conflict resolution multi-user |
| Geração IA server-side com retry | Pipeline de geração com queue |
| Estados editoriais expandidos | Workflow editorial customizável |
| `ebook_chapters` normalizado | `ebook_blocks` normalizado |
| Versionamento com snapshots | Diff visual entre versões |
| Analytics básico (recharts) | Heatmap de leitura real |
| Export PDF básico | Export multi-formato premium |
| Comentários simples | Review workflow com aprovações |

### Ordem de Implementação

1. **Batch 1**: P0.1 — Refatorar editor em 10 componentes
2. **Batch 2**: P0.2 — Hook de persistência + status bar real
3. **Batch 3**: P0.3 — Tabela jobs + edge function + wizard polling
4. **Batch 4**: P0.4 — Estados editoriais + lista actualizada
5. **Batch 5**: P1.1 — Tabela chapters + hook + migração
6. **Batch 6**: P1.2-P1.4 — Versionamento + completude + analytics
7. **Batch 7**: P2 — Colaboração + export + biblioteca

### Critérios de Aceitação

1. EbookEditor principal < 200 linhas, todos os sub-componentes funcionais
2. Save status visível (saving/saved/failed) e dirty warning ao sair
3. Geração IA continua no backend mesmo se fechar o browser
4. Geração falhada pode ser retomada
5. 6 estados editoriais funcionais com transições correctas
6. Capítulos em tabela separada com queries eficientes
7. Pelo menos 1 versão guardada automaticamente antes de publicar
8. Analytics de leitura com dados por capítulo
9. Zero regressões na experiência actual

