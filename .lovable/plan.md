

## Corrigir validação e registo de números de telefone

### Diagnóstico

O `PhoneInput` importa `PatternFormat` e `react-number-format` mas **não os utiliza** — renderiza apenas um `<Input type="tel">` simples. Isto significa:
- Não há formatação automática do número
- Não há máscara de input
- O valor é guardado tal como o utilizador escreve (pode faltar dígitos, ter espaços inconsistentes, etc.)
- A validação visual (borda vermelha) existe mas não impede a submissão
- Os formulários de criação de contacto e lead **não validam** o telefone antes de guardar

### Plano

**1. Refazer `PhoneInput` com formatação e validação real**
- Usar `libphonenumber-js` `AsYouType` formatter para formatação em tempo real
- Mostrar indicador visual de válido/inválido (borda vermelha + ícone)
- Normalizar o valor para E.164 no `onChange` quando válido
- Manter o prefixo `+351` como default mas aceitar qualquer código de país
- Expor prop `onValidChange` para os formulários saberem se o número é válido

**2. Adicionar validação nos formulários**
- `CreateContactDialog`: validar telefone antes de submeter — se preenchido, deve ser válido
- `CreateLeadDialog`: mesma validação no schema zod/react-hook-form
- Bloquear submissão se telefone preenchido mas inválido
- Mostrar mensagem de erro clara: "Número de telefone inválido"

**3. Normalização ao guardar**
- Converter para E.164 (`toE164()`) antes de persistir na base de dados
- Garantir consistência: todos os telefones guardados em formato `+351912345678`

### Ficheiros alterados
- `src/components/ui/PhoneInput.tsx` — refazer com formatação AsYouType
- `src/components/contacts/CreateContactDialog.tsx` — adicionar validação
- `src/components/crm/CreateLeadDialog.tsx` — adicionar validação no schema

### Critérios de aceitação
- Ao digitar "912345678", o input formata automaticamente para "+351 912 345 678"
- Números incompletos mostram borda vermelha
- Formulários não submetem com telefone inválido (se preenchido)
- Valor guardado na BD em formato E.164

