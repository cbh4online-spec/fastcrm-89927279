
# Plano: Adicionar Imagens e Formulário de Captura ao Editor de Funil

## Problema Atual
O editor de steps do funil (`FunnelStepEditor`) não permite:
1. **Adicionar imagens** — a página pública já renderiza `image_url` mas o editor não tem campo para definir
2. **Formulário de captura de contactos** — steps do tipo `optin` devem ter um formulário embutido para captar leads (nome, email, telefone, etc.)

## O Que Vai Ser Feito

### 1. Secção de Imagem no Editor
- Adicionar campo de **URL de imagem** ou **upload de imagem** no `FunnelStepEditor`
- Possibilidade de gerar imagem com IA (usando o modelo de imagem disponível)
- Preview da imagem no painel de pré-visualização
- Guardar `image_url` no content do step

### 2. Formulário de Captura de Contactos (para steps tipo `optin`)
- Adicionar uma nova tab **"Formulário"** no editor, visível quando `step_type === "optin"`
- Permitir configurar campos do formulário: nome, email, telefone, campos custom
- Guardar a configuração do formulário no `content.form_fields` do step
- Na página pública (`PublicFunnelPage`), renderizar o formulário com os campos configurados
- Ao submeter, criar um lead na tabela existente (ou `form_submissions`)

### 3. Página Pública Atualizada
- Renderizar o formulário de captura em steps `optin`
- Submissão cria lead/submission via Supabase
- Feedback visual de sucesso após submissão

## Ficheiros a Alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/funnels/FunnelStepEditor.tsx` | Adicionar campo de imagem (URL + upload + IA), tab de formulário para optin |
| `src/pages/PublicFunnelPage.tsx` | Renderizar formulário de captura em steps optin, lógica de submissão |
| `supabase/functions/ai-funnel-content/index.ts` | Opcionalmente gerar sugestões de campos de formulário |

## Detalhes Técnicos

**Estrutura do content do step (expandida):**
```typescript
{
  headline: string,
  subheadline: string,
  body: string,
  cta_text: string,
  cta_color: string,
  image_url: string,        // NOVO
  form_fields: [             // NOVO (apenas optin)
    { id: string, label: string, type: "text"|"email"|"phone"|"select", required: boolean, placeholder?: string }
  ],
  design: AppearanceValues
}
```

**Submissão pública:** Insere na tabela `form_submissions` ou directamente na tabela `leads` com os dados captados, associando ao `funnel_id` e `step_id`.
