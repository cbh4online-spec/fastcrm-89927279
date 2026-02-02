
# Plano: Terminar Desenvolvimento - Secção de Propostas

## Situação Actual

A secção **"Propostas"** mostra "Secção em desenvolvimento" porque:
- O menu lateral (`EntitySidebarMenu`) inclui "Propostas" correctamente
- O contador (`useEntityCounts`) já conta propostas para contactos/empresas
- Falta um componente `EntityProposalsSection` para mostrar as propostas

| Entidade | Secção Propostas | Estado |
|----------|------------------|--------|
| Leads | `ProposalsSection` | Funciona |
| Contactos | - | Em falta |
| Empresas | - | Em falta |

## Objectivo

Criar um componente genérico `EntityProposalsSection` que funcione para **contactos** e **empresas**, mostrando:
- Estatísticas de propostas (publicadas, aceites, valor)
- Lista de propostas associadas
- Acções (ver, editar, eliminar)
- Estado vazio quando não há propostas

## Arquitectura da Solução

### Estrutura Proposta

```text
src/components/proposals/
├── EntityProposalsSection.tsx   (CRIAR - componente genérico)
└── ... (ficheiros existentes)
```

### Como as Propostas se Relacionam com Entidades

A tabela `proposals` tem colunas `contact_id` e `company_id` que permitem filtrar propostas por entidade directamente, sem passar por oportunidades.

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/components/proposals/EntityProposalsSection.tsx` | **CRIAR** | Componente genérico para contactos e empresas |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | **MODIFICAR** | Adicionar case 'proposals' |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | **MODIFICAR** | Adicionar case 'proposals' |

## Implementação Detalhada

### 1. EntityProposalsSection.tsx

Componente reutilizável baseado na estrutura do `EntityOpportunitiesSection`:

```typescript
interface EntityProposalsSectionProps {
  entityType: "contact" | "company";
  entityId: string;
  entityName: string;
}
```

**Funcionalidades:**
- Query que filtra propostas por `contact_id` ou `company_id`
- Cards de estatísticas (Publicadas, Aceites, Valor Aceite)
- Lista de propostas com:
  - Título e status (badge colorido)
  - Oportunidade associada (se existir)
  - Preço e visualizações
  - Data de criação
- Estado vazio estilizado
- Dropdown de acções (Editar, Ver Pública, Eliminar)

**Layout visual:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ 📤 3         │ │ ✓ 2          │ │ € 15.000    │             │
│ │ Publicadas   │ │ Aceites      │ │ Valor Aceite │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                 │
│ Propostas                          5 propostas  [+ Nova Proposta]│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Proposta Website Redesign           [Publicada] ...        ││
│ │ 🎯 Website Development                                     ││
│ │ € 5.000  👁 12 views  📅 há 2 dias                         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Proposta Manutenção Anual           [Aceite] ...           ││
│ │ 🎯 Contrato Manutenção                                     ││
│ │ € 10.000  👁 8 views  📅 há 5 dias                         ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2. Modificar ENIContactDetailWithSidebar.tsx

Adicionar o case 'proposals' no `renderSectionContent()`:

```typescript
case 'proposals':
  return (
    <EntityProposalsSection
      entityType="contact"
      entityId={id!}
      entityName={contact.name}
    />
  );
```

### 3. Modificar CompanyDetailWithSidebar.tsx

Adicionar o case 'proposals' no `renderSectionContent()`:

```typescript
case 'proposals':
  return (
    <EntityProposalsSection
      entityType="company"
      entityId={id!}
      entityName={company.name}
    />
  );
```

## Lógica de Query

A query irá buscar propostas directamente pelo `contact_id` ou `company_id`:

```typescript
// Para contactos:
.from("proposals")
.select("...")
.eq("contact_id", entityId)

// Para empresas:
.from("proposals")
.select("...")
.eq("company_id", entityId)
```

## Status das Propostas

Configuração de cores/ícones (igual ao `ProposalsSection` dos leads):

| Status | Badge | Cor |
|--------|-------|-----|
| draft | Rascunho | Cinza |
| published | Publicada | Azul |
| accepted | Aceite | Verde |
| expired | Expirada | Âmbar |
| rejected | Rejeitada | Vermelho |

## Resultado Esperado

Após implementação:

1. **Contactos** - Clicar em "Propostas" mostra todas as propostas do contacto
2. **Empresas** - Clicar em "Propostas" mostra todas as propostas da empresa
3. **Navegação** - Clicar numa proposta abre o detalhe
4. **Consistência** - Interface idêntica para todas as entidades

## Complexidade

Baixa-Média - Criar 1 componente novo + modificar 2 ficheiros existentes. A lógica segue padrões já estabelecidos no projecto.
