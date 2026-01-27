
# Plano: Redesign do Inbox Email Inspirado na Referencia

## Analise da Imagem de Referencia

A imagem mostra um design de inbox moderno com:

**Layout de 4 Colunas:**
1. **Sidebar de Navegacao** (icones) - navegacao principal da app
2. **Painel de Categorias** (~200px) - filtros organizados em grupos (Channels, Drafts, Mentions, Conversations com subcategorias, Contacts)
3. **Lista de Conversas** (~300px) - lista com avatares, nomes, preview, timestamps, badges de nao lidos
4. **Detalhe da Conversa** (flex-1) - thread de mensagens com bubbles alinhadas
5. **Painel CRM** (~280px) - info do contato (Status, Appeals, Last Contact, Subscribed, Notifications, User Settings)

**Elementos de Design Notaveis:**
- Avatares circulares com imagens reais (nao apenas icones)
- Badges de contagem em verde
- Sidebar de categorias com colapsaveis (> New, All, Assigned, etc.)
- Mensagens com timestamps "Message Sent" / "Message Received"
- Acoes no header: "Move to Closed", "Not assigned", bookmark
- Painel direito com status ativo/inativo e acoes rapidas
- Botoes de proposta/documento no final de mensagens
- Input de mensagem com icones de anexo, emoji, audio

---

## Componentes a Modificar

### 1. InboxView.tsx - Layout Principal
**Atual:** Layout de 3 colunas (Lista 320px | Detalhe flex-1 | CRM 320px)
**Novo:** Adicionar painel de categorias antes da lista de conversas

```
[Nav Icons] [Categories 200px] [Conv List 300px] [Detail flex-1] [CRM 280px]
```

### 2. InboxSidebar.tsx (NOVO)
Criar sidebar de categorias com:
- Channels (agrupado)
- Drafts
- Mentions
- Files & Media
- Conversations (colapsavel com subcategorias):
  - New (com badge)
  - All
  - Assigned
  - Favourites
  - Negotiations (com subcategorias)
  - Closed
  - Archives
- Contacts (lista rapida de contactos frequentes)

### 3. ConversationList.tsx - Redesign Visual
- Avatares maiores com fotos de perfil (se disponiveis)
- Layout mais limpo com menos badges inline
- Timestamps alinhados a direita
- Badges de nao lidos em verde (nao azul)
- Preview da ultima mensagem truncada

### 4. ConversationDetail.tsx - Redesign
- Header com acoes: "Move to Closed" dropdown, "Not assigned" badge, bookmark
- Bubbles de mensagem redesenhadas:
  - Mensagens enviadas (Company) alinhadas a direita com check de lido
  - Mensagens recebidas alinhadas a esquerda
  - Timestamps abaixo de cada mensagem
  - Anexos/propostas como botoes clicaveis
- Input de mensagem redesenhado com icones de:
  - Anexo (+)
  - Emoji
  - Audio
  - Enviar (seta)

### 5. InboxCRMPanel.tsx - Redesign
- Header com avatar grande do contato + nome + URL
- Botoes de acao (telefone, email, calendar) + Unsubscribe
- Status com badge colorido (Active/Inactive)
- Metricas: Appeals, Last Contact, Subscribed
- Notificacoes: Deals Pending, New Message, New user registered
- User Settings: Notifications toggle, Report, Block

---

## Implementacao Tecnica

### Passo 1: Criar InboxSidebar.tsx

```typescript
interface InboxSidebarProps {
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
}

// Estrutura de categorias
const categories = [
  { id: "channels", label: "Channels", icon: Hash },
  { id: "drafts", label: "Drafts", icon: FileEdit },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "files", label: "Files & Media", icon: Paperclip },
  {
    id: "conversations",
    label: "Conversations",
    icon: MessageSquare,
    children: [
      { id: "new", label: "New", count: 5 },
      { id: "all", label: "All", count: 30 },
      { id: "assigned", label: "Assigned", count: 11 },
      { id: "favourites", label: "Favourites", count: 9 },
      { id: "negotiations", label: "Negotiations", count: 20 },
      { id: "closed", label: "Closed", count: 145 },
      { id: "archives", label: "Archives", count: 32 },
    ],
  },
];
```

### Passo 2: Modificar InboxView.tsx

```tsx
<div className="h-full flex">
  {/* Categories Sidebar */}
  <div className="w-52 flex-shrink-0 border-r border-border">
    <InboxSidebar 
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
    />
  </div>

  {/* Conversation List */}
  <div className="w-72 flex-shrink-0 border-r border-border">
    <ConversationList ... />
  </div>

  {/* Conversation Detail */}
  <div className="flex-1">
    <ConversationDetail ... />
  </div>

  {/* CRM Panel */}
  <div className="w-72 flex-shrink-0 border-l border-border">
    <InboxCRMPanel ... />
  </div>
</div>
```

### Passo 3: Redesign ConversationList Item

```tsx
<div className="flex items-center gap-3 p-3">
  {/* Avatar com foto */}
  <Avatar className="h-10 w-10">
    <AvatarImage src={conv.lead?.avatar_url || conv.contact?.avatar_url} />
    <AvatarFallback className="bg-primary/10 text-primary">
      {getInitials(displayName)}
    </AvatarFallback>
  </Avatar>

  {/* Info */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center justify-between">
      <span className="font-medium truncate">{displayName}</span>
      <span className="text-xs text-muted-foreground">{timeAgo}</span>
    </div>
    <p className="text-sm text-muted-foreground truncate">{preview}</p>
  </div>

  {/* Badge */}
  {unreadCount > 0 && (
    <Badge className="bg-green-500 text-white h-5 w-5 rounded-full p-0">
      {unreadCount}
    </Badge>
  )}
</div>
```

### Passo 4: Redesign ConversationDetail Header

```tsx
<div className="flex items-center justify-between p-4 border-b">
  <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Checkbox className="mr-2 h-4 w-4" />
          Move to Closed
        </Button>
      </DropdownMenuTrigger>
      ...
    </DropdownMenu>
  </div>

  <div className="flex items-center gap-2">
    <Badge variant="secondary" className="text-red-500">
      <AlertTriangle className="w-3 h-3 mr-1" />
      Not assigned
    </Badge>
    <Button variant="ghost" size="icon">
      <Bookmark />
    </Button>
  </div>
</div>
```

### Passo 5: Redesign Message Bubbles

```tsx
{/* Mensagem recebida */}
<div className="flex gap-3 mb-4">
  <Avatar className="h-8 w-8">...</Avatar>
  <div className="flex-1">
    <div className="flex items-center gap-2 mb-1">
      <span className="font-medium text-sm">{senderName}</span>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
    <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[80%]">
      <p className="text-sm">{message.content}</p>
    </div>
    <span className="text-xs text-muted-foreground mt-1">
      Message Received {timestamp}
    </span>
  </div>
</div>

{/* Mensagem enviada */}
<div className="flex justify-end mb-4">
  <div className="max-w-[80%]">
    <div className="flex items-center justify-end gap-2 mb-1">
      <span className="font-medium text-sm">Company</span>
      <Check className="w-3 h-3 text-green-500" />
    </div>
    <div className="bg-card border rounded-lg rounded-tr-none p-3">
      <p className="text-sm">{message.content}</p>
      {/* Attachments */}
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm">
          <FileText className="w-3 h-3 mr-1" /> Proposal
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="w-3 h-3 mr-1" /> Updated Doc
        </Button>
      </div>
    </div>
    <span className="text-xs text-muted-foreground mt-1">
      Message Sent {timestamp}
    </span>
  </div>
</div>
```

### Passo 6: Redesign Message Input

```tsx
<div className="border-t p-4">
  <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Plus className="w-4 h-4" />
    </Button>
    <Input 
      placeholder="Type your message..." 
      className="border-0 bg-transparent flex-1 focus-visible:ring-0"
    />
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Smile className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Mic className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Paperclip className="w-4 h-4" />
    </Button>
    <Button size="icon" className="h-8 w-8 rounded-full bg-primary">
      <Send className="w-4 h-4" />
    </Button>
  </div>
</div>
```

### Passo 7: Redesign InboxCRMPanel

```tsx
<div className="p-4 space-y-4">
  {/* Header com avatar */}
  <div className="text-center">
    <Avatar className="h-16 w-16 mx-auto mb-2">
      <AvatarImage src={contact?.avatar_url} />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
    <h3 className="font-semibold">{name}</h3>
    <a href={website} className="text-xs text-primary flex items-center justify-center gap-1">
      <Globe className="w-3 h-3" />
      {website}
    </a>
  </div>

  {/* Quick Actions */}
  <div className="flex items-center justify-center gap-2">
    <Button variant="outline" size="icon" className="rounded-full">
      <Phone className="w-4 h-4" />
    </Button>
    <Button variant="outline" size="icon" className="rounded-full">
      <Mail className="w-4 h-4" />
    </Button>
    <Button variant="outline" size="icon" className="rounded-full">
      <Calendar className="w-4 h-4" />
    </Button>
    <Button variant="secondary" size="sm" className="bg-green-500 text-white hover:bg-green-600">
      Unsubscribe
    </Button>
  </div>

  <Separator />

  {/* Stats Grid */}
  <div className="grid grid-cols-2 gap-3 text-sm">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Status:</span>
      <Badge className="bg-green-500">Active</Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Appeals:</span>
      <span className="font-medium">2</span>
    </div>
    ...
  </div>

  <Separator />

  {/* Notifications */}
  <div>
    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
      <Bell className="w-4 h-4" /> Notifications
    </h4>
    <div className="space-y-2">
      <NotificationItem icon={DollarSign} text="5 Deals Pending" time="Just now" />
      <NotificationItem icon={Mail} text="New Message" time="12 hours ago" />
      ...
    </div>
  </div>

  <Separator />

  {/* User Settings */}
  <div>
    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
      <Settings className="w-4 h-4" /> User Settings
    </h4>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifications
        </span>
        <Switch checked={true} />
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start">
        <Flag className="w-4 h-4 mr-2" /> Report
      </Button>
      <Button variant="ghost" size="sm" className="w-full justify-start text-destructive">
        <Ban className="w-4 h-4 mr-2" /> Block
      </Button>
    </div>
  </div>
</div>
```

---

## Ficheiros a Modificar/Criar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| `src/components/inbox/InboxSidebar.tsx` | CRIAR | Nova sidebar de categorias colapsaveis |
| `src/components/inbox/InboxView.tsx` | MODIFICAR | Adicionar sidebar e ajustar layout |
| `src/components/inbox/ConversationList.tsx` | MODIFICAR | Redesign visual com avatares e badges verdes |
| `src/components/inbox/ConversationDetail.tsx` | MODIFICAR | Novo header, bubbles redesenhadas, input circular |
| `src/components/inbox/InboxCRMPanel.tsx` | MODIFICAR | Layout centrado com avatar, stats grid, notificacoes |
| `src/components/inbox/MessageBubble.tsx` | CRIAR | Componente generico para mensagens (email/chat) |
| `src/components/inbox/MessageInput.tsx` | CRIAR | Input redesenhado com icones |

---

## Consideracoes de Responsividade

Em ecras menores (< 1280px):
- Esconder InboxSidebar (categorias)
- Esconder InboxCRMPanel
- Mostrar apenas Lista + Detalhe

Em ecras medios (1280-1536px):
- Mostrar Sidebar colapsada (so icones)
- Lista + Detalhe + CRM

Em ecras grandes (> 1536px):
- Layout completo com todas as colunas

---

## Paleta de Cores Atualizada

- **Badges de nao lidos:** Verde (#22c55e) em vez de azul
- **Mensagens enviadas:** Fundo branco com border
- **Mensagens recebidas:** Fundo cinza suave (muted)
- **Status Active:** Verde (#22c55e)
- **Botao Enviar:** Verde primario em circulo

---

## Proximos Passos

1. Implementar InboxSidebar com categorias colapsaveis
2. Atualizar layout do InboxView para 5 colunas
3. Redesign do ConversationList item
4. Redesign do ConversationDetail (header + bubbles + input)
5. Redesign do InboxCRMPanel
6. Testes de responsividade
7. Aplicar mesma linguagem visual as outras redes (WhatsApp, Instagram, etc.)
