

## Correção: Botões de Tipo/Modo na criação de reunião

### Diagnóstico

O `useEffect` de reset do formulário (linha 154-200) tem `defaultDate` nas dependências. Como `defaultDate` tem valor por defeito `new Date()` (linha 106), cada re-render do componente pai cria um novo objecto Date, disparando o useEffect e fazendo reset ao formulário — o que reverte `category` para `'client'` e `mode` para `'online'` imediatamente após o click.

### Correção

**Ficheiro**: `src/components/meetings/MeetingCreateModal.tsx`

1. Remover `defaultDate` do array de dependências do `useEffect` — usar `useRef` para guardar o valor de `defaultDate` no momento da abertura do modal, evitando re-triggers.

Alternativa mais simples: manter `defaultDate` no efeito mas comparar apenas quando `open` muda de `false` para `true` (usar ref para tracking do estado anterior de `open`).

**Abordagem escolhida**: Usar um `useRef` para capturar `defaultDate` e remover da dep array, já que o reset só deve acontecer quando `open` muda ou `meeting` muda — não quando a data por defeito flutua.

```tsx
// Guardar defaultDate em ref para evitar re-triggers
const defaultDateRef = useRef(defaultDate);
useEffect(() => {
  defaultDateRef.current = defaultDate;
}, [defaultDate]);

// No useEffect de reset, usar defaultDateRef.current e remover defaultDate das deps
useEffect(() => {
  if (open) {
    if (meeting) { /* ... existing reset with meeting data ... */ }
    else {
      form.reset({
        ...defaults,
        start_date: defaultDateRef.current,
        start_time: format(defaultDateRef.current, 'HH:mm'),
      });
    }
  }
}, [open, meeting, form]); // sem defaultDate
```

### Critérios de Aceitação

1. Clicar em "Interna" ou "Híbrida" alterna visualmente e persiste a seleção
2. Clicar em "Presencial", "Telefone" ou "WhatsApp" alterna e persiste
3. O formulário submete com os valores corretos de category e mode
4. Reset funciona correctamente ao reabrir o modal

