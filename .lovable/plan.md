

# Adicionar agendamento de reunião e seleção de calendário no compositor de email

## Contexto
O compositor de email (`ComposeEmailDialog`) atualmente não permite agendar reuniões nem escolher um calendário. O sistema já tem infraestrutura de calendários (`useCalendars`) e um modal de criação de eventos (`CalendarEventModal`) que podem ser reutilizados.

## Alterações

### 1. Adicionar seletor de calendário ao compositor de email
- Importar `useCalendars` no `ComposeEmailDialog`
- Adicionar um `Select` dropdown na zona do remetente/toolbar para escolher o calendário associado ao email
- Guardar `selectedCalendarId` no state do compositor
- O calendário escolhido será usado para criar eventos/reuniões associados

### 2. Adicionar botão "Agendar Reunião" na toolbar do compositor
- Novo botão com ícone `CalendarPlus` na toolbar (junto aos outros botões: templates, anexos, pagamento)
- Ao clicar, abre um painel inline (semelhante ao schedule picker existente) com:
  - Data e hora da reunião
  - Duração (30min, 1h, 1h30, 2h — com default do calendário)
  - Localização / URL de videoconferência (opcional)
  - Título da reunião (pré-preenchido com assunto do email)
- Ao enviar o email, cria automaticamente um evento no calendário selecionado via `useCalendarEvents.createEvent`
- O email inclui automaticamente os detalhes da reunião no corpo (data, hora, local/link)

### 3. Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/components/email/ComposeEmailDialog.tsx` | Adicionar seletor de calendário, botão e painel de agendamento de reunião, lógica de criação de evento ao enviar |

### 4. Fluxo do utilizador
1. Abre compositor de email
2. Seleciona calendário no dropdown (se tiver mais que um)
3. Clica em "Agendar Reunião" na toolbar
4. Preenche data/hora/duração
5. Ao enviar o email, o evento é criado no calendário escolhido com o destinatário como participante
6. O corpo do email inclui bloco com detalhes da reunião

