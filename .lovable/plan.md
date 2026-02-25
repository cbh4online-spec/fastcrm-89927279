

# Passo 1 — Custom Objects como First-Class Entities

## Diagnóstico

Existe um problema fundamental: **duas tabelas paralelas** para o mesmo conceito.

- `CreateObjectWizard` escreve para `core_object_types` + `core_object_fields`
- A sidebar lê de `custom_objects` (via `useCustomObjects`)
- `AttioObjectListView` usa `useObjectRecords` que lê `object_records` (FK para `custom_objects.id`)
- `core_object_fields` tem `object_id` que referencia `custom_objects.id`

O wizard cria em `core_object_types` mas **nunca cria o registo em `custom_objects`**, logo os objetos criados pelo wizard não aparecem na sidebar nem têm list view funcional.

## Plano de Implementação

### 1. Corrigir CreateObjectWizard — dual write

Atualizar `CreateObjectWizard` para:
- Inserir em `core_object_types` (mantém)
- **Também inserir em `custom_objects`** com o `type_id` a apontar para o `core_object_types.id`
- Inserir campos em `core_object_fields` com `object_id` = `custom_objects.id` (em vez de `object_type_id`)
- Adicionar icon picker (grid de ícones lucide pré-definidos)
- Adicionar color picker (paleta pré-definida)
- Após criação, **navegar para `/objects/{slug}`** em vez de fechar o dialog
- Invalidar queries de `custom-objects` para que a sidebar atualize imediatamente

### 2. Criar Record Detail Page para Custom Objects

**Novo ficheiro: `src/pages/CustomObjectDetailPage.tsx`**

Layout duas colunas (60/40):
- **Esquerda**: Campos editáveis inline (usando `InlineFieldEditor` já criado), organizados por secção
- **Direita**: Painel de relacionamentos, metadados (criado em, atualizado em)
- Header: Ícone do objeto + nome do registo (campo "name" ou primeiro campo texto) + breadcrumb (Objects > Partnerships > Nome)
- Botões: Editar, Eliminar

**Atualizar: `src/pages/ObjectDetailPage.tsx`**
- Se o `type` não está no `OBJECT_REGISTRY`, procurar em `useCustomObjects` por slug
- Se encontrar, renderizar `CustomObjectDetailPage` com o `objectId` e `recordId`

### 3. Criar hooks de Relationships

**Novo ficheiro: `src/hooks/useObjectRelationships.ts`**

```text
useObjectRelationships(recordId, objectId)
  → SELECT * FROM object_relationships 
    WHERE (source_record_id = recordId) OR (target_record_id = recordId)
  → Joins com custom_objects para resolver nomes
  → Joins com object_records para resolver display name

useCreateRelationship()
  → INSERT com source_object_id, source_record_id, target_object_id, target_record_id, relationship_type

useDeleteRelationship()
  → DELETE por id
```

### 4. Criar RelationshipsPanel

**Novo ficheiro: `src/components/objects/RelationshipsPanel.tsx`**

- Mostra lista de registos relacionados agrupados por tipo de objeto
- Cada item: ícone + nome do registo + badge do tipo de relação + botão unlink
- Botão "Adicionar relação" → popover com:
  - Step 1: Selecionar tipo de objeto (dropdown de todos os custom objects)
  - Step 2: Pesquisar registos nesse tipo
  - Step 3: Tipo de relação (related_to, parent_of, child_of)

### 5. Integrar Saved Views na list view

**Atualizar: `src/components/objects/AttioObjectListView.tsx`**

- Adicionar `ObjectViewsManager` (já existe) como barra de views abaixo do header
- Quando uma view é selecionada, filtrar colunas visíveis e aplicar sort/filter config
- Botão "Criar view" inline

### 6. Melhorar sidebar — core objects + custom objects unificados

**Atualizar: `src/components/layout/SidebarV1.tsx`**

Atualmente core objects (Contacts, Companies, etc.) estão hardcoded no `NAV_V1_ITEMS` e custom objects aparecem numa secção "Records" separada. Para tornar custom objects first-class:

- Remover a secção "Records" separada
- Inserir custom objects **inline** na secção CRM, logo após os items core
- Mesma aparência visual, sem distinção

### 7. Soft delete em vez de hard delete

**Atualizar: `src/hooks/useCustomObjects.ts`**

- `useDeleteObjectRecord` → em vez de `DELETE`, fazer `UPDATE` com `is_active = false` (se coluna existir no `object_records`) ou manter delete mas adicionar confirmação
- `useDeleteCustomObject` → UPDATE `is_active = false` em vez de DELETE

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/objects/CreateObjectWizard.tsx` | **EDIT** — Dual write (core_object_types + custom_objects), icon/color picker, navegar após criação |
| `src/pages/CustomObjectDetailPage.tsx` | **NEW** — Detail page com inline editing + relationships |
| `src/pages/ObjectDetailPage.tsx` | **EDIT** — Fallback para custom objects |
| `src/hooks/useObjectRelationships.ts` | **NEW** — CRUD para object_relationships |
| `src/components/objects/RelationshipsPanel.tsx` | **NEW** — UI de relações no detail sidebar |
| `src/components/objects/AttioObjectListView.tsx` | **EDIT** — Integrar saved views |
| `src/components/layout/SidebarV1.tsx` | **EDIT** — Custom objects inline na nav |
| `src/hooks/useCustomObjects.ts` | **EDIT** — Soft delete |
| `src/App.tsx` | **EDIT** — Rota para detail de custom objects |

## Critérios de Done

Ao criar um objeto "Partnership":
1. Aparece automaticamente na sidebar (mesma secção que Contacts/Empresas)
2. Clicar leva a `/objects/partnership` com Attio-style list view
3. Pode criar registos com campos definidos
4. Pode criar/mudar views com colunas visíveis
5. Pode relacionar um registo com uma Company (via RelationshipsPanel)
6. Pode eliminar (soft delete) registos e o próprio objeto

