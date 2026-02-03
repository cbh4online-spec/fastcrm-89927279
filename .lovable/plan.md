

# Plano: Adicionar Possibilidade de Apagar Eventos

## Situacao Atual

A funcionalidade de apagar eventos **ja esta parcialmente implementada**:
- O hook `useCalendarEvents` tem a funcao `deleteEvent`
- O modal `CalendarEventModal` tem o botao "Eliminar" no footer
- A funcao `handleDeleteEvent` esta definida e passada ao modal

No entanto, **existe um bug** que impede o correto funcionamento:

### Bug Identificado

O formulario do `CalendarEventModal` nao recarrega os dados quando um evento e selecionado para edicao. Isto acontece porque:

| O que deveria acontecer | O que acontece atualmente |
|-------------------------|---------------------------|
| Ao abrir o modal com um evento, os dados devem ser preenchidos | Os dados do evento nao carregam corretamente |
| O botao "Eliminar" deve aparecer | Como o formulario nao reconhece o evento, pode haver comportamento inconsistente |

**Causa Raiz:** O `useForm` usa `defaultValues` que sao calculados apenas na montagem inicial do componente. Quando o `event` muda (de null para um evento existente), o formulario nao e atualizado.

### Comparacao com Implementacao Correta

O `CalendarCreateModal.tsx` tem o pattern correto:

```typescript
useEffect(() => {
  if (open) {
    if (calendar) {
      form.reset({ /* dados do calendario */ });
    } else {
      form.reset({ /* valores default */ });
    }
  }
}, [open, calendar, form]);
```

O `CalendarEventModal.tsx` **nao tem** este `useEffect`.

## Solucao

Adicionar um `useEffect` ao `CalendarEventModal` para fazer `form.reset()` quando o modal abre ou o evento muda.

### Codigo a Adicionar

```typescript
// Adicionar apos linha 127, antes do handleSubmit
useEffect(() => {
  if (open) {
    if (event) {
      form.reset({
        calendar_id: event.calendar_id,
        title: event.title,
        description: event.description || '',
        start_date: new Date(event.start_time),
        start_time: format(new Date(event.start_time), 'HH:mm'),
        end_date: new Date(event.end_time),
        end_time: format(new Date(event.end_time), 'HH:mm'),
        all_day: event.all_day,
        location: event.location || '',
        meeting_url: event.meeting_url || '',
        status: event.status,
        contact_id: event.contact_id || null,
        company_id: event.company_id || null,
      });
      setEntityValue({
        contactId: event.contact_id || null,
        companyId: event.company_id || null,
      });
    } else {
      form.reset({
        calendar_id: calendars[0]?.id || '',
        title: '',
        description: '',
        start_date: defaultDate,
        start_time: format(defaultDate, 'HH:mm'),
        end_date: defaultDate,
        end_time: format(new Date(defaultDate.getTime() + 60 * 60 * 1000), 'HH:mm'),
        all_day: false,
        location: '',
        meeting_url: '',
        status: 'confirmed',
        contact_id: null,
        company_id: null,
      });
      setEntityValue({ contactId: null, companyId: null });
    }
  }
}, [open, event, calendars, defaultDate, form]);
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/calendars/CalendarEventModal.tsx` | Adicionar `useEffect` para resetar o formulario quando o modal abre |

## Complexidade

Baixa - Apenas adicao de um useEffect.

## Resultado Esperado

Apos a correcao:
1. Ao clicar num evento no calendario, o modal abre com todos os dados preenchidos
2. O botao "Eliminar" aparece no rodape do modal (a esquerda)
3. Ao clicar em "Eliminar", o evento e removido da base de dados
4. Ao criar um novo evento, o formulario aparece vazio

