
# Plano: Pre-preencher Contacto/Lead/Empresa no Modal de Agendamento

## Problema Identificado

Quando o utilizador esta dentro de um Contacto/Lead/Empresa e clica em "Agendar", o modal de criacao de evento abre mas o campo "Cliente/Contacto" esta vazio, obrigando o utilizador a procurar manualmente a entidade que ja esta a visualizar.

### Causa Tecnica

O componente `EntitySchedulingSection` passa as props `entityType` e `entityId` mas o `CalendarEventModal` nao recebe nem utiliza esses valores para pre-preencher o `EntityPicker`.

```text
Fluxo Atual:
+---------------------------+     +----------------------+
| EntitySchedulingSection   |     | CalendarEventModal   |
|---------------------------|     |----------------------|
| entityType = 'contact'    | --> | entityValue = null   | <- Problema!
| entityId = '7f32644f...'  |     | (sempre vazio)       |
| entityName = 'Joao'       |     |                      |
+---------------------------+     +----------------------+
```

### Solucao

Adicionar novas props ao `CalendarEventModal` para receber os dados da entidade e usa-los para inicializar o estado `entityValue`.

```text
Fluxo Corrigido:
+---------------------------+     +------------------------+
| EntitySchedulingSection   |     | CalendarEventModal     |
|---------------------------|     |------------------------|
| entityType = 'contact'    | --> | defaultContactId       |
| entityId = '7f32644f...'  | --> | defaultCompanyId       |
| entityName = 'Joao'       | --> | entityValue = preenchido|
+---------------------------+     +------------------------+
```

## Alteracoes Necessarias

### 1. Ficheiro: `src/components/calendars/CalendarEventModal.tsx`

Adicionar novas props opcionais para pre-preencher a entidade:

```typescript
interface CalendarEventModalProps {
  // ... props existentes
  defaultContactId?: string | null;
  defaultCompanyId?: string | null;
  defaultLeadId?: string | null;
}
```

Modificar o `useEffect` para usar esses valores quando o modal abre para criar um novo evento:

```typescript
useEffect(() => {
  if (open) {
    if (event) {
      // ... logica existente para editar evento
    } else {
      // Reset com os valores default da entidade
      setEntityValue({ 
        contactId: defaultContactId || null, 
        companyId: defaultCompanyId || null,
        leadId: defaultLeadId || null,
      });
    }
  }
}, [open, event, defaultContactId, defaultCompanyId, defaultLeadId]);
```

### 2. Ficheiro: `src/components/scheduling/EntitySchedulingSection.tsx`

Passar os valores de entidade para o `CalendarEventModal`:

```typescript
<CalendarEventModal
  open={showEventModal}
  onOpenChange={setShowEventModal}
  calendars={calendars}
  event={null}
  defaultDate={new Date()}
  onSubmit={handleCreateEvent}
  onDelete={async () => {}}
  // Novas props para pre-preencher
  defaultContactId={entityType === 'contact' ? entityId : null}
  defaultCompanyId={entityType === 'company' ? entityId : null}
  defaultLeadId={entityType === 'lead' ? entityId : null}
/>
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/calendars/CalendarEventModal.tsx` | Adicionar props `defaultContactId`, `defaultCompanyId`, `defaultLeadId` e usar no `useEffect` |
| `src/components/scheduling/EntitySchedulingSection.tsx` | Passar os IDs da entidade atual para o modal |

## Resultado Esperado

1. Utilizador abre detalhe de um Contacto (ex: "Joao Silva")
2. Clica em "Agendamentos" no menu lateral
3. Clica no botao "Agendar"
4. O modal abre com "Joao Silva" ja selecionado no campo "Cliente/Contacto"
5. Utilizador so precisa preencher titulo, data e hora

## Complexidade

Baixa - Apenas adicionar props opcionais e ajustar a logica de inicializacao do estado.
