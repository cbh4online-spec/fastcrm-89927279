

# Adicionar animação suave e auto-expansão nos menus da sidebar

## Diagnóstico
- Os grupos colapsáveis da sidebar usam `Collapsible` do Radix UI, mas o `CollapsibleContent` **não tem animação** — abre/fecha instantaneamente sem transição visual
- O comportamento de auto-expansão já existe (grupo com rota ativa abre automaticamente), mas ao clicar noutro grupo **falta feedback visual** — o conteúdo aparece/desaparece bruscamente
- O projeto já tem keyframes `accordion-down`/`accordion-up` no Tailwind config que podem ser reutilizados

## Alterações

### 1. Animar o `CollapsibleContent` na sidebar (`Sidebar.tsx`)
- Adicionar classes CSS de animação ao `CollapsibleContent` usando `data-[state=open]` e `data-[state=closed]` do Radix
- Usar `overflow-hidden` + animação de altura (grid-template-rows trick ou max-height) para transição suave
- Adicionar `transition-transform` ao ícone `ChevronRight` (já tem `rotate-90`, falta suavizar mais)

### 2. Adicionar animação de entrada nos sub-items
- Cada filho dentro do grupo recebe um `fade-in` com delay escalonado (`stagger`) para efeito cascata
- Usar as animações `fade-in` já existentes no projecto

### 3. Auto-abrir grupo ao clicar (quando grupo tem href direto)
- Actualmente o `toggleGroup` alterna aberto/fechado — manter este comportamento
- Garantir que ao clicar, o grupo **abre automaticamente** se estava fechado (já funciona via `onOpenChange`)

### Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/components/layout/Sidebar.tsx` | Adicionar classes de animação ao `CollapsibleContent`, stagger nos filhos |
| `src/components/ui/collapsible.tsx` | (Opcional) Criar `CollapsibleContent` com animação por defeito via `forwardRef` e classes Tailwind |

### Resultado esperado
- Ao clicar num grupo (ex: "Operações"), os sub-itens deslizam suavemente para baixo com fade-in escalonado
- O ícone `ChevronRight` roda suavemente para 90°
- Ao fechar, os itens recolhem com animação inversa
- Feedback visual claro que guia o utilizador

