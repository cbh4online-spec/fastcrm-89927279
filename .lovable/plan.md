

# Estatísticas Avançadas e Tracking de Leitores de eBooks

## Diagnóstico

Actualmente:
- A página pública (`/ebook/:slug`) não regista nenhuma métrica de visualização
- Não existe lead gate — qualquer pessoa acede ao eBook sem identificação
- Não existem tabelas de analytics para eBooks
- O sistema de tracking de visitantes da loja (`store_visitor_sessions`, `store_page_views`) serve de referência de padrão

## Plano

### 1. Novas Tabelas (migração)

**`ebook_views`** — cada sessão de leitura
- `id`, `ebook_id`, `workspace_id`, `session_id` (UUID anónimo ou do browser)
- `reader_email`, `reader_name` (preenchidos se o leitor se registou via gate)
- `contact_id` (FK opcional para `contacts`, se o email corresponder a um contacto existente)
- `referrer`, `utm_source`, `utm_medium`, `utm_campaign`
- `device_type`, `country`
- `pages_viewed` (int), `max_page_reached` (int), `total_pages` (int)
- `time_on_book_seconds` (int), `completed` (bool — chegou à última página)
- `started_at`, `last_activity_at`
- RLS: SELECT para membros do workspace; INSERT com `anon` role (visitantes públicos)

**`ebook_page_events`** — eventos granulares por página
- `id`, `ebook_view_id` (FK), `ebook_id`, `workspace_id`
- `page_number`, `event_type` (`page_view` | `highlight` | `download_pdf` | `share`)
- `duration_seconds`, `created_at`
- RLS: mesma lógica

**Coluna adicional em `ebooks`**: `lead_gate_enabled BOOLEAN DEFAULT false` — controla se o eBook pede dados antes de mostrar conteúdo

### 2. Lead Gate na Página Pública (`PublicEbookPage.tsx`)

- Se `lead_gate_enabled = true`, mostrar formulário antes do flipbook:
  - Campos: Nome, Email (obrigatórios)
  - Ao submeter: inserir em `ebook_views` com `reader_email` e `reader_name`, tentar match com `contacts` pelo email
  - Guardar `session_id` em `localStorage` para não pedir novamente
- Se `lead_gate_enabled = false`, criar registo em `ebook_views` sem dados pessoais (sessão anónima)

### 3. Tracking no FlipbookReader

- Novo componente `EbookReadTracker` (invisível), montado dentro do `FlipbookReader` quando em contexto público
- Props: `ebookId`, `workspaceId`, `viewId` (retornado pelo gate/criação anónima)
- Lógica:
  - Registar `page_view` em `ebook_page_events` a cada mudança de página (debounced 2s)
  - Heartbeat de 30s para actualizar `time_on_book_seconds` e `last_activity_at` em `ebook_views`
  - Actualizar `max_page_reached`, `pages_viewed` e `completed` no heartbeat
  - Cleanup no `beforeunload` com `navigator.sendBeacon`

### 4. Dashboard de Analytics (`EbookAnalytics.tsx`)

Acessível a partir da lista de eBooks (botão "Estatísticas" no card) ou dentro do editor (nova tab):

- **KPIs globais**: Total de visualizações, Leitores únicos, Taxa de conclusão, Tempo médio de leitura
- **Gráfico temporal**: Visualizações por dia/semana (últimos 30 dias)
- **Heatmap de páginas**: Barra de progresso mostrando em que páginas os leitores desistem (drop-off)
- **Tabela de leitores identificados**: Email, nome, páginas lidas, % conclusão, tempo, data — com link para o contacto no CRM se existir match
- **Fontes de tráfego**: UTM source/medium breakdown
- **Dispositivos**: Desktop vs Mobile vs Tablet

### 5. Toggle Lead Gate no Editor

- No `EbookEditor.tsx`, adicionar switch "Captura de Leads" no painel de configurações
- Descrição: "Pedir nome e email antes de permitir leitura"
- Guardar em `ebooks.lead_gate_enabled`

### 6. Integração com CRM

- Na inserção de `ebook_views` com email, fazer match automático com `contacts.email`
- Se match encontrado: preencher `contact_id` e registar actividade em `activity_logs`
- Se não encontrado: opcionalmente criar lead (configurável)

## Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar `ebook_views`, `ebook_page_events`, coluna `lead_gate_enabled` |
| `src/pages/PublicEbookPage.tsx` | Adicionar lead gate + criação de sessão anónima |
| `src/components/ebooks/EbookReadTracker.tsx` | **Novo** — tracking invisível de leitura |
| `src/components/ebooks/EbookAnalytics.tsx` | **Novo** — dashboard de estatísticas |
| `src/hooks/useEbookAnalytics.ts` | **Novo** — queries para dados de analytics |
| `src/components/ebooks/EbookEditor.tsx` | Adicionar toggle lead gate |
| `src/components/ebooks/EbooksList.tsx` | Adicionar botão "Estatísticas" nos cards |
| `src/hooks/useEbooks.ts` | Adicionar campo `lead_gate_enabled` ao tipo |
| `src/components/ebooks/FlipbookReader.tsx` | Montar `EbookReadTracker` quando em contexto público |

## Critérios de aceitação

- Cada visualização pública cria registo em `ebook_views`
- Lead gate funcional quando activado (nome + email obrigatórios)
- Tracking de páginas e tempo em tempo real
- Dashboard com KPIs, gráfico temporal, heatmap de drop-off e tabela de leitores
- Leitores identificados ligados ao CRM quando email coincide
- RLS segura: visitantes inserem, membros do workspace lêem
- Mobile responsivo
- Estados loading, vazio e erro tratados

