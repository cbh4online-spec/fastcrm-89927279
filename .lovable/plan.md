

# Preencher automaticamente o nome da empresa nas mensagens automatizadas

## Problema
Quando mensagens automatizadas são enviadas (prospecção, templates, automações), o campo "Nome da Empresa" aparece como placeholder literal `[Nome da Empresa]` em vez de ser preenchido com o nome real do workspace. Isto acontece em 3 pontos:

1. **AI de prospecção** (`generate-prospecting-message`): O prompt AI recebe o `workspaceContext.name` mas nem sempre o usa corretamente — por vezes gera `[Nome da Empresa]` como placeholder
2. **Sistema de variáveis de template** (`templateVariables.ts`): Não existe variável `{{workspace.name}}` disponível
3. **Contexto de template nas conversas** (`ConversationDetail.tsx`, `automationTemplateRenderer.ts`): Não injeta dados do workspace

## Plano de implementação

### 1. Adicionar variáveis de workspace ao sistema de templates
**Ficheiro:** `src/lib/templateVariables.ts`
- Criar nova categoria `workspace` com variáveis: `{{workspace.name}}`, `{{workspace.email}}`, `{{workspace.phone}}`, `{{workspace.website}}`
- Adicionar ao `VariableContext` interface um campo `workspace`
- Atualizar `resolveVariable` para resolver `workspace.*`
- Adicionar à lista `variableCategories`

### 2. Injetar workspace no contexto de templates
**Ficheiro:** `src/components/inbox/ConversationDetail.tsx`
- Usar `useWorkspace()` para obter `currentWorkspace`
- Adicionar `workspace: { name: currentWorkspace.name }` ao `templateContext`

**Ficheiro:** `src/lib/automationTemplateRenderer.ts`
- Adicionar parâmetro `workspaceData` ao `buildContextFromTriggerData`
- Popular `context.workspace` com nome do workspace

### 3. Corrigir o prompt de prospecção AI
**Ficheiro:** `supabase/functions/generate-prospecting-message/index.ts`
- Reforçar no prompt do sistema que o AI **DEVE usar o nome real da empresa** fornecido no contexto, **NUNCA** placeholders como `[Nome da Empresa]`
- Adicionar instrução explícita: "O nome da tua empresa é: {workspaceContext.name}. Usa este nome exacto."

### 4. Adicionar fallback de substituição pós-geração
**Ficheiro:** `supabase/functions/generate-prospecting-message/index.ts`
- Após gerar a mensagem AI, substituir automaticamente quaisquer `[Nome da Empresa]`, `[nome da empresa]`, `[Company Name]` pelo `workspaceContext.name` real — como rede de segurança

### 5. Atualizar previews e exemplos
**Ficheiro:** `src/lib/dynamicTemplateEngine.ts`
- Atualizar `getDynamicPreviewVariables` para incluir `workspace_name`

**Ficheiro:** `src/lib/templateVariables.ts`
- Atualizar `getExampleContext` para incluir dados de workspace de exemplo

