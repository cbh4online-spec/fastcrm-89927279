

# Plano: Substituir Alertas Demo por Alertas Reais no Sininho

## Problema Identificado

O sininho de notificações no header (`TopBar`) mostra sempre alertas de demonstração hardcoded em vez de usar os alertas reais da base de dados.

### Situação Atual

| Componente | Localização | Fonte de Dados |
|------------|-------------|----------------|
| `NotificationsDropdown` | TopBar (header global) | Dados demo hardcoded |
| `SmartAlertsPopover` | InboxView | Base de dados real |

O sistema de alertas inteligentes (`inbox_smart_alerts`) já está implementado e funcional, com hooks para CRUD (`useSmartAlerts`, `useDismissAlert`, `useMarkAlertRead`, etc.).

### Alertas Demo vs Alertas Reais

```text
NotificationsDropdown (ATUAL):
+------------------+
| demoNotifications|  <- Array estático
|   - João Silva   |     definido no código
|   - Proposta #123|
|   - Maria...     |
+------------------+

SmartAlertsPopover (REAL):
+------------------+
| useSmartAlerts() |  <- Query à base de dados
|   - inbox_smart_ |     com hooks para
|     alerts table |     marcar lido/descartar
+------------------+
```

## Solução Proposta

Substituir o `NotificationsDropdown` pelo `SmartAlertsPopover` no `TopBar`, fazendo ajustes visuais mínimos para manter a consistência com o design do header.

### Alterações Necessárias

**1. Ficheiro: `src/components/layout/TopBar.tsx`**

Substituir a importação e uso do `NotificationsDropdown` pelo `SmartAlertsPopover`:

```typescript
// Antes
import { NotificationsDropdown } from "./NotificationsDropdown";
// ...
<NotificationsDropdown />

// Depois
import { SmartAlertsPopover } from "@/components/inbox/SmartAlertsPopover";
// ...
<SmartAlertsPopover />
```

**2. Ficheiro: `src/components/inbox/SmartAlertsPopover.tsx`** (ajustes opcionais)

Pequenas alterações para melhor integração no header:
- Variante visual mais compacta para o header
- Remover texto "Alertas" no header (só ícone)

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/layout/TopBar.tsx` | Substituir `NotificationsDropdown` por `SmartAlertsPopover` |
| `src/components/inbox/SmartAlertsPopover.tsx` | Ajustar estilo do botão para modo compacto (opcional) |

## Resultado Esperado

Após a alteração:
1. O sininho no header mostra alertas reais da base de dados
2. Clicar num alerta marca-o como lido e navega para a ação
3. Alertas podem ser descartados individualmente
4. O badge mostra a contagem real de alertas não lidos
5. Quando não há alertas, mostra "Tudo em dia!"

## Complexidade

Baixa - Principalmente substituição de imports e ajuste de props.

