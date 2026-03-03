

## Ferramenta de Gestão de Duplicados para Leads, Contactos e Empresas

### Estado Atual

- **Contactos**: Já têm `DuplicateManagementDialog` completo com deteção (email, telefone, nome similar) e merge funcional via `useContactDuplicateGroups` + `useContactMerge`.
- **Leads**: Sem ferramenta de gestão de duplicados.
- **Empresas**: Têm deteção preventiva na criação (`useCompanyDuplicates`) mas sem painel de gestão/merge.

### Plano

#### 1. Criar hook `useLeadDuplicateGroups`
- Ficheiro: `src/hooks/useLeadDuplicateGroups.ts`
- Mesmo padrão do `useContactDuplicateGroups`: agrupa leads por email igual, telefone igual e nome similar (≥85%)
- Consulta a tabela `leads` filtrada por workspace
- Conta relações (oportunidades, propostas, conversas)

#### 2. Criar hook `useLeadMerge`
- Ficheiro: `src/hooks/useLeadMerge.ts`
- Funde tags, notas, preenche campos vazios do primário com dados dos duplicados
- Migra referências (oportunidades, propostas, conversas, etc.)
- Elimina leads duplicados

#### 3. Criar hook `useCompanyDuplicateGroups`
- Ficheiro: `src/hooks/useCompanyDuplicateGroups.ts`
- Agrupa empresas por: domínio website igual, NIF igual, email domain igual, nome similar (≥80%)
- Conta relações (contactos, oportunidades, faturas, propostas)

#### 4. Criar hook `useCompanyMerge`
- Ficheiro: `src/hooks/useCompanyMerge.ts`
- Funde dados, migra contactos associados, oportunidades, faturas e propostas para a empresa principal
- Elimina empresas duplicadas

#### 5. Criar componente unificado `UnifiedDuplicateDialog`
- Ficheiro: `src/components/crm/UnifiedDuplicateDialog.tsx`
- Componente reutilizável que recebe `entityType: "contacts" | "leads" | "companies"` e renderiza o painel de duplicados com cards, seleção do registo principal via RadioGroup, botão de merge e diálogo de confirmação
- Reutiliza o design visual já existente no `DuplicateManagementDialog` dos contactos
- Adapta labels e ícones conforme o tipo de entidade

#### 6. Integrar na página de Leads (`SmartLeadsTable`)
- Adicionar botão "Gerir Duplicados" na toolbar
- Abrir o `UnifiedDuplicateDialog` com `entityType="leads"`

#### 7. Integrar na página de Empresas (`SmartCompaniesTable`)
- Adicionar botão "Gerir Duplicados" na toolbar/menu
- Abrir o `UnifiedDuplicateDialog` com `entityType="companies"`

#### 8. Atualizar o diálogo existente de Contactos
- Substituir `DuplicateManagementDialog` pelo `UnifiedDuplicateDialog` com `entityType="contacts"` para manter consistência

### Resultado
- Botão "Gerir Duplicados" disponível nas 3 entidades (Leads, Contactos, Empresas)
- Deteção automática por email, telefone, NIF, domínio e similaridade de nome
- Seleção do registo principal com visualização de relações
- Merge com migração de todas as referências e confirmação antes de eliminar

