
# Plano: Corrigir Reuniões - Sincronização e Linking com Clientes

## Problemas Identificados

### Problema 1: Reunião de hoje não aparece na lista

A reunião "Reunião Mafalda Jacinto" foi criada no sistema de **Agenda** (tabela `calendar_events`), mas o utilizador está a procurar na aba **Reuniões** (tabela `meetings`).

| Sistema | Tabela | Onde se cria | Estado actual |
|---------|--------|--------------|---------------|
| Agenda/Calendário | `calendar_events` | CalendarEventModal | ✅ Reunião existe aqui |
| Reuniões | `meetings` | MeetingCreateModal | ❌ Tabela vazia |

**Causa**: Os dois sistemas não estão sincronizados.

### Problema 2: Formulário não linka com cliente

Ambos os formulários (`CalendarEventModal` e `MeetingCreateModal`) não têm campos visíveis para selecionar o contacto ou empresa associada, apesar de:
- A interface (`CreateEventData`, `CreateMeetingData`) suportar `contact_id`, `company_id`
- As tabelas terem esses campos

## Solução Proposta

### Parte A: Adicionar Selector de Cliente ao Formulário de Eventos (Agenda)

Modificar `CalendarEventModal.tsx` para incluir um campo de pesquisa de contactos/empresas.

### Parte B: Adicionar Selector de Cliente ao Formulário de Reuniões

Modificar `MeetingCreateModal.tsx` para incluir campos de selecção de contacto/empresa.

### Parte C: Sincronização opcional entre sistemas

Quando um evento de calendário do tipo "reunião" é criado, pode-se opcionalmente criar também na tabela `meetings` para aparecer em ambos os locais.

## Implementação Técnica

### 1. Componente EntityPicker reutilizável

```typescript
// src/components/common/EntityPicker.tsx
// Componente para pesquisar e selecionar contactos, empresas ou leads
```

### 2. Actualização do CalendarEventModal

```text
Adicionar após o campo "Título":

┌─────────────────────────────────────┐
│ 🔍 Cliente/Contacto                 │
│ [Pesquisar contacto ou empresa...] ▼│
└─────────────────────────────────────┘

O selector:
- Pesquisa na tabela contacts e companies
- Mostra avatar/ícone, nome, email/empresa
- Ao seleccionar, preenche contact_id ou company_id
```

### 3. Actualização do MeetingCreateModal

Adicionar secção visível quando `category = 'client'` ou `category = 'hybrid'`:

```text
┌─────────────────────────────────────┐
│ 👤 Participante                     │
│ [Pesquisar contacto...           ] ▼│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🏢 Empresa (opcional)               │
│ [Pesquisar empresa...            ] ▼│
└─────────────────────────────────────┘
```

### 4. Hook para pesquisa de entidades

```typescript
// src/hooks/useEntitySearch.ts
export function useEntitySearch() {
  const searchEntities = async (query: string) => {
    const [contacts, companies] = await Promise.all([
      supabase.from('contacts').select('id, name, email, avatar_url')
        .ilike('name', `%${query}%`).limit(10),
      supabase.from('companies').select('id, name, logo_url')
        .ilike('name', `%${query}%`).limit(10),
    ]);
    
    return {
      contacts: contacts.data || [],
      companies: companies.data || [],
    };
  };
  
  return { searchEntities };
}
```

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/components/common/EntityPicker.tsx` | Criar | Componente de pesquisa de clientes |
| `src/hooks/useEntitySearch.ts` | Criar | Hook para pesquisa de contactos/empresas |
| `src/components/calendars/CalendarEventModal.tsx` | Modificar | Adicionar campo de cliente |
| `src/components/meetings/MeetingCreateModal.tsx` | Modificar | Adicionar campos de cliente/empresa |

## Fluxo UX Após Implementação

### Criar Evento com Cliente

```text
1. Utilizador abre "Novo Evento" na Agenda
2. Preenche título: "Reunião Mafalda Jacinto"
3. Clica em "Cliente/Contacto"
4. Pesquisa "Mafalda"
5. Selecciona o contacto da lista
6. Preenche data/hora
7. Guarda

→ Evento criado com contact_id preenchido
→ Aparece na agenda com badge do cliente
```

### Criar Reunião com Cliente

```text
1. Utilizador abre "Nova Reunião" na aba Reuniões
2. Selecciona categoria "Cliente"
3. Preenche título
4. No campo "Participante", pesquisa contacto
5. Opcionalmente adiciona empresa
6. Define data/hora/modo
7. Guarda

→ Reunião criada na tabela meetings
→ Aparece na lista de reuniões com cliente associado
```

## Benefícios

1. **Visualização clara** - Ver cliente associado na reunião/evento
2. **Contexto** - Acesso rápido ao perfil do cliente
3. **Timeline** - Reunião aparece no histórico do cliente
4. **Relatórios** - Métricas por cliente/empresa
5. **Consistência** - Mesmo padrão em ambos os sistemas

## Complexidade

Média - Requer:
- Novo componente de pesquisa
- Novo hook de pesquisa
- Modificação de 2 formulários existentes
- Sem alterações na base de dados (campos já existem)
