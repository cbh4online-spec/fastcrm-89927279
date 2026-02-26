

# Adicionar Ficheiros à Equipa de Leads e Empresas

## Problema
1. **Empresas** não têm case `'team'` no `renderSectionContent` — nem notas internas nem ficheiros
2. **Leads** têm `'team'` mas sem `showDocuments={true}` — só notas, sem ficheiros
3. A tabela `contact_documents` e o `DocumentsSection` são específicos de contactos (`contact_id`) — não suportam leads/empresas

## Solução

### 1. Nova tabela `entity_documents` (migração)
Criar tabela genérica para documentos de qualquer entidade:
- `id`, `entity_type` (lead/contact/company), `entity_id`, `workspace_id`
- `document_type`, `file_name`, `file_url`, `file_size`, `notes`
- `uploaded_by`, `created_at`
- RLS policies para workspace members
- Índice em `(entity_type, entity_id)`

### 2. Novo componente `EntityDocumentsSection.tsx`
Versão genérica do `DocumentsSection` que usa `entity_documents` em vez de `contact_documents`. Aceita `entityType` e `entityId` como props. Reutiliza o bucket `contact-documents` existente (ou cria um novo `entity-documents`).

### 3. Actualizar `EntityTeamSection.tsx`
- Substituir `DocumentsSection` por `EntityDocumentsSection`
- Passar `entityType` e `entityId` em vez de `contactId`
- Mostrar sempre ficheiros (remover prop `showDocuments`, activar por defeito)

### 4. Adicionar `'team'` à empresa (`CompanyDetailWithSidebar.tsx`)
- Importar `EntityTeamSection`
- Adicionar case `'team'` no `renderSectionContent` com `showDocuments={true}`

### 5. Activar ficheiros no lead (`LeadDetailWithSidebar.tsx`)
- Adicionar `showDocuments={true}` ao `EntityTeamSection` existente

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Nova tabela `entity_documents` + RLS + storage bucket |
| `src/components/entity/EntityDocumentsSection.tsx` | **Novo** — upload/lista/delete genérico |
| `src/components/entity/EntityTeamSection.tsx` | Usar `EntityDocumentsSection`, mostrar ficheiros sempre |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Adicionar case `'team'` + import |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Adicionar `showDocuments={true}` |

