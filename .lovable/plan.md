
# Alerta visual de janela de 24h do Instagram

## O que muda

Adicionar um banner de alerta no topo da area de mensagens quando a conversa e do Instagram e a ultima mensagem inbound foi ha mais de 24h (ou esta proxima de expirar). O composer (campo de escrita) fica desativado quando a janela expirou.

## Novo componente: `src/components/inbox/InstagramWindowAlert.tsx`

Banner compacto que calcula o tempo desde a ultima mensagem inbound:

- **Expirada (>24h)**: Banner vermelho/destrutivo com icone de alerta -- "Janela de 24h expirada. Nao e possivel enviar mensagens ate o contacto enviar nova mensagem."
- **A expirar (20-24h)**: Banner amarelo/warning -- "Janela de resposta expira em Xh Xmin."
- **Dentro do prazo (<20h)**: Nao mostra nada.

O componente recebe as `messages` e o `channel`, filtra a ultima mensagem inbound, e calcula o `differenceInHours` / `differenceInMinutes` com atualizacao a cada minuto via `setInterval`.

## Alteracoes em `src/components/inbox/ConversationDetail.tsx`

1. Importar e renderizar `InstagramWindowAlert` entre o header e a area de mensagens (antes do ScrollArea), passando `messages`, `channel` e expondo um `isExpired` flag.
2. Passar `isExpired` para o `AIMessageComposer` como prop `disabled` -- quando `true`, o composer mostra estado desativado com placeholder explicativo.

## Alteracoes em `src/components/inbox/AIMessageComposer.tsx`

Adicionar prop opcional `disabled?: boolean`. Quando `true`:
- O textarea fica `disabled` com placeholder "Janela de 24h expirada"
- O botao de enviar fica desativado
- O componente mostra opacidade reduzida

## Detalhes tecnicos

### InstagramWindowAlert

```text
Props:
- messages: Message[]
- channel: string
- onExpiredChange?: (expired: boolean) => void

Logica:
1. Filtrar messages com direction === "inbound"
2. Pegar a mais recente (max sent_at)
3. Calcular differenceInHours(now, lastInboundDate)
4. Se channel !== "instagram" -> return null
5. Se >= 24h -> banner vermelho
6. Se >= 20h -> banner amarelo com countdown
7. useEffect com setInterval(60000) para atualizar
```

### Ficheiros a criar/modificar

| Ficheiro | Tipo |
|---|---|
| `src/components/inbox/InstagramWindowAlert.tsx` | Novo |
| `src/components/inbox/ConversationDetail.tsx` | Modificar -- adicionar banner + estado expired |
| `src/components/inbox/AIMessageComposer.tsx` | Modificar -- adicionar prop disabled |
