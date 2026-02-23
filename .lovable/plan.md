

# Corrigir e Enriquecer Templates Premium do Bio OS

## Problema Identificado

Os templates parecem "vazios" no preview por duas razoes:

1. **Campos com nomes errados**: Os templates usam `buttonText` e `buttonUrl` mas o sistema espera `cta_text` e `cta_url`. O CTA do hero nunca aparece no preview.
2. **Testimonials mal formatados**: Os templates enviam `testimonials[]` (array) mas o preview le `content.text` e `content.author` (campos simples). O depoimento nunca aparece.
3. **Poucos blocos visuais**: Faltam blocos de FAQ, imagem e mais features para dar "corpo" a pagina.

## Solucao

### 1. Corrigir campos dos templates (`BioTemplateGallery.tsx`)

Para todos os 12 templates:
- Substituir `buttonText` por `cta_text` e `buttonUrl` por `cta_url` nos blocos hero
- Converter blocos `testimonials` de array para blocos individuais com `text` e `author`
- Adicionar mais blocos por template (12-15 cada) incluindo:
  - Segundo bloco de texto motivacional / prova social
  - Bloco FAQ com pergunta/resposta
  - Mais features com subtitulos detalhados
  - Bloco de imagem placeholder
  - Segundo botao CTA no final

### 2. Melhorar o preview de testimonials (`BioBlockPreviewCard.tsx`)

- Actualizar o renderer `testimonials` para suportar AMBOS os formatos:
  - Formato antigo: `content.text` + `content.author` (campo simples)
  - Formato novo: `content.testimonials[]` (array com `name` e `text`)
- Mostrar multiplos testemunhos se existir array (ate 3)
- Adicionar estrelas visuais ao preview

### 3. Estrutura enriquecida de cada template (exemplo Coach Fitness)

| # | Tipo | Conteudo |
|---|---|---|
| 1 | hero | Titulo + Subtitulo + CTA (com `cta_text`/`cta_url`) |
| 2 | feature | Treino Personalizado (com subtitulo detalhado + CTA) |
| 3 | feature | Acompanhamento Semanal |
| 4 | feature | Plano Nutricional |
| 5 | feature | App de Treino (novo) |
| 6 | text | Citacao motivacional |
| 7 | button | "Marcar Avaliacao Gratuita" |
| 8 | testimonials | Testemunho 1 (text + author) |
| 9 | testimonials | Testemunho 2 (text + author) |
| 10 | testimonials | Testemunho 3 (text + author) |
| 11 | text | Prova social / numeros |
| 12 | button | "Comecar Hoje — Condicoes Especiais" |
| 13 | divider | Separador |
| 14 | whatsapp | Contacto WhatsApp |
| 15 | social | Redes sociais |

Todos os 12 templates seguirao esta estrutura mais rica (14-15 blocos cada).

### 4. Melhorias adicionais nos blocos

- Features com `cta_text` preenchido (ex: "Saber Mais", "Ver Detalhes") para os CTAs aparecerem no preview
- Cada template tera 3 testimonials individuais em vez de 1 bloco com array
- Textos mais longos e detalhados nos subtitulos das features
- Segundo bloco de texto com numeros/metricas (prova social)

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| `src/components/bio/BioTemplateGallery.tsx` | Corrigir nomes dos campos, adicionar mais blocos, enriquecer conteudo |
| `src/components/bio/BioBlockPreviewCard.tsx` | Melhorar renderer de testimonials para suportar ambos formatos e mostrar estrelas |

## Resultado esperado

- Hero com CTA visivel no preview (botao "Comecar Agora" aparece)
- Testemunhos com texto e autor visiveis
- Features com sub-CTAs visiveis
- 14-15 blocos por template em vez de 10
- Pagina com aspecto completo e profissional ao ser criada
