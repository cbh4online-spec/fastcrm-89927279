

## Campo Gestor editável em Leads, Contactos e Empresas

### Situação actual

- As 3 tabelas (`leads`, `contacts`, `companies`) já possuem o campo `assigned_to` (UUID nullable)
- O `EntityContextSidebar` mostra o gestor read-only **mas recebe `assignedUser` como prop** — nenhum componente pai envia esta prop, logo aparece sempre vazio
- Não existe nenhum seletor para alterar o gestor

### Plano

**1. Criar `EntityOwnerSelector.tsx`** — componente reutilizável
- Dropdown com lista de membros do workspace (via `useWorkspaceMembers`)
- Avatar + nome de cada membro
- Opção "Sem gestor" para limpar
- Ao selecionar, faz `update` na tabela correspondente (`leads`/`contacts`/`companies`)
- Mostra o gestor atual com avatar quando já atribuído

**2. Integrar no `EntityContextSidebar`**
- Substituir o card "Responsável" read-only pelo novo `EntityOwnerSelector`
- Buscar o perfil do `assigned_to` via query à tabela `profiles`
- Permitir edição inline (click no nome → abre dropdown)

**3. Integrar no `EntityHighlightsGrid`**
- Adicionar highlight "Gestor" que mostra nome+avatar do responsável
- Se não atribuído, mostrar badge "Sem gestor" com ação rápida para atribuir

**4. Integrar nas tabelas de lista**
- A coluna `assigned_to` já existe em `SmartLeadsTable` (hidden por defeito) — garantir que resolve o UUID para nome do perfil

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/entity/EntityOwnerSelector.tsx` | Criar — dropdown de seleção de gestor |
| `src/components/entity/EntityContextSidebar.tsx` | Alterar — usar EntityOwnerSelector em vez do card estático |
| `src/components/entity/EntityHighlightsGrid.tsx` | Alterar — mostrar gestor nos destaques |
| `src/components/entity/EntityDetailLayout.tsx` | Alterar — passar callbacks de update ao sidebar |

### Fluxo

```text
EntityDetailLayout
  └── EntityContextSidebar
        └── EntityOwnerSelector
              ├── useWorkspaceMembers() → lista de membros
              ├── supabase.from(table).update({ assigned_to }) → persiste
              └── queryClient.invalidateQueries() → refresh UI
```

