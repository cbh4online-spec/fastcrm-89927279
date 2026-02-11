
# Assistente IA para Criacao de Anuncios C2C + Sistema CPC de Destaque

## Resumo

Transformar a pagina "Criar Anuncio" num assistente inteligente que ajuda vendedores a criar anuncios otimizados para venda rapida, com IA para melhorar imagens/fotos, gerar titulos e descricoes com hashtags, sugerir precos competitivos e categorias. Adicionalmente, substituir o modelo de destaque fixo por um sistema de leiloes CPC (custo por clique) inspirado no KuantoKusta.

## Funcionalidades IA no Formulario

### 1. Botao "Assistente IA" apos upload de foto
- Analisa a foto com IA (google/gemini-2.5-flash vision) para identificar o produto
- Auto-preenche titulo, descricao, categoria, condicao e preco sugerido
- Se nao houver foto, funciona com base no titulo escrito manualmente

### 2. Melhoria de Imagens com IA
- Botao "Melhorar foto" em cada imagem carregada
- Usa o modelo de imagem (google/gemini-2.5-flash-image) para otimizar brilho, contraste e fundo
- Gera fundo branco/limpo profissional para fotos de produto

### 3. Geracao de Titulo Otimizado
- Botao sparkle ao lado do campo titulo
- Gera titulo SEO-friendly com marca, modelo, caracteristicas-chave
- Estilo marketplace (ex: "iPhone 14 Pro Max 256GB - Desbloqueado, Bateria 95%, Com Capa")

### 4. Geracao de Descricao com Hashtags
- Botao sparkle ao lado da descricao
- Gera descricao estruturada com emojis, beneficios e hashtags
- Inclui secoes: estado, o que inclui, motivo de venda
- Adiciona hashtags relevantes no final (#iPhone #Apple #Smartphone #Usado)

### 5. Sugestao de Preco Competitivo
- Botao ao lado do preco que pesquisa precos de mercado
- Mostra range min-max e sugere preco competitivo
- Indica se o preco escolhido esta "Abaixo do mercado", "Competitivo" ou "Acima do mercado"

### 6. Sugestao de Categoria
- Auto-seleciona a categoria mais adequada baseada no titulo/descricao

### 7. Opcao de Destaque CPC no Formulario
- Nova seccao "Impulsionar Anuncio" antes do botao publicar
- Switch para ativar destaque pago
- Campo de lance CPC (custo por clique) com valor minimo (ex: 0.05EUR)
- Orcamento diario maximo configuravel
- Preview de estimativa: "Com 0.10EUR/clique e 5EUR/dia, estima-se ~50 cliques/dia"
- O anuncio e publicado ja com o destaque configurado

## Seccao Tecnica

### Nova Edge Function: `ai-c2c-listing-assistant`

Edge function dedicada ao assistente de criacao de anuncios C2C com os seguintes modos:
- `analyze-photo`: Recebe imagem base64, identifica produto, retorna titulo/descricao/preco/categoria sugeridos
- `enhance-photo`: Recebe imagem base64, melhora qualidade e retorna imagem otimizada
- `generate-title`: Com base no contexto (foto, descricao parcial), gera titulo otimizado
- `generate-description`: Gera descricao completa com hashtags e estrutura
- `suggest-price`: Pesquisa precos de mercado para o produto identificado
- `suggest-category`: Sugere a melhor categoria das existentes

### Migracao SQL

Adicionar campos de CPC a tabela `c2c_listings`:
- `cpc_bid` (numeric, nullable) - Lance por clique em EUR
- `cpc_daily_budget` (numeric, nullable) - Orcamento diario maximo
- `cpc_is_active` (boolean, default false) - Se o destaque CPC esta ativo
- `cpc_total_spent` (numeric, default 0) - Total gasto em CPC
- `cpc_clicks` (integer, default 0) - Cliques pagos recebidos

### Ficheiros a Criar/Modificar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ai-c2c-listing-assistant/index.ts` | Nova edge function com todos os modos IA |
| `src/pages/c2c/C2CCreateListing.tsx` | Redesenhar formulario com botoes IA, preview de sugestoes, seccao CPC |
| `src/hooks/useC2CListingAI.ts` | Novo hook com mutations para cada modo da edge function |
| Migracao SQL | Adicionar campos CPC a tabela c2c_listings |

### Detalhes da UI

O formulario tera:
- Zona de fotos com botao "Melhorar" por foto e botao global "Analisar com IA"
- Cada campo de texto (titulo, descricao) tera um icone sparkle que gera conteudo IA
- Campo preco tera badge colorido indicando competitividade
- Card colapsavel "Impulsionar com CPC" com configuracao de lance e orcamento
- Barra de progresso visual mostrando preenchimento do anuncio (fotos, titulo, descricao, preco)
