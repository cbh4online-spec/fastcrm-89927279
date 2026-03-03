

## Corrigir visibilidade do formulário de eventos

O problema é que o `CalendarEventModal` tem muitos campos e o conteúdo ultrapassa a altura visível do ecrã sem scroll.

### Correção

**Ficheiro:** `src/components/calendars/CalendarEventModal.tsx`

- Adicionar `max-h-[90vh] overflow-y-auto` ao `DialogContent` (linha 214) para permitir scroll quando o conteúdo excede a altura do viewport
- Mudar de `sm:max-w-[500px]` para `sm:max-w-lg` para consistência com outros dialogs do projeto

Isto é uma correção de 1 linha que resolve o problema de visibilidade imediatamente.

