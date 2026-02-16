

# Bio OS -- Redesign Visual "Bento Cards" Premium

## Contexto
As imagens de referencia mostram paginas bio estilo "bento cards" com:
- Cards com fundos gradiente coloridos (verdes, roxos, dourados)
- Tipografia bold e decorativa com tamanhos grandes
- Cantos muito arredondados (rounded-2xl/3xl)
- Cada card e visualmente distinto e rico
- Layout mobile-first em stack vertical
- Botoes de CTA integrados dentro de cada card
- Sombras suaves e profundidade visual

O estado actual e muito basico: bordas simples, texto pequeno, sem gradientes nem riqueza visual.

## Mudancas Principais

### 1. Novo componente `BioBlockPreviewCard`
Criar um componente dedicado para renderizar cada bloco com o estilo "bento card":
- Cards com `rounded-2xl`, padding generoso, gradientes de fundo baseados na cor primaria
- Tipografia grande e bold para titulos
- Subtitulos em tamanho medio
- Botoes de CTA estilizados dentro dos cards (pill-shaped, com icone)
- Sombras suaves (`shadow-lg`) e efeitos de hover subtis

### 2. Sistema de gradientes por bloco
Cada bloco tera um gradiente de fundo gerado a partir da cor primaria:
- Variacoes automaticas (mais claro, mais escuro, complementar)
- Opacidades diferentes para criar variedade visual entre cards
- Suporte para imagens de fundo com overlay gradiente

### 3. Actualizar `BioBlockEditor.tsx`
- Substituir a funcao `BlockPreview` actual pelo novo componente visual
- O preview no builder passa a mostrar os cards com o mesmo estilo premium
- Manter a funcionalidade de seleccao/edicao intacta

### 4. Novos block types visuais
Expandir os tipos de bloco disponiveis para suportar o estilo "bento":
- Tipo `hero`: card grande com titulo bold, subtitulo e CTA
- Tipo `feature`: card medio com titulo decorativo e descricao
- Propriedade `gradient_style` no content de cada bloco (direcao e intensidade do gradiente)
- Propriedade `card_size` (small, medium, large) para variar a altura dos cards

### 5. Preview melhorado no builder
- Frame do telefone mais realista (notch, bordas arredondadas)
- Background escuro atras do telefone para destacar as cores
- Scroll area interna para simular a experiencia real

---

## Detalhes Tecnicos

### Ficheiros a criar:
- `src/components/bio/BioBlockPreviewCard.tsx` -- Componente visual principal para renderizar blocos estilo bento

### Ficheiros a editar:
- `src/components/bio/BioBlockEditor.tsx` -- Integrar o novo componente no preview e adicionar novos block types (hero, feature)
- `src/hooks/useBioBlocks.ts` -- Adicionar "hero" e "feature" aos tipos exportados

### Logica do gradiente:
```text
primaryColor -> HSL decomposition
  card 1: linear-gradient(135deg, primary, primary-dark)
  card 2: linear-gradient(180deg, primary-light/80, primary/60)
  card 3: linear-gradient(45deg, primary, complementary)
```

Cada bloco tera um `variant` index (0-4) que roda automaticamente para criar variedade visual.

### Propriedades novas no content dos blocos:
- `title` (string): Titulo grande e bold
- `subtitle` (string): Texto complementar
- `cta_text` (string): Texto do botao CTA
- `cta_url` (string): URL do CTA
- `bg_image` (string): URL de imagem de fundo opcional
- `gradient_variant` (number): Variante de gradiente (0-4)

### Nenhuma alteracao de backend
- A estrutura `bio_blocks` ja suporta `content` como JSONB, por isso os novos campos sao retrocompativeis
- A edge function `bio-ai-builder` pode ser actualizada posteriormente para gerar blocos neste novo formato

