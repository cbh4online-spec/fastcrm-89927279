

# Remover o Segundo Menu (DealsSidebar) Duplicado

## Problema

A página de Oportunidades tem **dois menus laterais lado a lado**:

1. **Sidebar principal** (SidebarV1) — com Dashboard, Leads, Contactos, Empresas, Oportunidades, Tarefas, Marketing, etc.
2. **DealsSidebar** — dentro do módulo de Oportunidades, com Quick Actions, Notificações, Tarefas, Notas, Emails, Chamadas, Relatórios, Automações, Empresas, Contactos, Negócios, etc.

O DealsSidebar replica grande parte da navegação que já existe no sidebar principal, criando confusão visual e desperdício de espaço.

## Solução

Remover o `DealsSidebar` por completo e mover a funcionalidade útil (seletor de vistas e Command Palette) para o header do módulo, que já existe.

```text
ANTES                                   DEPOIS
┌────────┬─────────┬──────────────┐     ┌────────┬──────────────────────┐
│Main    │Deals    │              │     │Main    │                      │
│Sidebar │Sidebar  │  Kanban      │     │Sidebar │  Header + Views      │
│        │(duplica)│              │     │        │  Kanban              │
│        │         │              │     │        │                      │
└────────┴─────────┴──────────────┘     └────────┴──────────────────────┘
```

## Alterações

### 1. `src/components/opportunities/OpportunitiesModule.tsx`

- **Remover** o componente `<DealsSidebar>` e todo o estado associado (`sidebarCollapsed`, `setSidebarCollapsed`)
- **Remover** imports de `DealsSidebar`
- O `DealViewSelectorDropdown` já está no header — mantém-se como está
- O `CommandPalette` já está no módulo — mantém-se, mas o trigger passa a ser apenas via ⌘K (já funciona)
- O layout muda de `flex h-full` com sidebar + conteúdo para apenas o conteúdo direto

### 2. Ficheiros não alterados

- `DealsSidebar.tsx` — pode ficar no projeto (dead code) ou ser removido. Não causa impacto.
- Nenhuma outra alteração necessária.

### Resumo

| Ficheiro | Ação |
|----------|------|
| `OpportunitiesModule.tsx` | Remover DealsSidebar, simplificar layout |

