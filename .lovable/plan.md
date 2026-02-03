

# Plano: Corrigir Formulário de Reuniões que Aparece Sempre como "Novo"

## Problema Identificado

Quando o utilizador clica numa reunião existente para editar, o formulário aparece sempre vazio como se fosse uma nova reunião. Este comportamento ocorre porque:

### Causa Raiz

O componente `MeetingCreateModal` usa `useForm` com `defaultValues` que é calculado **apenas uma vez** durante a montagem do componente. Quando a prop `meeting` muda de `null` para um objeto de reunião existente, o React Hook Form **não reactualiza automaticamente** os valores do formulário.

```text
┌────────────────────────────────────────────────────────────────┐
│  Fluxo Actual (com problema)                                   │
├────────────────────────────────────────────────────────────────┤
│  1. MeetingsDashboard monta MeetingCreateModal                 │
│     → meeting = null (formulário inicializado como vazio)      │
│                                                                │
│  2. Utilizador clica numa reunião existente                    │
│     → setSelectedMeeting(reuniaoExistente)                     │
│     → setShowCreateModal(true)                                 │
│                                                                │
│  3. Modal abre com meeting = reuniaoExistente                  │
│     → MAS o form já foi inicializado com valores vazios!       │
│     → useForm NÃO reactualiza defaultValues após montagem     │
│                                                                │
│  Resultado: Formulário aparece vazio (como "novo")             │
└────────────────────────────────────────────────────────────────┘
```

## Solucao

Adicionar um `useEffect` que chame `form.reset()` com os novos valores sempre que a prop `meeting` ou o estado `open` mude.

### Codigo a Alterar

No ficheiro `src/components/meetings/MeetingCreateModal.tsx`:

```typescript
// Adicionar useEffect para resetar o formulário quando meeting muda
useEffect(() => {
  if (open) {
    if (meeting) {
      // Editar reunião existente - preencher com dados
      form.reset({
        title: meeting.title,
        description: meeting.description || '',
        category: meeting.category,
        mode: meeting.mode,
        meeting_type_id: meeting.meeting_type_id || undefined,
        start_date: new Date(meeting.start_time),
        start_time: format(new Date(meeting.start_time), 'HH:mm'),
        duration: Math.round(
          (new Date(meeting.end_time).getTime() - 
           new Date(meeting.start_time).getTime()) / 60000
        ),
        location: meeting.location || '',
        meeting_url: meeting.meeting_url || '',
        phone_number: meeting.phone_number || '',
        contact_id: meeting.contact_id || undefined,
        company_id: meeting.company_id || undefined,
        internal_notes: meeting.internal_notes || '',
      });
      setEntityValue({
        contactId: meeting.contact_id || null,
        companyId: meeting.company_id || null,
      });
    } else {
      // Nova reunião - limpar formulário
      form.reset({
        title: '',
        description: '',
        category: 'client',
        mode: 'online',
        start_date: defaultDate,
        start_time: format(defaultDate, 'HH:mm'),
        duration: 60,
        location: '',
        meeting_url: '',
        phone_number: '',
        internal_notes: '',
      });
      setEntityValue({ contactId: null, companyId: null });
    }
  }
}, [open, meeting, defaultDate, form]);
```

### Fluxo Corrigido

```text
┌────────────────────────────────────────────────────────────────┐
│  Fluxo Após Correcção                                          │
├────────────────────────────────────────────────────────────────┤
│  1. Utilizador clica numa reunião existente                    │
│     → setSelectedMeeting(reuniaoExistente)                     │
│     → setShowCreateModal(true)                                 │
│                                                                │
│  2. Modal abre (open = true, meeting = reuniaoExistente)       │
│                                                                │
│  3. useEffect detecta mudança em [open, meeting]               │
│     → form.reset(valoresDaReuniaoExistente)                   │
│     → setEntityValue(contacto/empresa da reunião)              │
│                                                                │
│  Resultado: Formulário mostra dados da reunião existente       │
└────────────────────────────────────────────────────────────────┘
```

## Nota Adicional

O problema secundário mencionado anteriormente (reunião no calendário não aparece na aba Reuniões) é expectável porque:
- **Agenda/Calendário** usa a tabela `calendar_events`
- **Reuniões** usa a tabela `meetings`
- São sistemas separados

Esta correcção foca-se no problema do formulário. A sincronização entre sistemas seria uma funcionalidade adicional.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/meetings/MeetingCreateModal.tsx` | Adicionar useEffect para resetar formulário quando `meeting` ou `open` mudam |

## Complexidade

Baixa - Apenas uma alteração num ficheiro para adicionar o useEffect de reset.

