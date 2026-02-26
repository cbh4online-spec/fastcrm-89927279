

# Zona de Convites & Eventos com Picker de Atributos estilo Attio

## Contexto

A tabela `community_events` existe mas é muito básica (title, description, event_type, starts_at, ends_at, link). O utilizador quer uma zona completa de gestão de eventos/convites com um picker de atributos idêntico ao Attio (screenshot).

## Alterações

### 1. Migração DB — Expandir `community_events` com novos campos

Adicionar colunas à tabela existente:
- `location` (text) — local do evento
- `location_url` (text) — link Google Maps
- `capacity` (integer) — capacidade máxima
- `event_category` (text) — categoria (networking, jantar, workshop, webinar, conferência, outro)
- `rsvp_required` (boolean, default true)
- `cover_image_url` (text)
- `host_name` (text)
- `host_email` (text)
- `host_phone` (text)
- `price` (numeric) — preço (0 = grátis)
- `currency` (text, default 'EUR')
- `status` (text, default 'draft') — draft, published, cancelled, completed
- `tags` (text[])
- `metadata` (jsonb) — campos dinâmicos adicionais

Criar tabela `event_rsvps`:
- `id`, `event_id` (FK), `workspace_id`, `contact_id` (FK nullable), `name`, `email`, `phone`, `status` (invited/confirmed/declined/attended), `invited_at`, `responded_at`, `notes`, `created_at`

RLS policies para ambas, filtradas por workspace_id.

### 2. Novo componente `src/components/events/AttioAttributePicker.tsx`

Popover com 2 painéis lado a lado (como no screenshot):

**Painel direito** (lista de atributos existentes):
- Lista dos campos actuais do evento com ícones por tipo
- Cada item mostra nome + contagem de registos (quando aplicável)
- Footer: "+ Criar novo atributo >" que abre o painel esquerdo

**Painel esquerdo** (tipos de campo — visível ao clicar "Criar novo atributo"):
- Secção "Tipo": Text, Number, Checkbox, Date, Select, Multi-select, Currency, Status, Location, Phone Number, URL, Email, User, Record
- Ao clicar num tipo, abre inline um input para nome do atributo e guarda via `core_object_fields` ou campo JSONB metadata

### 3. Novo componente `src/components/events/EventsManagementPage.tsx`

Página principal com:
- Header com título "Eventos & Convites" + botão "Criar Evento"
- Tabs: Próximos | Passados | Rascunhos | Cancelados
- Cards de eventos com: título, data, local, categoria badge, contagem RSVPs, status badge
- Cada card navega para detalhe

### 4. Novo componente `src/components/events/CreateEventDialog.tsx`

Dialog de criação com campos:
- Título, Descrição, Categoria (select), Data início/fim
- Local + URL mapa, Capacidade, Preço
- Host (nome, email, phone)
- Tags, Link externo, Imagem de capa
- Status (draft/published)
- Integração com `AttioAttributePicker` para adicionar campos personalizados

### 5. Novo componente `src/components/events/EventDetailPage.tsx`

Vista de detalhe do evento com:
- Header com dados do evento
- Tab RSVPs: lista de convidados com status (invited/confirmed/declined/attended)
- Botão "Convidar" — selecionar contactos existentes ou adicionar manualmente
- Tab Detalhes: campos do evento + atributos personalizados via picker Attio

### 6. Hook `src/hooks/useEvents.ts`

CRUD completo para `community_events` (expandida) e `event_rsvps`:
- `useEvents(workspaceId, filters)` — listar com filtros por status/categoria
- `useEvent(eventId)` — detalhe
- `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent`
- `useEventRSVPs(eventId)` — listar convidados
- `useInviteToEvent`, `useUpdateRSVP`

### 7. Rota no `App.tsx`

- `/dashboard/events` → `EventsManagementPage`
- `/dashboard/events/:eventId` → `EventDetailPage`

| Ficheiro | Acção |
|----------|-------|
| SQL migration | Expandir `community_events` + criar `event_rsvps` com RLS |
| `src/components/events/AttioAttributePicker.tsx` | Picker de atributos estilo Attio (2 painéis) |
| `src/components/events/EventsManagementPage.tsx` | Página principal de eventos |
| `src/components/events/CreateEventDialog.tsx` | Dialog de criação de evento |
| `src/components/events/EventDetailPage.tsx` | Detalhe do evento com RSVPs |
| `src/hooks/useEvents.ts` | Hook CRUD eventos + RSVPs |
| `src/App.tsx` | Adicionar rotas /dashboard/events |

