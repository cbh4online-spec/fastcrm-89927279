
# Plano: Corrigir Reuniões - Sincronização e Linking com Clientes

## Estado: ✅ IMPLEMENTADO

## Problemas Identificados

### Problema 1: Reunião de hoje não aparece na lista

A reunião "Reunião Mafalda Jacinto" foi criada no sistema de **Agenda** (tabela `calendar_events`), mas o utilizador está a procurar na aba **Reuniões** (tabela `meetings`).

| Sistema | Tabela | Onde se cria | Estado actual |
|---------|--------|--------------|---------------|
| Agenda/Calendário | `calendar_events` | CalendarEventModal | ✅ Reunião existe aqui |
| Reuniões | `meetings` | MeetingCreateModal | ❌ Tabela vazia |

**Causa**: Os dois sistemas não estão sincronizados.

### Problema 2: Formulário não linka com cliente

Ambos os formulários (`CalendarEventModal` e `MeetingCreateModal`) não têm campos visíveis para selecionar o contacto ou empresa associada, apesar de:
- A interface (`CreateEventData`, `CreateMeetingData`) suportar `contact_id`, `company_id`
- As tabelas terem esses campos

## Solução Implementada

### ✅ Parte A: Hook useEntitySearch

Criado `src/hooks/useEntitySearch.ts`:
- Pesquisa de contactos e empresas
- Métodos: `search()`, `searchContacts()`, `searchCompanies()`
- Métodos auxiliares: `getContactById()`, `getCompanyById()`

### ✅ Parte B: Componente EntityPicker

Criado `src/components/common/EntityPicker.tsx`:
- Selector reutilizável para contactos/empresas
- Pesquisa em tempo real com debounce
- Mostra avatar, nome, email/empresa
- Separação visual entre contactos e empresas

### ✅ Parte C: Integração no CalendarEventModal

Modificado `src/components/calendars/CalendarEventModal.tsx`:
- Adicionado campo "Cliente/Contacto" após o título
- Passa `contact_id` e `company_id` para o backend

### ✅ Parte D: Integração no MeetingCreateModal

Modificado `src/components/meetings/MeetingCreateModal.tsx`:
- Campo "Cliente/Participante" visível para reuniões do tipo "Cliente" ou "Híbrida"
- Passa `contact_id` e `company_id` para o backend

## Ficheiros Criados/Modificados

| Ficheiro | Acção | Estado |
|----------|-------|--------|
| `src/hooks/useEntitySearch.ts` | Criado | ✅ |
| `src/components/common/EntityPicker.tsx` | Criado | ✅ |
| `src/components/calendars/CalendarEventModal.tsx` | Modificado | ✅ |
| `src/components/meetings/MeetingCreateModal.tsx` | Modificado | ✅ |

## Fluxo UX Implementado

### Criar Evento com Cliente (Agenda)

1. Utilizador abre "Novo Evento" na Agenda
2. Preenche título
3. Clica em "Cliente/Contacto"
4. Pesquisa e selecciona o contacto
5. Preenche data/hora
6. Guarda → Evento criado com `contact_id` ou `company_id`

### Criar Reunião com Cliente (Reuniões)

1. Utilizador abre "Nova Reunião"
2. Selecciona categoria "Cliente" ou "Híbrida"
3. Campo "Cliente/Participante" aparece
4. Pesquisa e selecciona contacto/empresa
5. Preenche restantes campos
6. Guarda → Reunião criada com cliente associado

## Nota sobre Sincronização

Os dois sistemas (Agenda e Reuniões) continuam independentes. Para ver a reunião na lista de Reuniões, deve ser criada através do formulário de Reuniões (`/dashboard/meetings`).
