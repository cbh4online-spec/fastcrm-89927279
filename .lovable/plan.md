

# Geracao Automatica com IA de Conteudo AIDA

## Objetivo

Adicionar um botao "Gerar com IA" no builder de templates verticais que, a partir apenas do nome da area de negocio (ex: "Restaurantes"), gera automaticamente todo o conteudo AIDA: dor principal, resultado prometido, 4 dores, 6 modulos, 4 antes/4 depois, ROI, CTAs, persona AI e SEO.

## Como funciona

1. O utilizador escreve o nome da vertical (ex: "Ginasios") no campo "Nome da Vertical"
2. Clica no botao "Gerar com IA" que aparece ao lado
3. O sistema chama uma edge function que usa o Lovable AI (Gemini Flash) com tool calling para gerar toda a estrutura
4. O formulario e preenchido automaticamente com o conteudo gerado
5. O utilizador pode editar qualquer campo antes de guardar

## Plano Tecnico

### 1. Edge Function: `generate-vertical-template`

Nova edge function que recebe `{ nome: string }` e retorna toda a estrutura do template.

- Modelo: `google/gemini-3-flash-preview` (rapido e eficiente para este caso)
- Utiliza tool calling para garantir output estruturado (sem parsing JSON manual)
- System prompt em portugues, focado no metodo AIDA e no contexto FastCRM
- Tool schema com todos os campos do `VerticalConfig`

Estrutura da tool:

```text
generate_vertical_template({
  dor_principal: string,
  resultado_prometido: string,
  dores: string[4],
  modulos_ativos: [{nome, desc, icon}][6],
  antes_depois: {antes: string[4], depois: string[4]},
  roi_exemplo: {clientes_extra, valor_medio, periodo},
  cta_principal: string,
  cta_secundario: string,
  ai_persona_nome: string,
  seo: {title, description}
})
```

### 2. Actualizar `VerticalTemplateBuilder.tsx`

- Adicionar botao "Gerar com IA" ao lado do campo "Nome da Vertical" (tab Identidade)
- Estado de loading durante a geracao
- Ao receber resposta, preenche todos os campos do formulario
- Manter slug auto-gerado a partir do nome
- Toast de sucesso/erro

### 3. Actualizar `supabase/functions/deno.json` (se necessario)

Registar a nova edge function.

### Ficheiros a criar

- `supabase/functions/generate-vertical-template/index.ts`

### Ficheiros a editar

- `src/components/landing-pages/VerticalTemplateBuilder.tsx` -- botao "Gerar com IA" + logica de chamada

### Sequencia

1. Criar edge function `generate-vertical-template`
2. Adicionar botao e logica de IA no builder
3. Deploy e teste

