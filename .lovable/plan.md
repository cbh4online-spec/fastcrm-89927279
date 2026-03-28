

# Tipos de Captura — Tornar Completamente Funcional

## Problema

A tab "Tipos de Captura" no módulo Funis mostra apenas cards read-only dos 12 tipos existentes na BD. Não há:
- Criação de novos tipos
- Edição de tipos existentes
- Eliminação
- Associação de tipos de captura aos funis/instâncias
- Contagem de funis que usam cada tipo
- Ícones visuais corretos (o campo `icon` existe na BD mas não é renderizado dinamicamente)
- Indicação de utilização/popularidade

## Plano

### 1. CRUD Completo de Tipos de Captura

Adicionar ao `useFunnelInstances.ts`:
- `useCreateCaptureType` — mutation para inserir novo tipo
- `useUpdateCaptureType` — mutation para editar
- `useDeleteCaptureType` — mutation para eliminar

Criar `CaptureTypeFormDialog.tsx`:
- Dialog com campos: Label, Key (auto-gerado do label), Descrição, Ícone (selector de ícones Lucide)
- Modo criar e modo editar
- Validação de key único

### 2. Tab de Tipos de Captura Rica

Redesenhar a secção na `FunnelsList.tsx`:
- **Botão "+ Novo Tipo"** no header
- **Cards melhorados**: ícone Lucide dinâmico (mapeando o campo `icon` para componentes), label, descrição, key como badge
- **Contagem de uso**: quantos funis/instâncias usam cada tipo (query count de `funnel_instances.capture_type_id`)
- **Ações por card**: hover com botões editar e eliminar (com proteção se em uso)
- **Barra de pesquisa** para filtrar tipos

### 3. Integração nos Funis

No dialog de criação de funil (`createOpen`) e no `FunnelBuilder`:
- Adicionar campo **"Tipo de Captura"** como select/combobox
- Mostrar o tipo de captura atribuído nos cards de funis e instâncias
- Permitir alterar o tipo na edição

### 4. Ícones Dinâmicos

Criar helper `getCaptureTypeIcon(iconName: string)` que mapeia strings do campo `icon` (ex: `calendar`, `mail`, `phone`) para componentes Lucide correspondentes.

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/hooks/useFunnelInstances.ts` | Adicionar mutations create/update/delete para capture_types |
| `src/components/funnels/CaptureTypeFormDialog.tsx` | **Criar** — dialog de criação/edição |
| `src/components/funnels/FunnelsList.tsx` | Redesenhar tab "capture" com CRUD, ícones dinâmicos, contagem de uso |
| `src/components/funnels/FunnelsList.tsx` | Adicionar capture_type ao dialog de criação de funil |

