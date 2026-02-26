

# Estado Atual do Menu "Relações"

## O que já funciona
- O `RelationshipsPanel` existe e renderiza corretamente para Contactos e Empresas
- O hook `useObjectRelationships` consulta a tabela `object_relationships` e resolve nomes/ícones
- Listar, agrupar por tipo de objeto, e eliminar relações funciona
- Navegação para o registo relacionado funciona

## O que falta

### 1. Botão "Adicionar" não aparece para entidades core
O botão "Adicionar" só aparece quando `objectId` é passado. Nas chamadas para Contactos e Empresas, **não é passado `objectId`**:
```
<RelationshipsPanel recordId={id!} entityType="contact" />
```
É preciso resolver o `objectId` do core object type (contacto/empresa) e passá-lo, ou adaptar o formulário para funcionar com `entityType` directamente.

### 2. Formulário só lista objectos customizados
O `AddRelationshipForm` usa `useCustomObjects()` que só retorna objectos customizados. Não permite relacionar com Contactos, Empresas ou Deals (core objects). É necessário incluir os core objects na lista de alvos.

### 3. Sem contador badge na tab
A tab "Relações" não tem badge com contagem (ao contrário de Notas que acabámos de adicionar).

## Plano de Implementação

### Ficheiro 1: `ENIContactDetailWithSidebar.tsx`
- Passar `objectId` resolvido do core object type "contacts" para o `RelationshipsPanel`

### Ficheiro 2: `CompanyDetailWithSidebar.tsx`
- Idem para "companies"

### Ficheiro 3: `RelationshipsPanel.tsx` / `AddRelationshipForm`
- No select de "Tipo de Objeto", incluir core objects (Contactos, Empresas, Deals) além dos custom objects
- Ao seleccionar um core object, carregar registos da tabela correspondente (`contacts`, `companies`, `opportunities`) em vez de `object_records`

### Ficheiro 4: `useEntityCounts.ts`
- Adicionar contagem de relações (`relationships`) da tabela `object_relationships`

### Ficheiro 5: `EntityHorizontalTabs.tsx`
- Adicionar `relationships?: number` ao tipo `counts`

| Prioridade | Tarefa | Impacto |
|------------|--------|---------|
| Alta | Passar `objectId` nos detail pages | Desbloqueia botão "Adicionar" |
| Alta | Incluir core objects no formulário | Permite relacionar contactos entre si |
| Baixa | Badge com contagem na tab | Consistência visual |

