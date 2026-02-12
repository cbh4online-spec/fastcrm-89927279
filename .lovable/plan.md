

## Autopilot: Resposta Imediata

### Problema Atual

O autopilot tem um delay artificial de 5-12 segundos antes de responder, simulando um tempo de resposta "humano". Isto atrasa desnecessariamente as respostas automáticas.

### Solução

Alterar os valores padrão do delay para 0 segundos e garantir que o sistema responde de imediato quando o delay está a zero.

### Alterações

**1. Edge Function `ghl-webhook-message/index.ts`**
- Mudar os defaults de `response_delay_min` e `response_delay_max` de 5/10 para 0/0
- Saltar o `setTimeout` quando o delay calculado for 0

**2. Hook `useAutopilotConfig.ts`**
- Mudar os valores padrão de `response_delay_min: 8` e `response_delay_max: 12` para `0` e `0`

**3. Componente `AutopilotToggle.tsx`**
- Ajustar a exibição para mostrar "Imediato" quando o delay for 0

### Detalhes Técnicos

No ficheiro `ghl-webhook-message/index.ts` (linhas 823-839):
```text
// Antes:
const delayMin = autopilotConfig.response_delay_min || 5;
const delayMax = autopilotConfig.response_delay_max || 10;
const delaySeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

// Depois:
const delayMin = autopilotConfig.response_delay_min ?? 0;
const delayMax = autopilotConfig.response_delay_max ?? 0;
const delaySeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
if (delaySeconds > 0) {
  await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
}
```

Nota: usar `??` em vez de `||` para que o valor `0` seja respeitado (com `||`, zero seria tratado como falsy e substituído pelo default).

No `useAutopilotConfig.ts`, os defaults passam a:
```text
response_delay_min: 0,
response_delay_max: 0,
```

No `AutopilotToggle.tsx`, a exibição do delay mostra "Imediato" quando ambos os valores são 0.

### Resultado

- O autopilot responde sem qualquer delay artificial
- Utilizadores que queiram delay podem configurá-lo manualmente nas definições
- Configurações existentes com delay personalizado continuam a funcionar normalmente
