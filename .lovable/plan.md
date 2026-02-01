
# Plano: Validação de Duplicados e Gestão de Merge

## Resumo

Este plano implementa duas funcionalidades principais:
1. **Validação preventiva** - Bloqueia a criação de contactos com email já existente
2. **Ferramenta de gestão de duplicados** - Interface para visualizar, comparar e fazer merge de contactos

---

## Parte 1: Validação na Criação de Contactos

### Comportamento Actual
O sistema já detecta duplicados e mostra um aviso, mas permite ao utilizador "Criar mesmo assim".

### Novo Comportamento
- **Email exacto**: Bloqueia criação (email deve ser único)
- **Telefone similar**: Aviso com opção de usar existente
- **Nome similar**: Aviso com opção de usar existente

### Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/contacts/CreateContactDialog.tsx` | Bloquear submit quando existe email duplicado |
| `src/hooks/useContactDuplicates.ts` | Adicionar flag `isExactEmailMatch` para diferenciar |

### Lógica de Validação

```text
SE email igual a contacto existente:
  → Bloquear criação
  → Mostrar mensagem: "Este email já está associado ao contacto X"
  → Opção: "Ver contacto existente"

SE telefone ou nome similar:
  → Mostrar aviso (actual)
  → Permitir "Criar mesmo assim"
```

---

## Parte 2: Ferramenta de Gestão de Duplicados

### Nova Página/Tab

Adicionar uma nova tab "Duplicados" na página de Contactos que permite:
- Ver grupos de contactos potencialmente duplicados
- Comparar campos lado a lado
- Seleccionar qual manter como principal
- Fazer merge com migração de dados relacionados

### Componentes Novos

| Componente | Descrição |
|------------|-----------|
| `DuplicateManagementDialog.tsx` | Dialog principal de gestão |
| `DuplicateContactCard.tsx` | Card de comparação de cada contacto |
| `MergePreviewPanel.tsx` | Pré-visualização do resultado do merge |

### Hook Novo

| Hook | Descrição |
|------|-----------|
| `useContactDuplicateGroups.ts` | Busca todos os grupos de duplicados no workspace |
| Adicionar `mergeContacts` ao `useContacts.ts` | Função de merge que migra referências |

### Estrutura da UI

```text
┌──────────────────────────────────────────────────────────────┐
│ Gestão de Duplicados                              [Analisar] │
├──────────────────────────────────────────────────────────────┤
│ Encontrados 5 grupos de possíveis duplicados                 │
│                                                              │
│ ┌─ Grupo 1: João Silva ───────────────────────────────────┐  │
│ │                                                         │  │
│ │  ◉ João Silva              ○ João P. Silva             │  │
│ │  joao@empresa.pt           joao.silva@empresa.pt       │  │
│ │  +351 912 345 678          912345678                   │  │
│ │  Empresa XYZ               Empresa XYZ                 │  │
│ │  Criado: 2024-01-15        Criado: 2024-03-20          │  │
│ │  ✓ 3 oportunidades         ✓ 1 factura                 │  │
│ │                                                         │  │
│ │  [Manter esquerdo] [Manter direito] [Comparar] [Ignorar]│  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌─ Grupo 2: Maria Santos ─────────────────────────────────┐  │
│ │  ...                                                    │  │
│ └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Lógica de Merge

O merge precisa considerar as seguintes tabelas que referenciam `contact_id`:
- `sj_profiles` - Perfis de alunos
- `opportunities` - Oportunidades
- `proposals` - Propostas
- `invoices` - Facturas
- `meetings` - Reuniões
- `calendar_events` - Eventos
- `conversations` - Conversas
- `contact_documents` - Documentos
- `contact_linkedin_data` - Dados LinkedIn
- `subscriptions` - Subscrições

**Processo de Merge:**
1. Seleccionar contacto principal (destino)
2. Migrar todas as referências do duplicado para o principal
3. Fazer merge de tags (união)
4. Fazer merge de notas (concatenar)
5. Manter dados mais completos de cada campo
6. Eliminar contacto duplicado

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/components/contacts/DuplicateManagementDialog.tsx` | Dialog de gestão de duplicados |
| `src/hooks/useContactDuplicateGroups.ts` | Hook para buscar grupos de duplicados |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/contacts/CreateContactDialog.tsx` | Bloquear submit em duplicado de email exacto |
| `src/components/contacts/SmartContactsTable.tsx` | Adicionar botão "Gerir Duplicados" no toolbar |
| `src/hooks/useContacts.ts` | Adicionar função `mergeContacts` |
| `src/hooks/useContactDuplicates.ts` | Adicionar flag para tipo de match |

---

## Fluxo de Merge Detalhado

```text
1. Utilizador abre "Gerir Duplicados"
2. Sistema analisa todos os contactos:
   - Agrupa por email exacto
   - Agrupa por telefone (últimos 9 dígitos)
   - Agrupa por nome similar (>85%)
3. Para cada grupo:
   - Mostra comparação lado a lado
   - Indica quantas referências cada contacto tem
   - Sugere qual manter (o mais antigo com mais dados)
4. Utilizador selecciona acção:
   - "Manter X" → Migra tudo para X, elimina outros
   - "Ignorar" → Marca como não-duplicado
5. Confirmação antes de executar
6. Feedback de sucesso com resumo
```

---

## Validações de Segurança

- Confirmar antes de qualquer merge (AlertDialog)
- Log de todas as operações de merge
- Não permitir merge se contactos de workspaces diferentes
- Validar permissões do utilizador
