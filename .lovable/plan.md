

# Fix: Menus não funcionam no modal "Nova Reunião"

## Diagnóstico
O modal `MeetingCreateModal` usa `Dialog` (Radix). Dentro dele, existem:
1. **EntityPicker** — usa `Popover` (Radix) para o dropdown de contactos/empresas
2. **Calendário de data** — usa `Popover` (Radix) para o date picker
3. **Duração** — usa `Select` (Radix)

O problema: quando um `Popover` abre dentro de um `Dialog` modal, o Radix cria dois "focus traps" em conflito. O Dialog tenta manter o foco dentro de si, mas o Popover (que é modal por defeito) também tenta capturar o foco. Resultado: os menus abrem mas não respondem a cliques, ou nem sequer abrem.

O `Select` usa `Portal` e geralmente funciona, mas pode ter conflitos semelhantes.

## Solução
Adicionar `modal={false}` aos componentes `Popover` que estão dentro de Dialogs:

### 1. `EntityPicker.tsx` — Popover com `modal={false}`
Linha 132: `<Popover open={open} onOpenChange={setOpen}>` → `<Popover open={open} onOpenChange={setOpen} modal={false}>`

### 2. `MeetingCreateModal.tsx` — Date Popover com `modal={false}`
Linha 385: `<Popover>` → `<Popover modal={false}>`

| Ficheiro | Alteração |
|---|---|
| `src/components/common/EntityPicker.tsx` | Adicionar `modal={false}` ao Popover |
| `src/components/meetings/MeetingCreateModal.tsx` | Adicionar `modal={false}` ao Popover do calendário |

### Resultado esperado
- Dropdown de "Cliente/Participante" abre e permite selecionar contactos/empresas
- Calendário de data abre e permite selecionar datas
- Select de duração funciona normalmente
- Todos os menus respondem a cliques dentro do modal

