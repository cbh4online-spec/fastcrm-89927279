

## Corrigir botões CTA das Sugestões IA nas Renovações

### Problema

Os botões CTA gerados pelas sugestões IA (`RenewalAISuggestions.tsx`, linha 151) não têm `onClick` — o `cta_action` retornado pela edge function é completamente ignorado.

### Solução

Adicionar lógica de `onClick` ao botão CTA que mapeia `s.cta_action` para ações concretas na aplicação:

**Ficheiro: `src/components/renewals/RenewalAISuggestions.tsx`**

1. Aceitar uma prop `onAction?: (action: string) => void` no componente
2. Adicionar `onClick={() => onAction?.(s.cta_action)}` ao `<Button>` CTA (linha 151)
3. Implementar um handler default interno com mapeamento de ações comuns:
   - `schedule_meeting` → toast "Agendar reunião"
   - `send_proposal` → toast "Enviar proposta"
   - `create_task` → toast "Criar tarefa"
   - Ações desconhecidas → toast informativo genérico

**Ficheiro: `src/pages/RenewalDetailPage.tsx`**

4. Passar `onAction` ao `RenewalAISuggestions` para ligar a navegação real quando disponível (ex: abrir tab de faturação, navegar para lead)

### Ficheiros alterados

| Ficheiro | Ação |
|---|---|
| `src/components/renewals/RenewalAISuggestions.tsx` | Adicionar onClick + handler de ações |
| `src/pages/RenewalDetailPage.tsx` | Passar callback onAction |

