
# Plano: Fluxo Universal de Resposta a Produtos e Equipamentos

## Objetivo
Criar um fluxo conversacional completo no Visual Flow Builder que implementa o esquema de vendas descrito no documento. Este fluxo irá:
- Capturar dados do lead (nome, contacto, email)
- Identificar o objetivo do cliente (couro cabeludo, pele/corpo, cabelo)
- Recolher informação sobre o problema (estado atual, tempo, intensidade)
- Recomendar solução personalizada
- Encaminhar para profissional ou handoff humano

---

## Estrutura do Fluxo

```text
[ENTRADA] → [Saudação] → [Recolha Dados]
                              ↓
                        [Objetivo Principal]
                              ↓
                    ┌─────────┼─────────┐
                    ↓         ↓         ↓
               [Cabelo]   [Pele]   [Couro Cab.]
                    └─────────┬─────────┘
                              ↓
                    [Pergunta A: Estado Atual]
                              ↓
                    [Pergunta B: Há quanto tempo]
                              ↓
                    [Pergunta C: Intensidade 1-10]
                              ↓
                    [Análise + Recomendação]
                              ↓
                    [Condição: Profissional próximo?]
                       ↓ Sim           ↓ Não
                 [Remete Prof.]    [Handoff Humano]
```

---

## Passos a Implementar

### 1. Criar o Fluxo Base
- **Nome**: "Funil Universal - Produtos e Equipamentos"
- **Descrição**: "Fluxo de vendas para recolha de informação e recomendação de produtos Pharliss"
- **Objetivo**: Captura de Lead + Qualificação
- **Canais**: WhatsApp, Instagram, Widget

### 2. Criar Variáveis do Fluxo
| Variável | Tipo | Obrigatória | Mapeamento CRM |
|----------|------|-------------|----------------|
| `nome` | text | Sim | lead.name |
| `contacto` | phone | Sim | lead.phone |
| `email` | email | Sim | lead.email |
| `objetivo` | choice | Sim | lead.specialty |
| `estado_atual` | text | Sim | - |
| `tempo_problema` | text | Sim | - |
| `intensidade` | number | Sim | - |
| `tem_profissional` | boolean | Não | - |

### 3. Criar Passos do Fluxo

| # | Tipo | Nome | Conteúdo |
|---|------|------|----------|
| 1 | message | Saudação | "Olá! 👋 Que bom receber o seu contacto. Sou o assistente especializado da Pharliss e estou aqui para ajudar a encontrar a melhor opção dentro da nossa linha profissional." |
| 2 | question | Recolha Nome | "Para que eu possa enviar recomendações personalizadas e instruções completas, poderia indicar o seu nome?" |
| 3 | question | Recolha Contacto | "Qual o seu número de contacto?" |
| 4 | question | Recolha Email | "E o seu email para enviarmos ofertas exclusivas?" |
| 5 | message | Agradecimento | "Obrigado, {nome}! 🙏" |
| 6 | question | Objetivo Principal | "Para entender exatamente o que procura, poderia dizer qual é o seu objetivo principal?" → Respostas Rápidas: "Melhorar couro cabeludo", "Melhorar pele ou corpo", "Fortalecer cabelo" |
| 7 | question | Estado Atual | "Como está hoje o seu {objetivo}?" |
| 8 | question | Tempo Problema | "Isto acontece há quanto tempo?" |
| 9 | question | Intensidade | "Num nível de 1 a 10, como classificaria a intensidade da situação?" |
| 10 | message | Análise | "Perfeito, obrigado por partilhar! 💡 Com base no que descreveu, posso recomendar uma solução profissional adequada à sua situação. Esta solução foi pensada para: • Melhorar gradualmente o problema • Atuar na causa e não só no efeito • Ser segura e de qualidade profissional • Ter resultados consistentes quando usada corretamente" |
| 11 | question | Profissional | "Tem um profissional de beleza/saúde próximo da sua área de residência que possa indicar?" → Respostas Rápidas: "Sim", "Não" |
| 12 | condition | Verifica Prof. | Campo: tem_profissional, Operador: equals, Valor: "Sim" |
| 13 | message | Remete Prof. | "Excelente! Recomendo que visite o profissional para uma avaliação personalizada. Ele poderá indicar o produto ideal da nossa linha para o seu caso específico. Posso ajudar com mais alguma coisa?" |
| 14 | handoff | Handoff Humano | "Como não tem um profissional próximo, vou transferir esta conversa para um especialista da nossa equipa que poderá ajudá-lo(a) diretamente com recomendações e opções de entrega. Um momento, por favor..." |
| 15 | goal | Lead Qualificado | Objetivo concluído com valor de conversão |

### 4. Conexões Entre Passos
```text
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12
                                              ↓
                                     Condição Verdadeira → 13 → 15
                                     Condição Falsa → 14
```

---

## Implementação Técnica

### Ficheiros a Criar/Modificar

1. **Novo Componente: Template de Fluxo**
   - `src/components/flow-builder/FlowTemplates.tsx`
   - Permite criar fluxos pré-configurados com um clique

2. **Extensão do Diálogo de Criação**
   - `src/components/flow-builder/CreateFlowDialog.tsx`
   - Adicionar opção "Usar Template" com lista de templates disponíveis

3. **Função de Criação Automática**
   - `src/hooks/useConversationalFlows.ts`
   - Adicionar `createFlowFromTemplate(templateId)` que cria o fluxo completo com todos os passos e variáveis

### Estrutura do Template
```typescript
interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  variables: Array<{
    name: string;
    displayName: string;
    type: VariableType;
    isRequired: boolean;
    mapToField?: string;
  }>;
  steps: Array<{
    type: FlowStepType;
    name: string;
    messageContent?: string;
    quickReplies?: string[];
    variableToCollect?: string;
    connectsTo?: string; // Nome do passo seguinte
    conditionConfig?: {...};
  }>;
}
```

---

## Resultado Final

Após implementação, o utilizador poderá:
1. Ir ao Flow Builder
2. Clicar em "Criar Fluxo"
3. Selecionar "Usar Template" → "Funil Produtos Pharliss"
4. O fluxo completo com 15 passos será criado automaticamente
5. Personalizar mensagens conforme necessário
6. Ativar o fluxo

---

## Detalhes Técnicos

### Base de Dados
- Utiliza tabelas existentes: `conversational_flows`, `flow_steps`, `flow_variables`
- Não requer migrações de schema

### Edge Functions
- O `flow-engine` existente já suporta todos os tipos de passos necessários
- Apenas necessita de dados corretos nos passos

### Estimativa
- Novo componente de templates: ~200 linhas
- Extensão do diálogo: ~50 linhas
- Função de criação: ~150 linhas

