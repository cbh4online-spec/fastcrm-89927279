

# Plano: Tornar a Seccao de Agendamentos Visivel

## Problema Identificado

A seccao "Agendamentos" nao aparece no menu lateral porque **nao foi adicionada aos DEFAULT_SECTIONS** no hook `useWorkspaceLayoutConfig.ts`.

### Situacao Atual

O menu lateral usa a funcao `getVisibleSections()` para determinar quais seccoes mostrar. Esta funcao verifica primeiro se existe uma configuracao personalizada na tabela `workspace_layout_config`. Como nao existe configuracao personalizada, usa os `DEFAULT_SECTIONS`:

```typescript
// useWorkspaceLayoutConfig.ts - linhas 10-14
const DEFAULT_SECTIONS: Record<EntityType, MenuSection[]> = {
  lead: ['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'details', 'custom-fields', 'history'],
  contact: ['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'payments', 'orders', 'details', 'custom-fields', 'history'],
  company: ['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'payments', 'orders', 'details', 'custom-fields', 'history', 'contacts'],
};
```

**Problema:** A seccao `'scheduling'` nao esta presente em nenhum dos arrays acima.

## Solucao

Adicionar `'scheduling'` aos `DEFAULT_SECTIONS` para os tres tipos de entidade (lead, contact, company).

### Alteracao Necessaria

```typescript
const DEFAULT_SECTIONS: Record<EntityType, MenuSection[]> = {
  lead: ['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'scheduling', 'details', 'custom-fields', 'history'],
  contact: ['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'scheduling', 'payments', 'orders', 'details', 'custom-fields', 'history'],
  company: ['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'scheduling', 'payments', 'orders', 'details', 'custom-fields', 'history', 'contacts'],
};
```

## Ficheiro a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/hooks/useWorkspaceLayoutConfig.ts` | Adicionar 'scheduling' aos DEFAULT_SECTIONS para lead, contact e company |

## Resultado Esperado

Apos a correcao, o item "Agendamentos" aparecera no menu lateral de Leads, Contactos e Empresas na seccao "NEGOCIO", logo apos as "Propostas".

## Complexidade

Muito baixa - apenas adicionar uma string a tres arrays.

