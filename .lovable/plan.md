
# Plano: Corrigir Respostas AI com Conteúdo Inventado

## Diagnóstico

Após análise detalhada dos logs e dados, identifiquei **3 problemas críticos**:

### Problema 1: Auto-Pilot sem Persona Configurada
A configuração do Auto-Pilot da PHARLISS não tem nenhuma persona associada:
```text
autopilot_config:
  workspace: PHARLISS
  persona_id: NULL  ← PROBLEMA!
```

Sem persona, a IA:
- Não tem instruções específicas do negócio
- Não tem limitações definidas
- Não sabe que base de conhecimento usar
- Inventa respostas genéricas

### Problema 2: Base de Conhecimento Não Está a Ser Usada
```text
[AI-INBOX-REPLY] Found 0 entries via text fallback
```

A PHARLISS tem uma base de conhecimento ("Site") com 12+ entradas validadas sobre tricologia, vendas, etc., mas:
- As personas da PHARLISS têm `knowledge_base_ids: []` (vazio!)
- Sem persona no autopilot → não há filtro de knowledge base
- A IA cai no modo "criativo" e inventa conteúdo

### Problema 3: Contaminação por Histórico de Mensagens
A IA está a usar as suas próprias respostas anteriores (que mencionam "Método PARE") como contexto, propagando informação inventada:
```text
Mensagem 1: "Preciso de saber mais sobre cursos"
Resposta AI (inventada): "Método PARE tem soluções..."
Mensagem 2: (qualquer coisa)
Resposta AI: Continua a falar de "Método PARE"
```

## Impacto

| Problema | Consequência |
|----------|--------------|
| Sem persona | IA sem orientação específica do negócio |
| Knowledge vazio | IA inventa respostas não baseadas em factos |
| Histórico contaminado | Erro propaga-se em todas as mensagens seguintes |

## Solução

### Alteração 1: Validar Configuração do Auto-Pilot
**Ficheiro:** `supabase/functions/ghl-webhook-message/index.ts`

Antes de gerar resposta, verificar se existe persona configurada. Se não existir, usar um prompt de fallback seguro que:
- Identifique o workspace pelo nome
- Use as bases de conhecimento do workspace (não da persona)
- Não invente informação

```text
Lógica:
1. Se autopilot.persona_id != null → usar persona
2. Se autopilot.persona_id == null → buscar knowledge bases do workspace diretamente
3. Se knowledge bases vazias → responder "Vou encaminhar para um colega"
```

### Alteração 2: Forçar Knowledge Base pelo Workspace
**Ficheiro:** `supabase/functions/ai-inbox-reply/index.ts`

Quando não há persona, buscar TODAS as knowledge bases ativas do workspace:

```text
Linha ~170-180: Ajustar lógica

Atual:
  if (persona?.knowledge_base_ids?.length > 0) {
    knowledgeBaseIds = persona.knowledge_base_ids;
  }

Corrigir para garantir fallback:
  // Já está implementado, mas não funciona porque persona é null
  // Adicionar log para debug
```

### Alteração 3: Prompt de Fallback Restritivo
Quando não há knowledge base encontrada, usar prompt muito restritivo:

```text
INSTRUÇÕES DE FALLBACK:
- Sou assistente de [NOME_WORKSPACE]
- NÃO tenho informação específica sobre produtos/serviços
- Posso confirmar receção da mensagem e encaminhar
- NUNCA inventar nomes de produtos, cursos ou serviços
- SEMPRE sugerir contacto humano para detalhes
```

### Alteração 4: Adicionar Logging de Debug
Adicionar logs para verificar:
- Workspace ID usado na query
- Knowledge bases encontradas
- Entradas retornadas
- Persona aplicada (se existir)

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ai-inbox-reply/index.ts` | Adicionar fallback restritivo quando knowledge = 0 |
| `supabase/functions/ghl-webhook-message/index.ts` | Passar nome do workspace para contexto |

## Secção Técnica

### Alterações no ai-inbox-reply/index.ts

```typescript
// Linha ~320-330: Adicionar fallback no buildSystemPrompt
const buildSystemPrompt = (...) => {
  // ... código existente ...
  
  // NOVO: Se não há knowledge E não há persona, usar modo ultra-restritivo
  if ((!knowledgeEntries || knowledgeEntries.length === 0) && !persona) {
    return `Sou assistente virtual.
    
REGRAS ABSOLUTAS:
- NÃO conheço os produtos ou serviços específicos
- NÃO posso dar detalhes sobre cursos, preços ou ofertas
- POSSO confirmar receção da mensagem
- POSSO sugerir aguardar contacto de um colega
- NUNCA inventar nomes de produtos, métodos ou serviços

Responde de forma breve e educada, explicando que vais encaminhar para um colega.`;
  }
  
  // ... resto do código ...
};
```

### Alterações no ghl-webhook-message/index.ts

```typescript
// Linha ~754: Passar workspaceName para ai-inbox-reply
body: JSON.stringify({
  action: "suggest_reply",
  messages: messages.map((m: any) => ({...})),
  leadData,
  channel,
  workspaceId,
  workspaceName, // NOVO: para contextualização
  personaId: autopilotConfig.persona_id,
  useKnowledgeBase: true,
  // ...
})
```

## Teste de Verificação

1. Deploy das alterações
2. Testar com nova conversa (não a contaminada)
3. Enviar mensagem "Olá, quero saber sobre cursos"
4. Verificar logs:
   - `[AI-INBOX-REPLY] No persona, using fallback mode`
   - `[AI-INBOX-REPLY] Knowledge entries: X`
5. Verificar resposta:
   - ✅ Se knowledge > 0: Usa informação da base
   - ✅ Se knowledge = 0: Resposta genérica sem inventar

## Recomendação Adicional

Após a correção, deve:
1. **Configurar a persona do Auto-Pilot da PHARLISS** - associar uma das personas existentes (IA de Vendas, IA Clínica, etc.)
2. **Associar a knowledge base "Site" às personas** - editar as personas e adicionar o ID da base "Site"
3. **Limpar o histórico contaminado** - a conversa atual tem respostas erradas que continuarão a influenciar

