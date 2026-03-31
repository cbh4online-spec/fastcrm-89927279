

## eBook Funil Comercial Completo — Plano de Implementação

### Diagnóstico

| Área | Existe | Falta |
|------|--------|-------|
| Lead Gate básico (nome+email) | ✅ | — |
| Consentimento RGPD | ✅ Parcial (consent_text, privacy_policy_url, marketing_opt_in) | `consent_required` flag explícita; campo `captured_name`/`captured_email` dedicados na view |
| CRM Contact creation/match | ❌ Só faz lookup — nunca cria contacto | Criar contacto se não existir; atualizar se existir; emitir eventos |
| CTA rendering no leitor | ❌ Tabelas e CRUD existem, mas nenhum CTA é renderizado no FlipbookReader | Componente CTA no leitor; tracking de impressões e cliques |
| Automações comerciais | ❌ | Kernel events; tags; tarefas; timeline |
| Analytics de conversão (funil) | ✅ Parcial (lead gate rate, opt-in rate, CTA CTR) | Funil visual; ranking CTA; conversão por origem/campanha; dashboard 3 secções |
| Scoring/Segmentação | ❌ | Diferido para V2 |
| Permissões granulares | ❌ | Diferido para V2 |

---

### Priorização (V1 vs V2)

**V1 — Esta implementação (6 batches):**

| Batch | Conteúdo |
|-------|----------|
| B1 | Schema: campos `consent_required`, CTA extras (`whatsapp_number`, `booking_link`, `style_variant`, `target_route`, `form_id`), `contact_id` em `ebook_cta_events` |
| B2 | Lead Gate → CRM: criar/atualizar contacto, emitir kernel events, gravar tags |
| B3 | CTA rendering no FlipbookReader + tracking de impressões/cliques |
| B4 | Automações comerciais (tags, eventos kernel, timeline) |
| B5 | Analytics dashboard 3 secções (Consumo, Captação, Conversão) + funil visual |
| B6 | Validações e preflight updates |

**V2 — Diferido:**
- Scoring por comportamento e segmentação
- Permissões granulares (ebook_editor, ebook_analyst, etc.)
- Remarketing por comportamento
- CTA tipo formulário embebido
- Nurture automático por eBook

---

### B1 — Migração de Schema

**Campos a adicionar na tabela `ebooks`:**
```
consent_required  BOOLEAN DEFAULT false
```

**Campos a adicionar na tabela `ebook_ctas`:**
```
whatsapp_number   TEXT
booking_link      TEXT
target_route      TEXT
form_id           TEXT
style_variant     TEXT DEFAULT 'default'
```

**Campo a adicionar na tabela `ebook_cta_events`:**
```
contact_id        UUID (nullable, FK → contacts)
```

---

### B2 — Lead Gate → CRM Integration

**Edge Function `ebook-lead-capture`** — chamada pelo `PublicEbookPage` após submit do lead gate:

```text
Input: workspace_id, ebook_id, view_id, name, email, consent_given,
       marketing_opt_in, utm_source, utm_medium, utm_campaign, slug

Lógica:
1. Procurar contacto por email no workspace
2. Se existe → atualizar (source tags, marketing_opt_in)
3. Se não existe → criar contacto (first_name, email, source="ebook", source_detail=slug)
4. Associar contact_id ao ebook_view
5. Aplicar tag "ebook:<slug>"
6. Se utm_campaign → aplicar tag "campaign:<utm_campaign>"
7. Se marketing_opt_in → aplicar tag "marketing_opt_in"
8. Emitir kernel events:
   - ebook.lead_captured
   - ebook.contact_created (se novo)
   - ebook.contact_matched (se existente)
   - ebook.marketing_opt_in (se aplicável)
9. Retornar contact_id
```

**Alterações no `PublicEbookPage.tsx`:**
- Após `createView`, invocar `ebook-lead-capture` via `supabase.functions.invoke`
- Actualizar o `view_id` com o `contact_id` retornado

---

### B3 — CTA Rendering no Leitor

**Criar `src/components/ebooks/EbookCtaOverlay.tsx`:**
- Componente que recebe lista de CTAs activos e posição actual
- Renderiza CTA final na última página (antes da página de contacto)
- Renderiza CTA inline/after_chapter quando a página corresponde
- Tipos suportados: link externo, WhatsApp (abre `wa.me`), booking, contacto, internal
- Style variants: `default`, `prominent`, `subtle`
- Ao entrar em viewport: `trackCtaEvent(cta_impression)`
- Ao clicar: `trackCtaEvent(cta_click)` + abrir destino

**Alterações no `FlipbookReader.tsx`:**
- Aceitar prop `ctas: EbookCta[]`
- Integrar `EbookCtaOverlay` nas páginas relevantes
- Passar `viewId` e `workspaceId` para tracking

**Alterações no `PublicEbookPage.tsx`:**
- Carregar CTAs via `useEbookCtas` (query pública, já existe)
- Passar CTAs ao `FlipbookReader`

---

### B4 — Automações Comerciais

**Na Edge Function `ebook-lead-capture`:**
- Já cobre: criar contacto, tags, kernel events

**Evento de leitura concluída** — no `EbookReadTracker.tsx`:
- Quando `completed` passa a `true`:
  - Invocar edge function ou emitir kernel event `ebook.read_completed`
  - (V2: criar tarefa para comercial)

**Evento de CTA click** — no `EbookCtaOverlay`:
- Emitir kernel event `ebook.cta_click` via `trackCtaEvent`
- Kernel processa: atualiza score, timeline

**Kernel Events a criar:**
- `ebook.lead_captured` (entity: contact)
- `ebook.contact_created` (entity: contact)
- `ebook.contact_matched` (entity: contact)
- `ebook.marketing_opt_in` (entity: contact)
- `ebook.read_completed` (entity: ebook_view)
- `ebook.cta_click` (entity: ebook_cta)
- `ebook.cta_impression` (entity: ebook_cta)

---

### B5 — Analytics Dashboard 3 Secções

**Reestruturar `EbookAnalytics.tsx` em 3 tabs/secções:**

**1. Consumo:**
- Views, unique readers, tempo médio, conclusão, drop-off
- Gráfico diário, dispositivos, fontes (já existe)

**2. Captação:**
- Leads captados (views com email)
- Consentimentos dados
- Opt-in marketing
- Contactos criados (novos) vs já existentes no CRM
- Lead gate conversion rate

**3. Conversão:**
- CTA impressions, clicks, CTR
- Ranking de CTAs (tabela com label, impressões, cliques, CTR)
- Conversão por origem (utm_source × CTA clicks)
- Melhor campanha
- Funil visual: Views → Gated Leads → Consentidos → CRM → CTA Clicks

**Novo hook `useEbookConversionKPIs`** — agrega dados de `ebook_views` + `ebook_cta_events` para métricas de captação e conversão separadas.

---

### B6 — Validações e Preflight

**Actualizar `ebookPreflight.ts`:**
- Nova validação: se `consent_required=true`, exigir `consent_text` não vazio
- Nova validação: se `consent_required=true`, exigir `privacy_policy_url` não vazio
- Manter validações existentes

**Actualizar `EbookCtaPanel.tsx`:**
- Validar URL obrigatório para tipos `link`, `whatsapp`, `booking`, `internal`
- Mostrar warning visual se CTA activo sem URL válido
- Adicionar campos extras (whatsapp_number, booking_link) consoante tipo

---

### Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|----------|-------|
| `supabase/migrations/...` | **Criar** — adicionar campos schema |
| `supabase/functions/ebook-lead-capture/index.ts` | **Criar** — CRM integration |
| `src/components/ebooks/EbookCtaOverlay.tsx` | **Criar** — rendering de CTAs no leitor |
| `src/hooks/useEbookConversionKPIs.ts` | **Criar** — métricas de captação e conversão |
| `src/pages/PublicEbookPage.tsx` | **Alterar** — invocar lead-capture, passar CTAs ao reader |
| `src/components/ebooks/FlipbookReader.tsx` | **Alterar** — aceitar e renderizar CTAs |
| `src/components/ebooks/EbookAnalytics.tsx` | **Alterar** — reestruturar em 3 secções + funil |
| `src/components/ebooks/EbookReadTracker.tsx` | **Alterar** — emitir evento read_completed |
| `src/components/ebooks/editor/EbookCtaPanel.tsx` | **Alterar** — campos extras por tipo, validação |
| `src/utils/ebookPreflight.ts` | **Alterar** — validação consent_required |
| `src/hooks/useEbookCtas.ts` | **Alterar** — campos extras no tipo |

---

### Confirmação V1

Após implementação, o módulo conseguirá:
- ✅ Capturar lead (nome + email)
- ✅ Recolher consentimento RGPD com texto configurável
- ✅ Criar ou atualizar contacto no CRM automaticamente
- ✅ Registar origem e campanha (UTM)
- ✅ Mostrar CTA relevante (final, por capítulo, WhatsApp, booking, link)
- ✅ Medir clique em CTA
- ✅ Disparar eventos kernel para automação
- ✅ Medir conversão no dashboard (funil visual)
- ⏳ Segmentar contactos por comportamento (V2)
- ⏳ Permissões granulares (V2)

