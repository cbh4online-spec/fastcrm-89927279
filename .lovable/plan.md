

## Sequência de Recuperação de Carrinhos — Plano

### Diagnóstico

A infraestrutura já existe:
- Tabelas `email_sequences` e `email_sequence_steps` com campos `delay_hours`, `delay_days`, `subject`, `body`
- Hooks `useCreateSequence` e `useCreateStep` para CRUD
- `resolveTemplateVariables` e `buildRecoveryTemplateVariables` já mapeiam `{{contact_name}}`, `{{cart_total}}`, `{{recovery_link}}`
- `StoreRecoverySettings` já permite selecionar uma sequência como default

**O que falta:** Um botão/ação que crie automaticamente a sequência pré-configurada com os 3 steps e conteúdo HTML com merge variables.

### Plano

#### 1. Criar hook `useCreateRecoverySequence` (`src/hooks/useCreateRecoverySequence.ts`)

Mutation que:
1. Cria `email_sequences` com nome "Recuperação de Carrinho" e tags `["recovery", "cart"]`
2. Insere 3 `email_sequence_steps` em sequência:
   - **Step 1** (1h): Subject "{{contact_name}}, esqueceu-se de algo?" — corpo amigável com link de recuperação
   - **Step 2** (24h): Subject "O seu carrinho ainda espera por si" — corpo com urgência moderada e resumo do valor
   - **Step 3** (72h): Subject "Última oportunidade — {{cart_total}} à sua espera" — corpo de urgência final
3. Cada body usa `{{contact_name}}`, `{{cart_total}}`, `{{recovery_link}}` como merge variables
4. Retorna o ID da sequência criada

#### 2. Adicionar botão na `StoreRecoverySettings` (`src/components/store/StoreRecoverySettings.tsx`)

- Mostrar botão "Criar Sequência de Recuperação" quando não há sequências ativas disponíveis (ou sempre, como atalho)
- Ao clicar, invoca o hook, cria a sequência e auto-seleciona como `default_sequence_id`
- Feedback com toast de sucesso

### Ficheiros

| Acção | Ficheiro |
|-------|----------|
| Criar | `src/hooks/useCreateRecoverySequence.ts` |
| Editar | `src/components/store/StoreRecoverySettings.tsx` |

Sem migrations — usa tabelas existentes.

