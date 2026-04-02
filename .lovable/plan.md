

## Corrigir variáveis nos templates de comunicação

### Diagnóstico

Dois problemas distintos:

1. **Variáveis não são resolvidas ao inserir template no compositor**: O `handleSelectTemplate` em `InboxTemplatePanel` constrói um mapa de variáveis a partir do `templateContext`, mas faltam mapeamentos importantes — nomeadamente `sender_name`, `sender_email`, `sender_cargo`, e variáveis de workspace como `empresa_nome`, `workspace_name`.

2. **Templates criados com placeholders em texto livre** (ex: `[O Seu Nome]`, `Senhor(a)`) em vez de `{{variável}}`: O formulário de criação (`TemplateFormDialog`) não converte nem avisa sobre placeholders fora do formato `{{}}`. Os utilizadores escrevem texto livre em vez de usar variáveis do sistema.

### Solução

**1. Expandir o mapeamento de variáveis no `handleSelectTemplate`** (`InboxTemplatePanel.tsx`)

Adicionar ao mapa `vars` todos os campos disponíveis no `templateContext`:
- `sender_name` / `responsavel_nome` ← `templateContext.user.full_name`
- `sender_email` ← `templateContext.user.email`
- `empresa_nome` / `workspace_name` ← `templateContext.workspace.name`
- `nome_cliente` ← nome do lead/contacto
- `primeiro_nome` / `first_name` ← primeiro nome do lead/contacto
- `lead_score`, `pipeline_stage`, `potential_value` ← do dynamicContext ou templateContext

**2. Adicionar variáveis em falta ao `TEMPLATE_VARIABLES`** (`communicationTemplate.ts`)

Adicionar:
- `sender_name` — "Nome do Remetente"
- `sender_email` — "Email do Remetente"  
- `workspace_name` — "Nome do Workspace"

**3. Melhorar o `renderDynamicTemplate`** (`dynamicTemplateEngine.ts`)

Adicionar suporte para resolver variáveis com aliases comuns — quando `sender_name` não existe, tentar `responsavel_nome`; quando `nome_cliente` não existe, tentar `first_name`.

**4. Preview na `TemplateFormDialog`** (`TemplateFormDialog.tsx`)

Garantir que as `previewVariables` incluem as novas variáveis (`sender_name`, `workspace_name`) para que o preview mostre valores reais.

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/types/communicationTemplate.ts` | Adicionar `sender_name`, `sender_email`, `workspace_name` ao `TEMPLATE_VARIABLES` |
| `src/components/inbox/InboxTemplatePanel.tsx` | Expandir mapeamento de variáveis em `handleSelectTemplate` para cobrir todas as variáveis disponíveis |
| `src/lib/dynamicTemplateEngine.ts` | Adicionar aliases de variáveis (sender_name↔responsavel_nome, nome_cliente↔first_name) no `replaceVariables` |
| `src/components/communication/TemplateFormDialog.tsx` | Actualizar preview variables para incluir novos campos |

### Critérios de aceitação

- Template com `{{sender_name}}` resolve para o nome do utilizador actual
- Template com `{{empresa_nome}}` ou `{{workspace_name}}` resolve para o nome do workspace
- Template com `{{primeiro_nome}}` resolve para o primeiro nome do lead/contacto
- Preview no formulário de templates mostra todas as variáveis com dados de exemplo
- Variáveis não resolvidas são limpas (string vazia) em vez de ficarem como `{{variável}}`

