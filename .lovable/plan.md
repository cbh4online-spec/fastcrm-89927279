

## Plano: Enriquecer dados ao adicionar leads da Pesquisa Web

### Problema
Ao clicar "+ Adicionar" na Pesquisa Web, apenas o título é guardado como nome do lead. O website, descrição e outros dados disponíveis nos resultados são ignorados.

### Solução

**1. Capturar mais dados do Firecrawl** (`WebSearchProspecting.tsx`)
- Adicionar `scrapeOptions: { formats: ['markdown'] }` à pesquisa para obter conteúdo completo das páginas
- Extrair do markdown: nome limpo da empresa, email, telefone, morada (quando disponíveis)
- Guardar o `markdown` no state para uso posterior

**2. Preencher o lead com todos os dados disponíveis** (`handleAddToLeads`)
- `name` → título do resultado (limpo)
- `website` → URL do resultado
- `about` → descrição do resultado (snippet)
- `notes` → conteúdo markdown resumido (primeiros ~500 chars)
- `lead_type` → `"company"` (pesquisa web é maioritariamente empresas)
- `source` → `"web_search"`

**3. Enriquecimento extra com IA (opcional, pós-adição)**
- Após criar o lead, usar o conteúdo markdown para extrair via IA (Gemini Flash):
  - `industry` (sector de atividade)
  - `city` / `address`
  - `phone` / `email` (se visíveis na página)
  - `company_name` (nome oficial vs título SEO)
- Atualizar o lead automaticamente com os dados extraídos (fire-and-forget)

**4. Melhorar UX dos resultados**
- Mostrar badge com tipo de conteúdo encontrado (website, LinkedIn, diretório)
- Indicador visual de que o lead será enriquecido ao adicionar
- Após adicionar, mostrar brevemente os campos preenchidos (toast detalhado)

### Ficheiros a editar
- `src/pages/WebSearchProspecting.tsx` — lógica de pesquisa e adição
- `supabase/functions/web-search-enrich/index.ts` — nova edge function para extração IA do markdown

### Sem alterações de base de dados
Todos os campos necessários (`website`, `about`, `notes`, `industry`, `city`, `phone`, `email`) já existem na tabela `leads`.

