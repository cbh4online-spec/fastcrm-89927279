

# eBook Editor — Funcionalidades inspiradas no Gamma

## Contexto
O Gamma usa um fluxo "prompt → geração completa" com controlo visual rico. O editor atual do FastCRM é capítulo-a-capítulo manual. Estas ideias trazem o melhor do Gamma para o nosso contexto de eBooks.

---

## 1. Wizard de Criação Rápida (novo fluxo)

**Conceito**: Antes de entrar no editor, o utilizador passa por um wizard de 3 passos que gera o eBook inteiro automaticamente.

### Passo 1 — Prompt & Configuração
- Campo de texto livre: "Sobre o que é o seu eBook?"
- Seletor de **número de capítulos** (3-15) com botões -/+
- **Modo de conteúdo**: Gerar (cria tudo) · Estruturar (só títulos e tópicos) · Importar (colar texto existente)
- **Tom/Idioma**: Profissional, Educativo, Informal, Storytelling
- Mostrar custo total estimado em créditos

### Passo 2 — Tema Visual
- Grid de **temas pré-definidos** (como no Gamma): Moderno Escuro, Corporativo Claro, Gradiente Colorido, Minimalista
- Cada tema define: cores, tipografia, estilo de capa
- Preview miniatura ao vivo

### Passo 3 — Estilo de Imagens IA
- Seletor de **estilo artístico** com thumbnails: Ilustração, Fotografia, Abstrato, 3D, Flat Design
- **Palavras-chave extras** para consistência visual (tags clicáveis: "vibrante", "minimalista", "limpo", "geométrico")
- Opção de carregar **imagem de referência** para guiar o estilo
- Toggle "Gerar imagens para cada capítulo" (on/off)

**Ação final**: Botão "✨ Gerar eBook" → gera título, subtítulo, todos os capítulos, capa e imagens de capítulo numa só operação (com progress bar).

---

## 2. Melhorias no Editor Existente

### Barra de ações de conteúdo (inspirada nos modos Gerar/Condensar/Preservar do Gamma)
- No editor de capítulo, adicionar toolbar com 3 modos:
  - **Gerar** — criar conteúdo do zero (já existe)
  - **Condensar** — reduzir texto existente mantendo pontos-chave (nova ação IA)
  - **Expandir** — aumentar e enriquecer texto curto (nova ação IA)

### Painel de configurações visuais no sidebar
- Secção colapsável "Visuais" abaixo da lista de capítulos
- Seletor de tema visual (aplica ao flipbook reader)
- Estilo de imagem IA preferido (persiste no eBook para futuras gerações)

### Indicador de créditos
- Badge permanente no canto inferior com saldo de créditos atual (como o Gamma mostra "137 créditos")

---

## 3. Geração em Lote

- Botão "Gerar todos os capítulos vazios" que itera pelos capítulos sem conteúdo e gera sequencialmente
- Progress indicator mostrando capítulo atual / total
- Custo total estimado antes de confirmar

---

## Alterações técnicas

### Novos ficheiros
- `src/components/ebooks/EbookWizard.tsx` — wizard de 3 passos
- `src/components/ebooks/EbookThemeSelector.tsx` — grid de temas
- `src/components/ebooks/EbookImageStylePicker.tsx` — seletor de estilos artísticos

### Ficheiros editados
- `src/components/ebooks/EbookEditor.tsx` — adicionar toolbar Gerar/Condensar/Expandir, painel de visuais, geração em lote
- `src/components/ebooks/EbooksList.tsx` — integrar wizard no fluxo de criação
- Edge function `ebook-ai-assist` — adicionar ações `condense_content`, `expand_content`, `generate_full_ebook`

### Migration SQL
- Adicionar colunas ao `ebooks`: `theme` (text), `image_style` (text), `image_keywords` (text[])
- Novas pricing rules: `ebook_condense_content` (2 créditos), `ebook_expand_content` (2 créditos), `ebook_generate_full` (15 créditos)

### Custo estimado em créditos (geração completa com 10 capítulos)
- Estrutura + conteúdo: ~15 créditos (ação única `generate_full`)
- Capa: 5 créditos
- 10 imagens de capítulo: 40 créditos
- **Total**: ~60 créditos

