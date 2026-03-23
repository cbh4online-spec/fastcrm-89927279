

## Funcionalidades Essenciais do Módulo Grupos & Telegram

### O que existe hoje
- Criar grupos (interno/telegram/híbrido) com propósito
- Chat básico com mensagens de texto
- Sincronização bidireccional CRM ↔ Telegram (polling)
- Configuração do bot e alertas da equipa
- Partilha de produto via edge function (sendProduct)

### O que falta para funcionar a sério

---

### Fase 1 — Gestão de Membros (crítico)

**Problema**: Não existe UI para adicionar/remover membros a um grupo.

- **Adicionar membros ao grupo**: Botão no painel lateral de membros para adicionar utilizadores do workspace, contactos do CRM, ou membros Telegram (por username/user_id)
- **Remover membros**: Opção por membro na lista
- **Auto-registar membros Telegram**: Quando o polling detecta uma mensagem de alguém novo num grupo ligado, criar automaticamente o `group_member` com `telegram_user_id` e `telegram_username`
- **Roles**: admin, member, readonly — com permissões no chat

---

### Fase 2 — Partilha de Produtos no Chat

**Problema**: O botão de partilhar produto não existe na UI do chat.

- **Selector de produtos inline**: Botão no composer do chat que abre um picker de produtos do catálogo
- **Card de produto renderizado**: Mensagens do tipo `product` mostram card visual com imagem, nome, preço e SKU
- **Envio para Telegram**: Já funciona no backend (sendProduct), falta ligar no frontend

---

### Fase 3 — Broadcast / Mensagens em Massa

**Problema**: Não há forma de enviar uma mensagem para múltiplos grupos ou contactos.

- **Painel de broadcast**: Seleccionar grupos por propósito (ex: todos os de "vendas"), escrever mensagem ou seleccionar produto, enviar para todos
- **Agendamento**: Opção de enviar agora ou agendar via pg_cron
- **Histórico de broadcasts**: Tabela `group_broadcasts` com registo de envios

---

### Fase 4 — Notificações Automáticas (Triggers)

**Problema**: Os toggles de alertas (leads, deals, propostas) na página Telegram estão configurados mas não disparam.

- **Trigger SQL** na tabela `leads` (AFTER INSERT): se `notify_new_leads = true` na `telegram_config`, chamar `telegram-send` com action `sendAlert`
- **Trigger SQL** na tabela `opportunities` (AFTER INSERT/UPDATE): notificar deals
- **Trigger SQL** na tabela `proposals` (AFTER INSERT): notificar propostas
- Usar `pg_net` para chamar a edge function directamente dos triggers

---

### Fase 5 — Obter Chat ID Automaticamente

**Problema**: O utilizador tem de copiar manualmente o Chat ID do Telegram.

- **Listar chats recentes**: Usar as mensagens recebidas pelo polling para mostrar os grupos Telegram onde o bot está presente
- **Picker de grupos Telegram**: No formulário de criar grupo, mostrar dropdown com os chats activos do bot em vez de pedir o ID manualmente

---

### Detalhes técnicos

**Novas tabelas (migration)**:
- `group_broadcasts` — {id, workspace_id, message, product_id, target_groups[], sent_count, status, scheduled_at, sent_at, created_by}

**Alterações em edge functions**:
- `telegram-poll`: Auto-criar `group_member` quando detecta novo utilizador
- `telegram-send`: Novo action `broadcast` que envia para múltiplos chat_ids

**Triggers SQL (via pg_net)**:
- `trg_notify_telegram_new_lead` ON leads AFTER INSERT
- `trg_notify_telegram_new_deal` ON opportunities AFTER INSERT  
- `trg_notify_telegram_proposal` ON proposals AFTER INSERT

**Novos componentes UI**:
- `AddMemberDialog` — picker de utilizadores/contactos para adicionar ao grupo
- `ProductPickerDialog` — selector de produtos do catálogo para partilhar no chat
- `ProductMessageCard` — card visual para mensagens do tipo "product"
- `BroadcastPanel` — painel de envio em massa
- `TelegramChatPicker` — dropdown de chats activos do bot

