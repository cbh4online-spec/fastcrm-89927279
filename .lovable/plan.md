

# Plano: Adicionar Secao de Agendamentos nas Entidades CRM

## Resumo

Criar uma nova seccao "Agendamentos" nas paginas de detalhe de Contactos, Leads e Empresas, permitindo visualizar e criar reunioes/eventos diretamente a partir de cada entidade.

## Arquitetura da Solucao

```text
+----------------------------------+
|  EntityDetailWithSidebar         |
|  (Contact/Lead/Company)          |
+----------------------------------+
          |
          v
+----------------------------------+
|  EntitySidebarMenu               |
|  + Nova opcao "Agendamentos"     |
+----------------------------------+
          |
          v
+----------------------------------+
|  EntitySchedulingSection (NOVO)  |
|  - Lista reunioes da entidade    |
|  - Botao criar nova reuniao      |
|  - Reutiliza MeetingCreateModal  |
+----------------------------------+
```

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/scheduling/EntitySchedulingSection.tsx` | Componente que lista reunioes/eventos de uma entidade e permite criar novos |

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/types/entity.ts` | Adicionar 'scheduling' ao tipo MenuSection |
| `src/components/entity/EntitySidebarMenu.tsx` | Adicionar item "Agendamentos" ao menu lateral |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Adicionar case 'scheduling' no renderSectionContent |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Adicionar case 'scheduling' no renderSectionContent |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Adicionar case 'scheduling' no renderSectionContent |
| `src/hooks/useEntityCounts.ts` | Adicionar contagem de reunioes ao retorno (se existir) |

## Detalhes Tecnicos

### 1. Novo Componente EntitySchedulingSection

```typescript
interface EntitySchedulingSectionProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
  entityName: string;
  entityEmail?: string;
  entityPhone?: string;
}
```

**Funcionalidades:**
- Lista de reunioes filtradas por `contact_id`, `company_id` ou `lead_id`
- Botao "Agendar Reuniao" que abre o MeetingCreateModal
- Pre-preenche automaticamente o cliente/empresa no modal
- Mostra reunioes futuras e passadas com separadores
- Estados visuais por status (pendente, confirmado, concluido, etc.)

### 2. Atualizacao do MenuSection

Adicionar ao tipo:
```typescript
export type MenuSection = 
  | 'overview' 
  | ...
  | 'scheduling' // NOVO
  | 'student-journey';
```

### 3. Novo Item no Menu Lateral

```typescript
{
  id: 'scheduling',
  label: 'Agendamentos',
  icon: CalendarCheck,
  showFor: ['lead', 'contact', 'company']
}
```

### 4. Hook para Reunioes da Entidade

Criar ou adaptar hook `useEntityMeetings`:
```typescript
function useEntityMeetings(
  entityType: 'lead' | 'contact' | 'company',
  entityId: string
) {
  // Filtra meetings onde:
  // - contact_id = entityId (se entityType === 'contact')
  // - company_id = entityId (se entityType === 'company')
  // - lead_id = entityId (se entityType === 'lead')
}
```

## Fluxo de Usuario

1. Utilizador abre detalhe de um Contacto/Lead/Empresa
2. Clica em "Agendamentos" no menu lateral
3. Ve lista de reunioes associadas a esta entidade
4. Clica em "Agendar Reuniao"
5. Modal abre com entidade ja pre-selecionada
6. Cria a reuniao
7. Nova reuniao aparece na lista

## Integracao com Sistema Existente

- Reutiliza `MeetingCreateModal` existente
- Reutiliza `MeetingCard` para exibir reunioes
- Usa hook `useMeetings` com filtros por entidade
- Respeita permissoes e workspace atual

## Complexidade

Media - Envolve criar novo componente e modificar varios ficheiros, mas reutiliza componentes existentes.

