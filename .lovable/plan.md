

# Plano: Histórico de Mensagens nas Entidades (Leads, Contactos, Empresas)

## Problema
A sub-tab "Mensagens" dentro de Comunicação mostra apenas a UI de composição (enviar mensagens, templates, sugestões AI). **Não mostra o histórico de mensagens trocadas** com a entidade. O utilizador precisa ir ao Inbox para ver as conversas.

## Solução
Adicionar uma secção de **histórico de mensagens** na `ContactMessagesSection` que mostra todas as conversas e mensagens associadas à entidade, diretamente na página de detalhe.

## Implementação

### 1. Criar hook `useEntityMessages`
**Novo ficheiro: `src/hooks/useEntityMessages.ts`**

- Recebe `entityType` ('lead' | 'contact' | 'company') e `entityId`
- Consulta `conversations` filtrando por `lead_id`, `contact_id` ou `company_id`
- Para cada conversa, carrega as últimas mensagens da tabela `messages`
- Retorna conversas com mensagens agrupadas, incluindo canal, direção e timestamps

### 2. Criar componente `EntityMessageHistory`
**Novo ficheiro: `src/components/messages/EntityMessageHistory.tsx`**

- Lista todas as conversas da entidade, agrupadas por canal (WhatsApp, Instagram, Email, SMS)
- Cada conversa é expansível (collapsible) mostrando as mensagens trocadas
- Reutiliza o estilo do `MessageBubble` existente (bolhas inbound/outbound)
- Inclui botão "Ver no Inbox" para abrir a conversa completa
- Mostra data relativa e badges de canal
- Estado vazio com mensagem "Nenhuma mensagem trocada"

### 3. Integrar na `ContactMessagesSection`
**Ficheiro: `src/components/messages/ContactMessagesSection.tsx`**

- Adicionar o `EntityMessageHistory` **acima** da área de composição
- Layout: Histórico de mensagens em cima, Centro de Mensagens (composição) em baixo
- Substituir o `LinkedConversationsCard` da sidebar pela timeline completa no conteúdo principal

### Estrutura visual

```text
┌─────────────────────────────────────┐
│  📨 Mensagens Trocadas              │
│  ┌─────────────────────────────────┐│
│  │ 🟢 WhatsApp · há 2h            ││
│  │  ← "Olá, gostaria de saber..." ││
│  │  → "Boa tarde! Claro, envio.." ││
│  │  ← "Perfeito, obrigada"        ││
│  │  [Ver no Inbox]                 ││
│  ├─────────────────────────────────┤│
│  │ 📸 Instagram · há 1d           ││
│  │  ← "Vi o vosso produto..."     ││
│  │  → "Obrigado pelo interesse!"  ││
│  │  [Ver no Inbox]                 ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Centro de Mensagens (composição)   │
│  [Compor] [Templates] [Sugestões AI]│
└─────────────────────────────────────┘
```

### Detalhes técnicos
- Query: `conversations` → filtra por entity ID → para cada conversa, `messages` ordenadas por `sent_at` DESC, limit 20 por conversa
- Sem novas tabelas — usa `conversations` e `messages` existentes
- Sem novas edge functions
- Realtime: reutiliza o channel pattern existente para auto-refresh

