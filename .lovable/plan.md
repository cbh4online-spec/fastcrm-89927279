
# AI Bio Builder -- Wizard + Edge Function

## Resumo

Criar um wizard de IA integrado no Bio OS que, atraves de 4-5 perguntas simples, gera automaticamente uma pagina Bio completa com blocos, copy e estrutura optimizada. O wizard aparece como opcao ao criar uma nova pagina ("Criar com IA").

## Como funciona

1. O utilizador clica em "Criar com IA" no Bio OS
2. Um dialog wizard faz 4 perguntas:
   - **Vertical/Nicho** (ex: consultoria, fitness, imobiliario, tecnologia)
   - **Objetivo** (captar leads, vender produto, agendar reuniao, portfolio)
   - **Oferta principal** (texto livre -- o que vende/oferece)
   - **Tom de comunicacao** (formal, casual, energetico, elegante)
3. A IA gera a estrutura da pagina: nome, slug, cor, e lista de blocos com copy AIDA
4. A pagina e os blocos sao criados automaticamente na base de dados
5. O utilizador e levado directamente ao builder para personalizar

---

## Fase 1: Edge Function `bio-ai-builder`

**Ficheiro**: `supabase/functions/bio-ai-builder/index.ts`

- Recebe: `{ vertical, objective, offer, tone }`
- Chama Lovable AI (Gemini 3 Flash Preview) com tool calling para retornar estrutura
- Retorna JSON estruturado:
  ```json
  {
    "pageName": "Jorge Cardoso Digital",
    "slug": "jorge-cardoso-digital",
    "primaryColor": "#6366f1",
    "blocks": [
      { "type": "text", "content": { "text": "Headline AIDA..." } },
      { "type": "button", "content": { "text": "Agendar Reuniao", "url": "#" } },
      { "type": "link", "content": { "text": "Ver Portfolio", "url": "#" } },
      { "type": "social", "content": { "instagram": "", "linkedin": "" } },
      { "type": "divider", "content": { "style": "line" } }
    ]
  }
  ```
- Usa tool calling (function calling) para garantir output estruturado
- Trata erros 429 (rate limit) e 402 (credits)

**Config**: Adicionar `[functions.bio-ai-builder]` com `verify_jwt = false` ao `supabase/config.toml`

---

## Fase 2: Wizard UI

**Ficheiro**: `src/components/bio/BioAIWizard.tsx` (NOVO)

- Dialog multi-step com 4 etapas
- Cada etapa tem opcoes pre-definidas clicaveis + campo "Outro"
- Botao "Gerar com IA" no final
- Estado de loading com animacao
- Ao receber resposta, cria a pagina (`useCreateBioPage`) e insere os blocos (`useCreateBioBlock` em sequencia)
- Redireciona para o builder da pagina criada

---

## Fase 3: Integracao no BioOS.tsx

- Adicionar botao "Criar com IA" (icone Sparkles) ao lado do botao "Nova Pagina"
- O botao abre o `BioAIWizard`
- Ao concluir, navega para o builder da pagina criada (setSelectedPageId)

---

## Ficheiros a Criar/Editar

| Ficheiro | Accao |
|----------|-------|
| `supabase/functions/bio-ai-builder/index.ts` | Criar edge function |
| `src/components/bio/BioAIWizard.tsx` | Criar wizard UI |
| `src/pages/BioOS.tsx` | Adicionar botao "Criar com IA" |

## Detalhes Tecnicos

- **Modelo IA**: `google/gemini-3-flash-preview` via Lovable AI gateway
- **API Key**: `LOVABLE_API_KEY` (pre-configurada, sem accao do utilizador)
- **Tool calling**: funcao `generate_bio_page` com schema rigoroso para garantir output valido
- **Prompt**: instrucoes para gerar copy AIDA curto, estrutura optimizada para conversao, entre 5-8 blocos
- **Seguranca**: CORS headers, tratamento de erros 429/402, nao expor secrets no client
