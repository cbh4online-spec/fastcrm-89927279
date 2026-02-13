

## Melhorar Visualizacao de Mensagens no Inbox (estilo GHL)

### Problema Atual

As mensagens no inbox mostram apenas a hora (HH:mm) sem separadores de data, sem nome do remetente, e sem indicadores de estado de entrega. A experiencia e muito basica comparada com o GHL.

### Referencia GHL

O GHL mostra:
- Separadores de data entre grupos de mensagens ("Yesterday", "Today")
- Nome do remetente acima de cada mensagem
- Hora completa (ex: "09:04 PM") abaixo de cada bolha
- Icone do canal junto ao avatar

### Alteracoes

**1. Substituir renderizacao inline por `MessageBubble` no `ConversationDetail.tsx`**

O componente `MessageBubble` ja existe e tem suporte para:
- Avatar do remetente com iniciais
- Nome do remetente
- Timestamps formatados com data e hora
- Indicadores de estado de entrega (enviado, entregue, lido)
- Suporte a anexos

Atualmente o `ConversationDetail` usa renderizacao inline basica (linhas 416-448). Vamos substituir pelo `MessageBubble`.

**2. Adicionar separadores de data entre mensagens**

Criar logica para agrupar mensagens por dia e inserir separadores visuais como:

```text
------------ Ontem ------------
[mensagens de ontem]

------------ Hoje ------------
[mensagens de hoje]
```

Usando `date-fns` com locale `pt` para labels como "Hoje", "Ontem", ou a data completa (ex: "12 Fev").

**3. Passar dados do lead e conversa ao MessageBubble**

- Mensagens inbound: mostrar nome do lead/contacto
- Mensagens outbound: mostrar nome da empresa ou "Voce"
- Incluir `delivered_at`, `read_at`, `sent_at` para os indicadores de entrega

### Detalhes Tecnicos

No `ConversationDetail.tsx` (linhas ~414-452):

1. Importar `MessageBubble` de `./MessageBubble`
2. Importar `isToday`, `isYesterday`, `format` de `date-fns`
3. Antes do `.map()`, criar uma funcao helper que determina se deve mostrar separador de data
4. Renderizar separadores de data entre grupos de mensagens
5. Substituir o JSX inline pelo componente `MessageBubble` com as props corretas:
   - `senderName`: nome do lead para inbound, nome da empresa para outbound
   - `senderAvatar`: avatar do lead se disponivel
   - `companyName`: nome do workspace ou "Voce"

Exemplo de separador de data:
```text
<div className="flex items-center gap-3 py-3">
  <div className="flex-1 h-px bg-border" />
  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
    <Calendar className="w-3 h-3" />
    Hoje
  </span>
  <div className="flex-1 h-px bg-border" />
</div>
```

### Resultado

- Mensagens com data e hora completa de rececao
- Separadores visuais por dia (Hoje, Ontem, data)
- Nome do remetente visivel em cada mensagem
- Indicadores de estado de entrega (enviado, entregue, lido)
- Visual consistente com a experiencia GHL

