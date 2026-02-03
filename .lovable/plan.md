

# Plano: Unificar Visualização de Reuniões - Combinar Agenda e Reuniões

## Problema Identificado

O sistema tem **duas tabelas separadas** para gerir eventos/reuniões:

| Sistema | Tabela | Usado em | Estado |
|---------|--------|----------|--------|
| Agenda | `calendar_events` | `/dashboard/calendars`, aba "Agenda" | ✅ Tem a reunião "Reunião Mafalda Jacinto" |
| Reuniões | `meetings` | Aba "Reuniões" | ❌ Vazia |

**Resultado**: A reunião criada na Agenda não aparece na aba "Reuniões" porque são sistemas independentes.

## Opções de Solução

### Opção A: Mostrar calendar_events na aba Reuniões (Recomendado)
Modificar o dashboard de Reuniões para também consultar eventos do calendário que sejam do tipo "reunião".

**Vantagens**:
- Sem alteração na base de dados
- Implementação rápida
- Utilizador vê todas as reuniões num só local

**Desvantagens**:
- Dados vêm de duas fontes (complexidade de gestão)

### Opção B: Sincronização automática entre tabelas
Quando um evento é criado na Agenda, criar automaticamente uma entrada na tabela `meetings`.

**Vantagens**:
- Dados consistentes
- Funcionalidades específicas de reuniões (outcome, follow-up) disponíveis

**Desvantagens**:
- Duplicação de dados
- Precisa de trigger ou lógica adicional

### Opção C: Migrar para tabela única
Usar apenas a tabela `meetings` para tudo, removendo dependência de `calendar_events`.

**Desvantagens**:
- Grande refactoring
- Perde funcionalidades específicas de calendário

## Solução Proposta: Opção A

Modificar o `useMeetings` hook para também buscar eventos de `calendar_events` e apresentá-los de forma unificada na aba Reuniões.

### Implementação Técnica

#### 1. Criar função de mapeamento

```typescript
// Mapear calendar_events para o formato Meeting
function mapCalendarEventToMeeting(event: CalendarEvent): Meeting {
  return {
    id: event.id,
    workspace_id: event.workspace_id,
    title: event.title,
    description: event.description,
    category: 'client', // Default para eventos de calendário
    mode: event.meeting_url ? 'online' : 'in_person',
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    meeting_url: event.meeting_url,
    status: event.status === 'confirmed' ? 'confirmed' : 'pending',
    contact_id: event.contact_id,
    company_id: event.company_id,
    // ... outros campos com valores default
    source: 'calendar_event', // Identificar origem
  };
}
```

#### 2. Modificar useMeetings hook

```typescript
const fetchMeetings = useCallback(async () => {
  // Buscar da tabela meetings
  const { data: meetingsData } = await supabase
    .from('meetings')
    .select('*, contact:contacts(...), company:companies(...)')
    .eq('workspace_id', currentWorkspace.id);

  // Buscar da tabela calendar_events
  const { data: eventsData } = await supabase
    .from('calendar_events')
    .select('*, calendar:calendars(...)')
    .eq('workspace_id', currentWorkspace.id);

  // Combinar ambos
  const combined = [
    ...(meetingsData || []),
    ...(eventsData || []).map(mapCalendarEventToMeeting),
  ];

  // Ordenar por data
  combined.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  setMeetings(combined);
}, [...]);
```

#### 3. Adicionar indicador visual de origem

No `MeetingCard.tsx`, mostrar badge indicando se é "Reunião" ou "Evento de Calendário" para o utilizador saber onde editar.

### Fluxo Após Implementação

```text
┌─────────────────────────────────────────────────────────────────┐
│  Utilizador abre aba "Reuniões"                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  useMeetings hook                                               │
│  ├── SELECT * FROM meetings WHERE workspace_id = ...           │
│  └── SELECT * FROM calendar_events WHERE workspace_id = ...    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Combinar + Ordenar por data                                    │
│  ├── meetings[]                                                │
│  └── calendar_events[] → mapeados para formato Meeting        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard mostra TODAS as reuniões:                           │
│  ✅ "Reunião Mafalda Jacinto" (de calendar_events)             │
│  ✅ Reuniões criadas via MeetingCreateModal (de meetings)      │
└─────────────────────────────────────────────────────────────────┘
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useMeetings.ts` | Adicionar query a `calendar_events` e combinar resultados |
| `src/hooks/useCalendars.ts` | Reutilizar tipo `CalendarEvent` |
| `src/components/meetings/MeetingCard.tsx` | Adicionar badge de origem |

## Considerações

1. **Edição**: Quando o utilizador clicar para editar uma reunião vinda de `calendar_events`, abrir o `CalendarEventModal` em vez do `MeetingCreateModal`

2. **Funcionalidades limitadas**: Eventos de calendário não terão acesso a funcionalidades específicas de reuniões como "Registar Outcome" ou "Follow-up" (a menos que sejam migrados)

3. **Filtros**: Adicionar filtro opcional "Origem: Reuniões | Eventos | Todos"

## Complexidade

Média - Requer:
- Modificação do hook de reuniões
- Função de mapeamento de tipos
- Lógica condicional para edição
- Badge visual de origem

