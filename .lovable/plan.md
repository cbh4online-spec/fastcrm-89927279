

# AI Autofill para Atributos (estilo Attio)

## Abordagem

Adicionar uma secção "AI Autofill" ao diálogo de criação (e edição) de campos, inspirada no anexo Attio. A configuração será guardada no campo JSONB `formatting_config` existente na tabela `custom_fields` -- sem necessidade de migração. Quando o AI autofill está ativo, ao criar/editar registos o sistema invoca uma edge function que preenche o campo automaticamente usando o Lovable AI Gateway.

A configuração de AI autofill inclui:
- Toggle on/off
- Tipo de autofill: "Research agent" (pesquisa web), "Generate" (gerar texto), "Classify" (categorizar)
- Prompt de orientação com suporte a variáveis `{campo}` (inseridas via botão "Usar variável")

## Alterações

### 1. Editar `src/types/fieldManager.ts`

Adicionar ao `FormattingConfig`:
```ts
ai_autofill_enabled?: boolean;
ai_autofill_type?: 'research' | 'generate' | 'classify';
ai_autofill_guidance?: string;
```

### 2. Criar `src/components/field-manager/AIAutofillConfig.tsx`

Componente reutilizável com:
- Toggle "AI autofill" com ícone Sparkles
- Select para tipo (Research agent, Gerar conteúdo, Classificar)
- Textarea para guidance com placeholder contextual
- Botão "Usar variável" que insere `{nome_campo}` no cursor
- Nota "A IA terá acesso a todos os atributos do registo"
- Recebe lista de campos existentes da entidade para popular dropdown de variáveis

### 3. Editar `src/components/field-manager/CreateFieldDialog.tsx`

- Adicionar tab "IA" (5.ª tab) ou secção dentro da tab Identificação (após os toggles)
- Importar e renderizar `AIAutofillConfig`
- Guardar config no `formattingConfig` antes do submit

### 4. Editar `src/components/field-manager/EditFieldDialog.tsx`

- Mesma secção AI Autofill, pré-populada com valores existentes

### 5. Criar edge function `supabase/functions/ai-autofill-field/index.ts`

- Recebe `field_config` (tipo + guidance), `record_data` (dados do registo), `field_name`
- Constrói prompt baseado no tipo de autofill e guidance do utilizador
- Chama Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Retorna valor sugerido para o campo

### 6. Criar hook `src/hooks/useAIAutofillField.ts`

- Mutation que chama a edge function
- Usado nos formulários de criação/edição de registos para preencher campos com AI autofill activo

| Ficheiro | Acção |
|----------|-------|
| `src/types/fieldManager.ts` | Adicionar tipos AI autofill ao FormattingConfig |
| `src/components/field-manager/AIAutofillConfig.tsx` | Novo componente de configuração |
| `src/components/field-manager/CreateFieldDialog.tsx` | Adicionar secção AI Autofill |
| `src/components/field-manager/EditFieldDialog.tsx` | Adicionar secção AI Autofill |
| `supabase/functions/ai-autofill-field/index.ts` | Nova edge function |
| `src/hooks/useAIAutofillField.ts` | Novo hook de autofill |

