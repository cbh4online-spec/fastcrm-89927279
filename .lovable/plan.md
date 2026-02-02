

# Plano: Criar Interface de Modelos de Propostas

## Contexto Actual

A página de Propostas (`ProposalsList.tsx`) já tem uma tab "Modelos" definida (linha 93), mas não há conteúdo implementado para esta tab. O sistema de templates já existe na base de dados (`proposal_templates`) e há hooks funcionais (`useProposalTemplates`, `useCreateProposalTemplate`, `useUpdateProposalTemplate`, `useDeleteProposalTemplate`).

| Componente | Estado |
|------------|--------|
| Tabela `proposal_templates` | Existe |
| Hooks CRUD para templates | Existem |
| Interface de gestão de templates | **Não existe** |
| Uso de templates na criação | Funciona (mas sem templates criados) |

## Objectivo

Criar uma interface completa para gerir Modelos de Propostas, permitindo:
1. Listar modelos existentes
2. Criar novos modelos
3. Editar modelos
4. Duplicar modelos
5. Eliminar modelos
6. Pré-visualizar modelos

## Arquitectura da Solução

### Estrutura de Ficheiros

```text
src/components/proposals/
├── ProposalsList.tsx              (MODIFICAR - adicionar conteúdo para tab "templates")
├── ProposalTemplatesList.tsx      (CRIAR - lista de modelos)
├── ProposalTemplateFormDialog.tsx (CRIAR - criar/editar modelo)
└── ProposalTemplateCard.tsx       (CRIAR - card do modelo)
```

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/components/proposals/ProposalTemplateCard.tsx` | **CRIAR** | Card individual de template com preview e acções |
| `src/components/proposals/ProposalTemplateFormDialog.tsx` | **CRIAR** | Dialog para criar/editar templates |
| `src/components/proposals/ProposalTemplatesList.tsx` | **CRIAR** | Lista de templates com grid e filtros |
| `src/components/proposals/ProposalsList.tsx` | **MODIFICAR** | Renderizar conteúdo baseado na tab activa |

## Implementação Detalhada

### 1. ProposalTemplateCard.tsx

Componente card para exibir cada template:

```text
┌──────────────────────────────────────────┐
│  📄 [Nome do Modelo]                 ⋮   │
│                                          │
│  Descrição do modelo (2 linhas max)      │
│                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │  text  │ │ offer  │ │  cta   │       │
│  └────────┘ └────────┘ └────────┘       │
│                                          │
│  Criado em 20 Jan 2026                   │
│                                          │
│  [Usar Modelo]           [●] Activo      │
└──────────────────────────────────────────┘
```

Funcionalidades:
- Mostrar nome e descrição
- Badges dos tipos de blocos (text, offer, cta, etc.)
- Data de criação
- Toggle de activo/inactivo
- Menu de acções (Editar, Duplicar, Eliminar)

### 2. ProposalTemplateFormDialog.tsx

Dialog modal para criar/editar templates com:

**Tab 1 - Informação Base:**
- Nome do template
- Descrição
- CTA Text e Cor

**Tab 2 - Blocos de Conteúdo:**
- Reutilizar `ProposalContentBlocks` existente
- Adicionar/remover/reordenar blocos

**Tab 3 - Pré-visualização:**
- Reutilizar `ProposalPreview` existente

### 3. ProposalTemplatesList.tsx

Lista completa com:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Modelos de Propostas                             [+ Novo Modelo] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Estatísticas                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │ Total: 5 │ │ Activos:4│ │ Usados: 3│                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
│                                                                  │
│  🔍 Pesquisar modelos...                        Ordenar: Recentes│
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │    Template 1   │ │    Template 2   │ │    Template 3   │    │
│  │                 │ │                 │ │                 │    │
│  │                 │ │                 │ │                 │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Funcionalidades:
- Grid de cards (3 colunas desktop, 1 mobile)
- Barra de pesquisa
- Ordenação (recentes, mais usados, A-Z)
- Estado vazio com CTA

### 4. Modificar ProposalsList.tsx

Adicionar renderização condicional baseada no `activeTab`:

```typescript
{activeTab === "proposals" && (
  // Conteúdo actual da lista de propostas
)}

{activeTab === "templates" && (
  <ProposalTemplatesList />
)}

{activeTab === "analytics" && (
  // Futuro: dashboard de analytics
  <div className="p-12 text-center text-muted-foreground">
    Em breve: Análise de performance de propostas
  </div>
)}
```

## Fluxo de Utilização

```text
┌─────────────────────────────────────────────────────────────────┐
│                     GESTÃO DE MODELOS                           │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Criar Modelo  │ │ Editar Modelo │ │ Usar em Nova  │
    │               │ │               │ │   Proposta    │
    └───────────────┘ └───────────────┘ └───────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │  Form Dialog  │ │  Form Dialog  │ │CreateProposal │
    │ - Nome        │ │ - Carregar    │ │ - Select tpl  │
    │ - Blocos      │ │   dados       │ │ - Aplicar     │
    │ - CTA         │ │ - Guardar     │ │   blocos      │
    └───────────────┘ └───────────────┘ └───────────────┘
```

## Tipos de Blocos Suportados

Os templates usam o mesmo sistema de `ContentBlock` das propostas:

| Tipo | Descrição | Conteúdo |
|------|-----------|----------|
| `text` | Texto livre | título, corpo |
| `offer` | Oferta/Preço | título, descrição, features, preço |
| `testimonials` | Testemunhos | lista de citações |
| `faq` | Perguntas Frequentes | lista Q&A |
| `divider` | Separador visual | - |
| `cta` | Call to Action | texto, estilo |
| `image` | Imagem | url, alt |

## Resultado Esperado

Após implementação:

1. **Tab "Modelos"** - Interface completa de gestão
2. **Criação rápida** - Templates pré-configurados para usar em novas propostas
3. **Reutilização** - Menos tempo a criar propostas repetitivas
4. **Consistência** - Propostas seguem padrões da empresa

## Complexidade

Média-Alta - Requer 3 novos componentes + modificação de 1 existente. Utiliza hooks e tipos já existentes.

