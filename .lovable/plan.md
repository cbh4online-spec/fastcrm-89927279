

# Links Públicos de Agendamento para Clientes

## Resumo

Criar um sistema de booking pages que gera links públicos partilháveis. Os clientes acedem ao link, veem os horários disponíveis e marcam diretamente — sem necessitar de conta ou login.

## Arquitetura

```text
┌─────────────────────────┐       ┌──────────────────────────┐
│  CRM (SchedulingHub)    │       │  Página Pública          │
│  - Criar booking page   │       │  /book/:slug             │
│  - Slug + calendário    │──────▶│  - Mostra disponibilidade│
│  - Copiar link público  │       │  - Cliente escolhe slot  │
│  - Ativar/desativar     │       │  - Preenche nome+email   │
└─────────────────────────┘       │  - Confirma agendamento  │
                                  └──────────┬───────────────┘
                                             │
                                   ┌─────────▼────────────┐
                                   │  Edge Function        │
                                   │  public-booking       │
                                   │  - Valida slot livre  │
                                   │  - Cria calendar_event│
                                   │  - Retorna confirmação│
                                   └──────────────────────┘
```

## Passos de Implementação

### 1. Tabela `booking_pages` (migração SQL)

Nova tabela para armazenar as páginas de booking:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | Workspace associado |
| calendar_id | uuid FK | Calendário destino dos eventos |
| availability_id | uuid FK (nullable) | Disponibilidade a usar (ou null = qualquer horário do calendário) |
| slug | text UNIQUE | Identificador no URL público |
| title | text | Nome exibido ao cliente (ex: "Reunião com João") |
| description | text | Instrução para o cliente |
| duration_minutes | int | Duração do slot (15, 30, 60) |
| buffer_minutes | int | Intervalo entre slots |
| max_advance_days | int | Quantos dias no futuro o cliente pode marcar |
| is_active | boolean | Ativar/desativar link |
| brand_color | text | Cor da página pública |
| created_at / updated_at | timestamp | |

RLS: leitura pública para `is_active = true`, escrita apenas para membros autenticados do workspace.

### 2. Hook `useBookingPages`

CRUD completo para gerir booking pages no dashboard. Segue o padrão existente dos hooks (`useCalendars`, `useAvailability`).

### 3. Gestão no SchedulingHub

Adicionar uma nova tab **"Links de Agendamento"** ao SchedulingHub (ao lado de Agenda, Reuniões, Serviços, Disponibilidade):
- Lista de booking pages criadas
- Botão para criar nova booking page (modal com título, calendário, duração, slug)
- Copiar link público com um clique
- Toggle ativo/inativo
- Estatísticas simples (agendamentos recebidos)

### 4. Página Pública `/book/:slug`

Rota pública em `App.tsx` (sem autenticação). A página:
1. Busca a booking page pelo slug (query pública via RLS)
2. Carrega a disponibilidade associada e eventos existentes do calendário
3. Mostra um calendário de dias com slots livres
4. O cliente seleciona dia → vê horários disponíveis
5. Preenche nome e email → confirma
6. Submete via edge function

Design: minimalista, responsivo, com a `brand_color` da booking page. Segue o estilo visual existente (dark theme com acentos).

### 5. Edge Function `public-booking`

Recebe `{ booking_page_id, date, start_time, guest_name, guest_email }`:
- Valida que a booking page está ativa
- Verifica que o slot está livre (sem sobreposição com eventos existentes)
- Cria o `calendar_event` no calendário destino
- Retorna confirmação com detalhes do agendamento

Sem JWT (`verify_jwt = false`) — é público.

### 6. Rota em App.tsx

```
<Route path="/book/:slug" element={<PublicBookingPage />} />
```

## Ficheiros a criar/editar

- **Criar**: migração SQL para `booking_pages`
- **Criar**: `src/hooks/useBookingPages.ts`
- **Criar**: `src/pages/PublicBookingPage.tsx`
- **Criar**: `src/components/scheduling/BookingPagesTab.tsx`
- **Criar**: `src/components/scheduling/BookingPageModal.tsx`
- **Criar**: `supabase/functions/public-booking/index.ts`
- **Editar**: `src/App.tsx` — adicionar rota `/book/:slug`
- **Editar**: `src/components/scheduling/SchedulingHub.tsx` — nova tab "Links"

