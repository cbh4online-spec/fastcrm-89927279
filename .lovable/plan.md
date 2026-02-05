
# Plano: Corrigir Associação de Contactos nas Oportunidades

## Problema Identificado

Os contactos não aparecem no dropdown de seleção porque o hook `useContacts` está a usar o **cliente Supabase errado**.

### Diagnóstico

| Hook | Cliente Usado | Estado |
|------|---------------|--------|
| `useLeads` | `workspaceClient` | Correto |
| `useContacts` | `supabase` (global) | **ERRADO** |
| `useCompanies` | `supabase` (global) | **ERRADO** |

A query está a devolver um array vazio `[]` porque o cliente global não tem o contexto de autenticação correto para a instância do workspace.

### Evidência (Network Log)

```text
GET /contacts?workspace_id=eq.a50159f3-4545-4eca-8436-a55a7cf6d673
Response: [] (vazio)

Workspace correto do utilizador: d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f
```

## Solução

Migrar os hooks `useContacts` e `useCompanies` para usar o `workspaceClient` do contexto `WorkspaceInstanceContext`, alinhando-os com o padrão já usado em `useLeads` e `useOpportunitiesEnhanced`.

## Alterações Necessárias

### 1. `src/hooks/useContacts.ts`

Substituir:

```typescript
import { supabase } from "@/integrations/supabase/client";
```

Por:

```typescript
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
// Remover: import { supabase } from "@/integrations/supabase/client";
```

Adicionar dentro do hook:

```typescript
const { workspaceClient } = useWorkspaceInstance();
```

Substituir todas as referências de `supabase` por `workspaceClient`.

### 2. `src/hooks/useCompanies.ts`

Mesma alteração - substituir `supabase` por `workspaceClient`.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useContacts.ts` | Migrar para `workspaceClient` |
| `src/hooks/useCompanies.ts` | Migrar para `workspaceClient` |

## Resultado Esperado

Após a correção:
- O dropdown de "Contacto" na página de oportunidades mostrará todos os contactos do workspace
- O dropdown de "Empresa" também funcionará correctamente
- A consistência entre hooks será mantida

## Nota Adicional - Comissões

O pedido original também mencionou que as oportunidades devem poder ser "consideradas como comissão do negócio". Esta funcionalidade já foi implementada numa alteração anterior com:
- Campos `commission_percentage`, `commission_amount`, `commission_notes` na tabela `opportunities`
- Componente `OpportunityCommissionSection` na página de detalhe

Confirma que estes campos estão a aparecer correctamente ou precisas de alguma funcionalidade adicional de comissões?
