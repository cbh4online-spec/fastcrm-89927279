

# Bio OS -- Imagens com contexto da vertical/pagina

## Problema
O prompt de geracao de imagens e generico ("abstract, colorful, gradient tones"), ignorando o conteudo real da pagina/vertical. As imagens geradas nao transmitem o contexto do negocio.

## Solucao
Melhorar os prompts de imagem para incluir o contexto extraido da pagina (meta tags) e o copy gerado pela IA, criando imagens tematicas e relevantes.

## Detalhes Tecnicos

### Ficheiro a editar: `supabase/functions/bio-smart-link/index.ts`

**Linha 114 -- Melhorar o prompt de imagem:**

Substituir o prompt generico por um que inclua:
- O titulo e descricao extraidos da pagina (`meta.title`, `meta.description`)
- O copy gerado (`copy.title`, `copy.subtitle`)
- O URL para inferir contexto do sector
- Instrucoes para criar uma imagem que represente visualmente o conteudo real

Prompt actual:
```
Create a modern, visually stunning background image for a "link in bio" card about: "${copy.title} - ${copy.subtitle}". The image should be abstract, colorful, with gradient tones. Professional quality, suitable as a card background. No text in the image.
```

Novo prompt:
```
Create a professional background image that visually represents this business/page:
Page: ${meta.title}
Description: ${meta.description}
Theme: ${copy.title} - ${copy.subtitle}
URL context: ${url}

The image must:
- Visually communicate the industry/niche of this page (e.g. food for restaurants, tech for software, beauty for salons)
- Use a modern, premium aesthetic with subtle depth
- Work as a background with text overlay (slightly dark/blurred areas)
- NO text, NO logos, NO watermarks
- Photorealistic or high-quality illustration style
- Convey the emotion and value proposition of the page
```

### Ficheiro a editar: `supabase/functions/bio-generate-image/index.ts`

O prompt do utilizador ja e passado directamente (o user escreve o que quer), por isso nao precisa de alteracao. Mas podemos enriquecer com um system-level prefix para garantir qualidade:
- Adicionar instrucoes de contexto antes do prompt do utilizador (ex: "Professional quality, suitable as background for a link-in-bio page. No text in image.")

### Resumo de alteracoes:
- `supabase/functions/bio-smart-link/index.ts` -- Reescrever prompt de imagem com contexto da pagina
- `supabase/functions/bio-generate-image/index.ts` -- Adicionar prefixo de qualidade ao prompt

