

# Remover sino duplicado do TopBar

## Problema

No canto superior direito existem dois icones de sino identicos:
1. **NotificationBell** -- notificacoes administrativas (novos pedidos, stock baixo, etc.)
2. **SmartAlertsPopover** -- alertas inteligentes do inbox (leads sem resposta, loops, etc.)

Ambos usam o icone `Bell` do lucide-react, tornando-os visualmente indistinguiveis. Alem disso, o `SmartAlertsPopover` ja aparece dentro da pagina de Inbox (`InboxMetricsBar`), portanto esta duplicado no TopBar.

## Solucao

Remover o `SmartAlertsPopover` do `TopBar`. Manter apenas o `NotificationBell` como sino unico no header global. Os alertas inteligentes continuam acessiveis na pagina de Inbox onde ja estao integrados.

## Alteracao

### Ficheiro: `src/components/layout/TopBar.tsx`

1. Remover o import de `SmartAlertsPopover`
2. Remover a linha `<SmartAlertsPopover className="h-9 w-9 p-0" />`

Resultado: apenas um sino no TopBar (notificacoes admin), sem perda de funcionalidade.

