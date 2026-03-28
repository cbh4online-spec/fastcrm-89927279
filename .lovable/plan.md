

# Mostrar dia e hora na lista de conversas do Inbox

## Situação actual
A lista de conversas já tem timestamps via `formatSmartTime()` — mostra "HH:mm" hoje, "Ontem HH:mm" ontem, "dd/MM HH:mm" para mais antigos. Porém, o timestamp tem a classe `group-hover:hidden` que o esconde quando o utilizador passa o rato por cima (para mostrar as quick actions). Além disso, o texto é muito pequeno (`text-[11px]`).

## Alteração — `src/components/inbox/ConversationList.tsx`

1. **Tornar o timestamp sempre visível** — remover `group-hover:hidden` da classe do timestamp
2. **Mover as quick actions para não sobrepor o tempo** — as quick actions já têm `ml-auto`, basta que ambos coexistam (tempo fixo, actions aparecem à direita ou abaixo)
3. **Melhorar legibilidade** — aumentar ligeiramente o tamanho para `text-xs` e garantir que mostra sempre dia + hora (não só hora para mensagens de hoje)

### Detalhes técnicos
- Linha ~472: remover `group-hover:hidden` do `<span>` do timestamp
- Linha ~61: alterar `formatSmartTime` para incluir "Hoje" no formato de hoje: `"Hoje HH:mm"` em vez de apenas `"HH:mm"`
- Manter o tooltip com `formatRelativeTime` para informação mais detalhada

