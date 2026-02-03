
# Plano: Corrigir Edição de Reuniões (Criava Nova em Vez de Atualizar)

## Problema Identificado

Quando o utilizador tenta editar uma reunião existente, o sistema cria uma nova reunião em vez de atualizar a existente.

### Causa Raiz

No ficheiro `MeetingsDashboard.tsx`:

1. A funcao `updateMeeting` do hook `useMeetings` **nao esta a ser importada** na desestruturacao (linha 125-136)
2. A funcao `handleCreateMeeting` **sempre chama `createMeeting`**, mesmo quando existe um `selectedMeeting` indicando que e uma edicao

```text
Estado Atual:
+-------------------+     +------------------+     +------------------+
| Clique em Editar  | --> | selectedMeeting  | --> | handleCreateMeeting |
|                   |     | definido         |     | chama createMeeting |
+-------------------+     +------------------+     +------------------+
                                                            |
                                                            v
                                                  CRIA NOVA REUNIAO (ERRO!)
```

```text
Estado Correto:
+-------------------+     +------------------+     +--------------------+
| Clique em Editar  | --> | selectedMeeting  | --> | handleSubmitMeeting |
|                   |     | definido         |     | verifica se existe  |
+-------------------+     +------------------+     +--------------------+
                                                            |
                                           +----------------+----------------+
                                           |                                 |
                                           v                                 v
                                  selectedMeeting?               selectedMeeting null?
                                  updateMeeting(id)              createMeeting()
```

## Solucao

### 1. Importar `updateMeeting` do hook

Adicionar `updateMeeting` a desestruturacao do hook `useMeetings`.

### 2. Atualizar a logica de submit

Renomear e modificar a funcao para verificar se e uma criacao ou edicao:

```typescript
const handleSubmitMeeting = async (data: CreateMeetingData) => {
  if (selectedMeeting) {
    // E uma edicao - usar updateMeeting
    await updateMeeting(selectedMeeting.id, data);
  } else {
    // E uma criacao - usar createMeeting
    await createMeeting(data);
  }
  setSelectedMeeting(null);
  setShowCreateModal(false);
};
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/meetings/MeetingsDashboard.tsx` | Importar `updateMeeting` e modificar `handleCreateMeeting` para distinguir entre criar e editar |

## Complexidade

Baixa - Apenas alteracoes de logica no frontend.

## Resultado Esperado

Apos a correcao:
1. Ao clicar numa reuniao existente e guardar, os dados serao **atualizados**
2. Ao clicar em "Nova Reuniao", sera **criada** uma nova reuniao
3. O modal mostrara o titulo correto ("Editar Reuniao" vs "Nova Reuniao") - ja funciona
4. O historico CRM registara corretamente as atualizacoes
