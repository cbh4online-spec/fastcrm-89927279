

# AI Autofill para Atributos (estilo Attio)

## Status: ✅ Implementado

## O que foi feito

1. **Tipos** — Adicionados `ai_autofill_enabled`, `ai_autofill_type`, `ai_autofill_guidance` ao `FormattingConfig`
2. **Componente `AIAutofillConfig.tsx`** — Toggle, select de tipo, textarea com variáveis, nota informativa
3. **Diálogos** — Tab "IA" adicionada ao `CreateFieldDialog` e `EditFieldDialog`
4. **Edge function `ai-autofill-field`** — Chama Lovable AI Gateway com prompt baseado no tipo e orientação
5. **Hook `useAIAutofillField`** — Mutation para invocar a edge function nos formulários
