

# Adicionar seleção de template ao criar eBook (Wizard IA e Do Zero)

## Problema
Atualmente, ao escolher "Assistente IA" ou "Do Zero", o utilizador não pode escolher um template visual. A seleção de template só está disponível como opção separada na galeria.

## Solução

### 1. Criar componente `TemplatePickerStep`
`src/components/ebooks/templates/TemplatePickerStep.tsx`

Componente reutilizável que mostra uma mini-galeria inline de templates com:
- Grid compacto de TemplateCards (os 9 templates)
- Filtro rápido por família (Minimal / Editorial / Corporate)
- Opção "Sem template" para continuar sem template
- Template selecionado highlighted
- Usado tanto no Wizard como no fluxo "Do Zero"

### 2. Modificar `EbookWizard.tsx`
- Adicionar **Step 0** (novo primeiro passo): "Template" — usando `TemplatePickerStep`
- Steps passam de 3 para 4: **Template → Conteúdo → Tema → Imagens**
- Guardar `selectedTemplateId` no estado
- Ao criar o eBook (`handleGenerate`), se um template foi escolhido:
  - Buscar `style_tokens` e `page_layouts` do template
  - Passar `template_id` e `global_styles` ao criar o eBook via `useCreateEbook`
  - Criar `ebook_pages` com base nos layouts do template

### 3. Modificar fluxo "Do Zero" no `EbooksPage.tsx`
- Ao clicar "Do Zero", em vez de não fazer nada (bug atual), abrir um modal/step com `TemplatePickerStep`
- Após escolher (ou skip), criar eBook em branco com ou sem template
- Redirecionar para o editor

### 4. Atualizar `useCreateEbook` no `useEbooks.ts`
- Aceitar `template_id` e `global_styles` opcionais no input
- Incluir esses campos no INSERT

### Ficheiros a modificar/criar:
| Ficheiro | Ação |
|---|---|
| `src/components/ebooks/templates/TemplatePickerStep.tsx` | **Criar** — mini-galeria de seleção |
| `src/components/ebooks/EbookWizard.tsx` | **Modificar** — adicionar step de template |
| `src/pages/EbooksPage.tsx` | **Modificar** — fluxo "Do Zero" com picker |
| `src/hooks/useEbooks.ts` | **Modificar** — suportar template_id/global_styles |

