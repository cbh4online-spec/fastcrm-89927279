

# Onboarding Inteligente Melhorado

## Melhorias Identificadas

O onboarding conversacional já funciona bem (coleta dados, gera config via IA, aplica pipeline/campos/forms). Mas há lacunas importantes entre o onboarding e o resto do sistema.

## Alterações

### 1. Auto-setup do Context OS após onboarding (`ApplyingStep.tsx`)
Adicionar um novo passo "context" no `ApplyingStep` que popula a tabela `business_context` com os dados recolhidos (businessType → sector, successDefinition → value_proposition, processDescription → sales_process, etc.), marcando `onboarding_completed: true`. Isto elimina a necessidade do utilizador configurar o Context OS manualmente.

### 2. Configurar intelligence defaults por segmento (`ApplyingStep.tsx`)
Usar o `computedSegment` para activar/desactivar benchmarks e forecast no workspace settings, baseado nos `intelligenceDefaults` do `onboardingSegments.ts`.

### 3. Automações reais no passo "automations" (`ApplyingStep.tsx`)
Substituir o `setTimeout` de 500ms por criação real de registos na tabela `automations` com os dados gerados pela IA (trigger, actions, nome, descrição). Status inicial `suggested` para o utilizador rever depois.

### 4. Post-onboarding checklist widget (`PostOnboardingChecklist.tsx`)
Novo widget no dashboard que aparece apenas quando `?onboarding=complete` ou nos primeiros 7 dias. Mostra progresso de setup: criar primeiro lead, enviar primeiro email, configurar WhatsApp, importar contactos, gerar primeiro Daily Brief. Cada item linkar para a página respectiva.

### 5. Auto-gerar primeiro Daily Brief (`ApplyingStep.tsx`)
Após aplicar a configuração, invocar `daily-revenue-brief` para gerar o primeiro brief automaticamente (mesmo que com poucos dados), dando ao utilizador algo para ver imediatamente no dashboard.

### 6. Visual premium do onboarding (`ConversationalOnboarding.tsx`)
Aplicar o visual dark+gold consistente com o resto do Revenue OS: header com gradiente gold, cards com `glass-premium`, animações de transição mais suaves entre passos.

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/components/onboarding/steps/ApplyingStep.tsx` | Adicionar passos Context OS, automações reais, intelligence defaults, trigger Daily Brief |
| `src/components/dashboard/PostOnboardingChecklist.tsx` | Novo widget checklist pós-onboarding |
| `src/pages/Dashboard.tsx` | Integrar PostOnboardingChecklist |
| `src/components/onboarding/ConversationalOnboarding.tsx` | Visual premium dark+gold |

## Detalhe Técnico

- O Context OS auto-setup mapeia: `businessType` → `sector`, `successDefinition` → `value_proposition`, `processDescription` → `sales_process`, `channels` → `main_channels`, `teamSize` → `team_roles`
- Automações são criadas com `status: 'draft'` para o utilizador poder rever antes de activar
- O checklist usa `workspace_onboarding.completed_at` para calcular os 7 dias de visibilidade
- O Daily Brief trigger é fire-and-forget (não bloqueia o onboarding se falhar)

