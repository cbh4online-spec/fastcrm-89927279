
# Adicionar Criacao de Eventos na Comunidade

## Problema

O tab "Eventos" no FastClub mostra eventos existentes mas nao tem nenhum botao ou formulario para criar novos eventos. O hook `useCreateCommunityEvent` ja existe mas nunca e usado na UI.

## Solucao

Criar um dialog de criacao de eventos e adicionar um botao "+ Evento" no tab de Eventos (visivel para admins).

### O que vai ser feito

1. **Botao "+ Criar Evento"** no tab de Eventos, visivel apenas para admins (owner/admin)
2. **Dialog com formulario** contendo os campos:
   - Titulo (obrigatorio)
   - Descricao (opcional)
   - Tipo de evento: "evento" ou "live" (select)
   - Data/hora de inicio (obrigatorio)
   - Data/hora de fim (opcional)
   - Link externo (opcional, ex: link do Zoom/Meet)
3. **Validacao** com feedback visual
4. Ao submeter, usar o hook `useCreateCommunityEvent` que ja existe

## Detalhes Tecnicos

### Ficheiro a Modificar

| Ficheiro | Descricao |
|---|---|
| `src/pages/community/FastClubPage.tsx` | Adicionar dialog de criacao e botao no componente `EventsList`, passando `isAdmin` como prop |

### Implementacao

- Adicionar estado `createEventOpen` ao componente `EventsList`
- Criar o formulario inline no dialog usando componentes existentes (`Dialog`, `Input`, `Textarea`, `Select`, `Button`)
- Chamar `useCreateCommunityEvent(workspaceId)` para submeter
- Campos do formulario mapeiam directamente para a tabela `community_events`: `title`, `description`, `event_type`, `starts_at`, `ends_at`, `link`
- Passar `isAdmin` de `FastClubPage` para `EventsList` para controlar visibilidade do botao

### Nao sao necessarias alteracoes na base de dados
A tabela `community_events` e o hook `useCreateCommunityEvent` ja existem e suportam todos os campos necessarios.
