

# Adicionar Ficheiros e Aba de Equipa na Ficha do Contacto

## Situação Actual

- **Ficheiros/Documentos**: O `DocumentsSection` já existe e funciona, mas está escondido dentro da sub-tab "Campos" do separador "Dados" — local pouco intuitivo.
- **Equipa**: Não existe nenhuma secção para comunicação interna entre membros do workspace sobre um contacto. A tabela `entity_notes` já suporta `note_type` e `attachments`, e `useWorkspaceMembers` já existe.

## Alterações

### 1. Novo separador "Equipa" nos tabs horizontais

Adicionar `'team'` como novo `MenuSection` em `src/types/entity.ts` e como tab em `EntityHorizontalTabs.tsx` (visível para contact, lead, company). Posicionar entre "Atividade" e "Negócios".

### 2. Componente `EntityTeamSection` (novo)

Secção com duas sub-tabs internas:
- **Notas internas**: Comentários da equipa sobre este contacto (usa `entity_notes` com `note_type = 'team'`), mostrando autor (avatar + nome via `profiles`), data relativa, e conteúdo. Com input para adicionar nova nota.
- **Ficheiros**: Move o `DocumentsSection` existente para aqui, tornando-o acessível de forma natural.

### 3. Tabela de base de dados

Não é necessária nova tabela — reutiliza `entity_notes` com `note_type = 'team'` para notas internas. Os ficheiros já usam `contact_documents`.

### 4. Ajustar tab "Dados"

Remover `DocumentsSection` da sub-tab "Campos" (que passa a mostrar apenas campos customizados/perfil profissional) e realocar para a nova aba "Equipa".

## Ficheiros a alterar

| Ficheiro | Acção |
|----------|-------|
| `src/types/entity.ts` | Adicionar `'team'` ao `MenuSection` |
| `src/components/entity/EntityHorizontalTabs.tsx` | Adicionar tab "Equipa" |
| `src/components/entity/EntityTeamSection.tsx` | **Novo** — notas internas + ficheiros |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Adicionar case `'team'`, remover DocumentsSection do case `'data'` |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Adicionar case `'team'` |
| `src/hooks/useWorkspaceLayoutConfig.ts` | Adicionar `'team'` aos defaults |
| `src/components/entity/EntityEmptyState.tsx` | Adicionar mensagem para `'team'` |
| `src/components/settings/WorkspaceLayoutConfigPanel.tsx` | Adicionar `'team'` às opções configuráveis |

