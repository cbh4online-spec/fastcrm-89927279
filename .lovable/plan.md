

## Fix: Autopilot Nao Responde a Perguntas sobre Produtos

### Problemas Identificados (3 causas raiz)

**1. Modelo de embeddings nao suportado**
O `ai-inbox-reply` tenta usar `text-embedding-ada-002` para pesquisa semantica, mas o Lovable AI Gateway nao suporta modelos de embedding -- apenas modelos de chat. O erro nos logs:
```
invalid model: text-embedding-ada-002, allowed models: [openai/gpt-5-mini ...]
```
Resultado: A pesquisa semantica falha SEMPRE e cai no fallback de texto.

**2. Entradas de conhecimento estao em "draft"**
A entrada que responde a "Tem modulo de proposta?" (ID `77cee4f7`) esta com `status: draft`. O fallback de texto filtra por `status = 'validated'`, por isso nunca encontra o conteudo relevante. Resultado: 0 entradas encontradas.

**3. Sem conhecimento = respostas genericas**
Com 0 entradas de KB, a IA so tem as perguntas de qualificacao do `goal_config` e responde de forma vaga em vez de dar informacao concreta sobre o produto.

---

### Correcao (3 partes)

#### 1. Substituir embedding por pesquisa AI-powered

**Ficheiro**: `supabase/functions/ai-inbox-reply/index.ts` (funcao `fetchKnowledgeContext`)

Remover a chamada a `text-embedding-ada-002` (que nunca funciona). Em substituicao, usar duas estrategias de pesquisa:

- **Pesquisa por texto (ILIKE)**: Melhorar a extracao de keywords da query para captar termos relevantes como "proposta", "modulo", etc. Usar palavras individuais em OR em vez de concatenar com AND.
- **Pesquisa por titulo/question match**: Adicionar busca directa por correspondencia de titulo e question, que sao campos curtos e bem definidos.

Manter o threshold de similaridade como 0.7 para resultados de texto.

#### 2. Validar as entradas de Knowledge Base

**Migracao DB**: Atualizar as entradas em estado `draft` para `validated` no workspace de producao, para que fiquem disponiveis para o autopilot:

```sql
UPDATE knowledge_entries 
SET status = 'validated' 
WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f' 
  AND status = 'draft';
```

Isto inclui a entrada critica "Quais sao os modulos core do FastCRM?" que contem a resposta sobre propostas.

#### 3. Melhorar o fallback de pesquisa textual

**Ficheiro**: `supabase/functions/ai-inbox-reply/index.ts` (funcao `fetchKnowledgeContext`, seccao text fallback)

A pesquisa textual atual concatena keywords com `%` (`%vamos%testar%novo%`), o que e ineficaz. Alterar para:
- Extrair palavras significativas (>3 chars, excluir stopwords como "tem", "de", "o", "que")
- Fazer OR entre cada keyword individual: `title.ilike.%proposta%,question.ilike.%proposta%,content.ilike.%proposta%`
- Adicionar tambem busca por `title.ilike.%modulo%` etc.

### Detalhe Tecnico

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/ai-inbox-reply/index.ts` | Remover chamada a embedding API; melhorar text search com keywords individuais e stopwords |
| DB migration | `UPDATE knowledge_entries SET status = 'validated'` para entradas draft |

### Resultado Esperado

Quando o Jorge pergunta "Tem modulo de proposta?":
1. A pesquisa textual extrai "modulo" e "proposta" como keywords
2. Encontra a entrada "Quais sao os modulos core do FastCRM?" (agora validated)
3. A IA responde com: "Sim, temos! O modulo de Vendas & Faturacao inclui Propostas, faturas e catalogo..." e guia para o proximo passo comercial
