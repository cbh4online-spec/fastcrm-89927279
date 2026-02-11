

# Adicionar Modulos IA ao Marketplace

## Resumo

Atualmente o Marketplace tem apenas 1 modulo na categoria "ai" (AI Sales Coach). O sistema ja tem varias funcionalidades IA construidas (Copilot, Assistentes IA, Motor Conversacional, Perfis IA, Base de Conhecimento, Sugestoes IA, etc.) mas nao estao representadas como modulos instaláveis. Vamos adicionar 7 novos modulos IA ao catalogo.

## Novos Modulos IA

| Modulo | Slug | Descricao | Preco |
|---|---|---|---|
| **AI Copilot** | `ai-copilot` | Classificacao de intencoes, sugestoes de resposta, resumos de conversa e proximas acoes | 59EUR/mes |
| **AI Assistants** | `ai-assistants` | Agentes IA multi-canal (WhatsApp, Widget, Instagram) com personas e bases de conhecimento | 99EUR/mes |
| **Conversational Engine** | `conversational-engine` | Motor conversacional com perfis Vibe, regras de conversa, objetivos e autopilot | 79EUR/mes |
| **AI Profiles** | `ai-profiles` | Personas IA personalizaveis com tom de voz, estilo e comportamento configuravel | 39EUR/mes |
| **Knowledge Base AI** | `knowledge-base` | Base de conhecimento inteligente para alimentar agentes IA com documentos e FAQs | 49EUR/mes |
| **AI Suggestions** | `ai-suggestions` | Sugestoes inteligentes em tempo real para campos, acoes e decisoes no CRM | 29EUR/mes |
| **AI Document OCR** | `ai-document-ocr` | Extracao automatica de dados de documentos (faturas, contratos, IDs) com IA | 69EUR/mes |

## Seccao Tecnica

### 1. Ficheiro: `src/types/marketplace.ts`

Adicionar 7 novas entradas ao array `SAMPLE_MODULES` com a estrutura completa `MarketplaceModule`, todos com:
- `category: "ai"`
- `internal_type: "ai_service"` ou `"native_feature"`
- `is_new: true`, `is_featured: false` (exceto AI Assistants que sera featured)
- Permissoes apropriadas por modulo
- Trial de 14 dias

### 2. Ficheiro: `src/types/marketplace.ts` (tambem)

Inserir registos correspondentes na tabela `marketplace_modules` da base de dados via migracao SQL para que os slugs fiquem disponiveis para o sistema de instalacao.

### 3. Migracao SQL

Inserir os 7 novos modulos na tabela `marketplace_modules` com os slugs corretos para sincronizar com o `SAMPLE_MODULES`.

### Resumo de Ficheiros

| Ficheiro | Alteracao |
|---|---|
| `src/types/marketplace.ts` | Adicionar 7 novos modulos IA ao array SAMPLE_MODULES |
| Migracao SQL | Inserir 7 registos na tabela marketplace_modules |
