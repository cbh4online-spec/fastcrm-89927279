
# Adicionar geracao IA ao bloco WhatsApp

## Objectivo
Adicionar um botao "Gerar com IA" no editor do bloco WhatsApp que gera automaticamente o texto do botao e a mensagem pre-definida com base no contexto da pagina bio (nome, vertical, objectivo).

## Alteracoes

### 1. Edge Function: `supabase/functions/bio-whatsapp-copy/index.ts` (novo)
- Recebe: `pageName`, `vertical` (ou descricao da pagina), `tone`
- Usa Lovable AI (Gemini 3 Flash) para gerar:
  - `text`: texto do botao WhatsApp (ex: "Fale connosco", "Marcar consulta")
  - `message`: mensagem pre-definida persuasiva (ex: "Ola! Vi a vossa pagina e gostava de saber mais sobre...")
- Usa tool calling para structured output
- Trata erros 429/402

### 2. Registar no `supabase/config.toml`
```toml
[functions.bio-whatsapp-copy]
verify_jwt = false
```

### 3. Actualizar `src/components/bio/BioBlockEditor.tsx`
- No case `"whatsapp"` do `renderBlockEditor`, adicionar um botao com icone Sparkles acima dos campos
- Ao clicar, chama a edge function com contexto da pagina
- Preenche automaticamente os campos `text` e `message` via `onUpdate`
- Estado de loading com spinner animado

### Fluxo
1. Utilizador selecciona bloco WhatsApp
2. Clica em "Gerar com IA"
3. Edge function gera texto do botao + mensagem personalizada
4. Campos sao preenchidos automaticamente
5. Utilizador pode editar manualmente depois
