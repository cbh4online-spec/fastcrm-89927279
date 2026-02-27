
# Adicionar estado de sucesso ao Context OS

## Problema
Após clicar "Concluir Setup", o wizard apenas mostra um toast — o utilizador continua a ver o formulário e não tem confirmação visual clara de que o setup está completo. Quando o `onboarding_completed` já é `true` (como agora), o wizard deveria mostrar um ecrã de sucesso.

## Alterações

### `src/components/context-os/WizardShell.tsx`
- Adicionar estado `completed` (inicializado com `initialData?.onboarding_completed`)
- Quando `onboarding_completed === true` (inicial ou após finish), mostrar um ecrã de sucesso premium em vez do wizard:
  - Ícone dourado grande com check/shield
  - "Context OS Configurado" como título
  - Resumo dos dados configurados (modelo, ICP, ofertas, metas)
  - Botão "Editar Configuração" para voltar ao wizard
  - Botão "Ir para Dashboard" com link
- O `handleFinish` passa a activar `setCompleted(true)` no `onSuccess`

### `src/pages/ContextOSPage.tsx`
- Passar `initialData` já inclui `onboarding_completed`, sem mudanças necessárias

## Ficheiros
| Ficheiro | Acção |
|----------|-------|
| `src/components/context-os/WizardShell.tsx` | Adicionar ecrã de sucesso com resumo e opção de editar |
