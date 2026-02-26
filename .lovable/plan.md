

# Tornar o Nome do Workspace Mais Visível na Sidebar

## Problema

Na sidebar, o header mostra "FastCRM" como texto fixo (linha 82 do Sidebar.tsx). O nome real do workspace só aparece dentro do `WorkspaceSwitcher`, que é um botão pequeno com texto `text-sm` e cor `text-sidebar-foreground` — pouco destacado.

## Alterações

### 1. `src/components/layout/Sidebar.tsx` — Header com nome do workspace

- Substituir o texto fixo "FastCRM" pelo nome do workspace actual (`currentWorkspace?.name`)
- Manter "FastCRM" como fallback se não houver workspace
- Aumentar o tamanho do texto do nome para `text-base font-bold`

### 2. `src/components/layout/WorkspaceSwitcher.tsx` — Melhorar visibilidade

- Aumentar o texto do nome do workspace de `text-sm` para `text-sm font-semibold` com cor mais forte (`text-sidebar-foreground` em vez de `text-sidebar-foreground`)
- Garantir que o nome não fica truncado demasiado cedo (max-width adequado)

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/components/layout/Sidebar.tsx` | Mostrar nome do workspace no header em vez de "FastCRM" |
| `src/components/layout/WorkspaceSwitcher.tsx` | Aumentar destaque do nome |

