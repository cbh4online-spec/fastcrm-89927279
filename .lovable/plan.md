
# Plano: Metas Individuais e Organizacionais

## Objetivo
Adicionar a distinção entre **metas individuais** (pessoais de cada utilizador) e **metas da organização** (partilhadas por todo o workspace), permitindo uma gestão mais completa da produtividade.

---

## Diferenças Entre os Tipos

| Característica | Individual | Organizacional |
|----------------|------------|----------------|
| **Visibilidade** | Só o utilizador vê | Toda a equipa vê |
| **Responsável** | Um utilizador | Workspace inteiro |
| **Progresso** | Atualizado pelo próprio | Qualquer membro pode atualizar |
| **Criação** | Qualquer utilizador | Apenas Owner/Admin |
| **Exemplo** | "Fazer 10 chamadas hoje" | "Equipa fechar €50.000 este mês" |

---

## Alterações na Base de Dados

Adicionar um campo `goal_scope` à tabela existente:

```text
ALTER TABLE productivity_goals 
ADD COLUMN goal_scope TEXT DEFAULT 'individual' CHECK (goal_scope IN ('individual', 'organizational'));

-- Índice para filtragem eficiente
CREATE INDEX idx_productivity_goals_scope ON productivity_goals(workspace_id, goal_scope);
```

O campo `user_id` será:
- Preenchido para metas individuais (quem criou)
- NULL para metas organizacionais (pertencem ao workspace)

---

## Alterações na Interface

### 1. Modal de Criação - Novo Seletor Visual

Adicionar um seletor de tipo no topo do formulário:

```text
┌────────────────────────────────────────────┐
│         Criar Nova Meta                    │
├────────────────────────────────────────────┤
│                                            │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 👤 Pessoal  │  │ 🏢 Organizacional │  │
│  │             │  │    (Equipa)        │  │
│  │  (Selecionado)│  │                    │  │
│  └─────────────┘  └─────────────────────┘  │
│                                            │
│  Período: [Diária ▼]                       │
│  Título: [________________]                │
│  ...                                       │
└────────────────────────────────────────────┘
```

### 2. Lista de Metas - Tabs ou Filtro

Nova organização com tabs superiores:

```text
┌───────────────────────────────────────────┐
│ Metas                      [+ Nova Meta]  │
├───────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────────────────┐│
│  │ 📋 Todas   │ │ 👤 Minhas │ 🏢 Equipa ││
│  └────────────┘ └────────────────────────┘│
│                                           │
│  [Diária] [Semanal] [Mensal] [Anual]      │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ 🏢 Faturação Mensal      Mensal     │  │
│  │    €45.000 / €50.000               │  │
│  │    [████████████░░] 90%             │  │
│  │    👥 Partilhada com equipa         │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ 👤 Fechar 5 vendas       Semanal    │  │
│  │    3 / 5 vendas                     │  │
│  │    [██████████░░░░░] 60%            │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

### 3. Cards de Meta - Indicador Visual

Cada card mostrará:
- Ícone de tipo (👤 ou 🏢)
- Para organizacionais: número de membros a contribuir
- Badge distintivo com cor diferente

---

## Lógica de Negócio

### Permissões
- **Criar organizacional**: Apenas Owner ou Admin do workspace
- **Editar organizacional**: Qualquer membro autenticado
- **Eliminar organizacional**: Apenas quem criou ou Owner/Admin

### Filtragem
- **Minhas**: `user_id = current_user AND goal_scope = 'individual'`
- **Equipa**: `goal_scope = 'organizational'`
- **Todas**: Ambas combinadas

---

## Ficheiros a Modificar

### 1. Base de Dados (Migração)
- Adicionar coluna `goal_scope` com valor default 'individual'
- Criar índice para performance

### 2. src/hooks/useProductivityCoach.ts
- Atualizar interface `ProductivityGoal` com `goal_scope`
- Adicionar query para metas organizacionais
- Atualizar `createGoal` para incluir `goal_scope`

### 3. src/components/productivity/GoalsManager.tsx
- Adicionar filtro de scope (tabs superiores)
- Implementar seletor visual no modal
- Atualizar `GoalCard` com indicador de tipo
- Verificar permissões para metas organizacionais

### 4. src/integrations/supabase/types.ts
- Será atualizado automaticamente após migração

---

## Melhorias Visuais

### Cores por Tipo
- **Individual**: Azul primário (cor atual)
- **Organizacional**: Verde ou dourado (destaque)

### Animações
- Transição suave entre tabs
- Efeito hover diferenciado para cada tipo

### Empty States
- Mensagens específicas para cada tipo:
  - "Não tens metas pessoais para este período"
  - "A equipa ainda não definiu metas organizacionais"

---

## Fluxo de Criação

```text
1. Utilizador clica "Nova Meta"
   │
2. Modal abre com seletor de tipo
   │
   ├─ Seleciona "Pessoal"
   │  └─ Formulário normal (já existe)
   │
   └─ Seleciona "Organizacional"
      │
      ├─ Se Owner/Admin: Formulário disponível
      │  └─ Campo adicional: "Visível para todos os membros"
      │
      └─ Se Agent/Viewer: Mensagem informativa
         "Apenas administradores podem criar metas da organização"
```

---

## Benefícios

- **Alinhamento**: Equipa sabe os objetivos gerais
- **Transparência**: Todos veem o progresso da organização
- **Motivação**: Contribuição individual visível no todo
- **Flexibilidade**: Mantém metas pessoais privadas
- **Hierarquia**: Controlo sobre quem cria objetivos globais
