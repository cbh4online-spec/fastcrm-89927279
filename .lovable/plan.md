

# Plano: Completar Funcionalidade "Nova Mensagem" para Todos os Canais

## Resumo

O botão "Nova Mensagem" actualmente só suporta o envio de emails. Vamos expandir para permitir o envio de mensagens através de todos os canais configurados: WhatsApp, Instagram DM, SMS, Facebook Messenger.

## Arquitectura Actual

```text
ComposeButton.tsx
  └─ DropdownMenu (Escolher Canal)
       ├─ Email ✅ (QuickComposeDialog implementado)
       ├─ WhatsApp - "Em breve"
       ├─ Instagram DM - "Em breve"  
       ├─ Facebook Messenger - "Em breve"
       ├─ SMS - "Em breve"
       └─ Website Chat - "Em breve"
```

## Integrações Disponíveis

| Canal | Conexão | Edge Function | Estado |
|-------|---------|---------------|--------|
| Email | `email_connections` | `email-send` | Implementado |
| Instagram | `instagram_connections` | `instagram-send-message` | Backend pronto |
| WhatsApp/SMS | `workspace_ghl_config` (GHL) | `ghl-send-message` | Backend pronto |
| Facebook | `workspace_ghl_config` (GHL) | `ghl-send-message` | Backend pronto |

## Alterações Propostas

### 1. Criar Componentes de Composição por Canal

**Ficheiro**: `src/components/inbox/ComposeButton.tsx`

Adicionar novos diálogos de composição:

- **`QuickInstagramDialog`**: Para enviar DMs via Instagram API
- **`QuickGHLDialog`**: Para WhatsApp/SMS/Facebook via GHL

### 2. Verificar Conexões Activas

Antes de permitir o envio, verificar:
- Instagram: `instagram_connections` com `is_active = true`
- WhatsApp/SMS/Facebook: `workspace_ghl_config` com `is_active = true`

### 3. Fluxo de Envio por Canal

#### Instagram DM
```text
1. Utilizador selecciona "Instagram DM"
2. Sistema verifica se há conexão Instagram activa
3. Se não houver → Mostra mensagem para configurar em Definições
4. Se houver:
   a. Pedir username do destinatário
   b. Procurar/criar Lead com esse Instagram
   c. Criar conversa se não existir
   d. Invocar instagram-send-message
```

#### WhatsApp/SMS (via GHL)
```text
1. Utilizador selecciona "WhatsApp" ou "SMS"
2. Sistema verifica se GHL está configurado
3. Se não estiver → Mostra mensagem para configurar
4. Se estiver:
   a. Pedir número de telefone do destinatário
   b. Procurar/criar Lead com esse telefone
   c. Criar conversa se não existir
   d. Invocar ghl-send-message com canal adequado
```

### 4. Estrutura do Código

```text
src/components/inbox/ComposeButton.tsx (Expandido)
  ├─ QuickComposeDialog (Email) ✅ Existente
  ├─ QuickInstagramDialog (Novo)
  ├─ QuickGHLChannelDialog (Novo - para WhatsApp/SMS/Facebook)
  └─ Lógica de verificação de conexões
```

### 5. Interface do Utilizador

#### Dropdown Actualizado
- Mostrar ícone de check verde se canal configurado
- Mostrar aviso se canal não configurado
- Ao clicar em canal não configurado → Redireciona para Definições

#### Diálogo WhatsApp
- Campo: Número de telefone (com validação internacional)
- Campo: Nome do contacto (opcional)
- Campo: Mensagem
- Botão: Enviar

#### Diálogo Instagram
- Campo: Username do Instagram
- Campo: Nome do contacto (opcional)
- Campo: Mensagem
- Botão: Enviar

## Detalhes Técnicos

### Ficheiros a Criar
1. `src/components/inbox/QuickInstagramDialog.tsx` - Diálogo para Instagram DM
2. `src/components/inbox/QuickGHLChannelDialog.tsx` - Diálogo para WhatsApp/SMS/Facebook

### Ficheiros a Modificar
1. `src/components/inbox/ComposeButton.tsx` - Integrar novos diálogos e verificações

### Hooks a Utilizar
- `useInstagramConnection()` - Verificar conexão Instagram
- `useWorkspaceGHLConfig()` - Verificar configuração GHL
- `useEmailConnections()` - Já utilizado para Email

### Edge Functions Existentes
- `instagram-send-message` - Pronto para uso
- `ghl-send-message` - Pronto para uso (suporta SMS, WhatsApp, Facebook)

## Fluxo de Criação de Conversa

Para novas conversas, o sistema deve:
1. Verificar se já existe Lead/Contact com esse identificador
2. Se não existir, criar novo Lead
3. Verificar se já existe conversa para esse canal + Lead
4. Se não existir, criar nova conversa
5. Enviar mensagem via edge function

## Implementação Faseada

**Fase 1**: WhatsApp e SMS via GHL (mais impacto, backend pronto)
**Fase 2**: Instagram DM (API mais complexa)
**Fase 3**: Website Chat (requer widget adicional)

## Considerações

- O Facebook Messenger também usa GHL, mesma lógica do WhatsApp
- SMS e WhatsApp partilham o mesmo diálogo (apenas muda o canal)
- Website Chat requer implementação de widget separado (baixa prioridade)

