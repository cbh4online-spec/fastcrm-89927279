
# Plano: Template de Fluxo Conversacional Dr. Kraut

## Objetivo
Criar um novo template de fluxo conversacional para a linha profissional Dr. Kraut (estética corporal e facial), baseado no esquema de resposta do documento fornecido.

---

## Estrutura do Fluxo

```text
[ENTRADA] → [Saudação Dr. Kraut] → [Recolha Nome]
                                        ↓
                              [Objetivo Principal]
                              (7 opções de tratamento)
                                        ↓
                              [Zona de Foco]
                              (5 zonas corporais)
                                        ↓
                              [Tempo do Problema]
                                        ↓
                              [Intensidade 1-10]
                                        ↓
                              [Apresentação Protocolo]
                                        ↓
                              [Interesse em Avançar?]
                                   ↓ Sim        ↓ Não
                            [Handoff Vendas]  [Follow-up]
                                   ↓
                            [Goal: Venda]
```

---

## Variáveis a Recolher

| Variável | Tipo | Obrigatória | Mapeamento CRM |
|----------|------|-------------|----------------|
| `nome` | text | Sim | lead.name |
| `objetivo_tratamento` | choice | Sim | lead.specialty |
| `zona_foco` | choice | Sim | - |
| `tempo_necessidade` | text | Sim | - |
| `intensidade` | number | Sim | - |
| `interesse_compra` | boolean | Não | - |

---

## Passos do Fluxo (14 passos)

| # | Tipo | Nome | Conteúdo |
|---|------|------|----------|
| 1 | message | Saudação Dr. Kraut | "Olá! Que bom receber o seu contacto. A Dr. Kraut é uma linha profissional de estética corporal e facial com fórmulas de alta performance e protocolos desenvolvidos para resultados visíveis e consistentes. Como posso ajudar hoje na sua rotina ou tratamento estético?" |
| 2 | question | Recolha Nome | "Para preparar um atendimento completo e direcionado para si, poderia indicar o seu nome?" |
| 3 | message | Agradecimento | "Obrigado, {nome}!" |
| 4 | question | Objetivo Tratamento | "Para eu poder recomendar o melhor protocolo, diga-me qual é o seu objetivo principal neste momento?" → Quick Replies: "Redução de volume", "Firmeza", "Drenagem", "Celulite", "Relaxamento", "Rejuvenescimento facial", "Hidratação avançada" |
| 5 | question | Zona de Foco | "Em que zona pretende trabalhar?" → Quick Replies: "Rosto", "Pernas", "Abdómen", "Glúteos", "Corpo inteiro" |
| 6 | question | Tempo Necessidade | "Há quanto tempo sente essa necessidade?" |
| 7 | question | Intensidade | "Numa escala de 1 a 10, qual é a intensidade do problema ou urgência em resolver?" |
| 8 | message | Análise Protocolo | "Perfeito, {nome}! Com base no que descreveu, posso recomendar um protocolo profissional Dr. Kraut adequado para {objetivo_tratamento} na zona de {zona_foco}. Os nossos protocolos são desenvolvidos para resultados visíveis e consistentes." |
| 9 | question | Interesse Compra | "Gostaria que lhe enviasse informações sobre preços e como avançar com o protocolo recomendado?" → Quick Replies: "Sim, quero saber mais", "Ainda não" |
| 10 | condition | Verifica Interesse | Campo: interesse_compra, Operador: equals, Valor: "Sim, quero saber mais" |
| 11 | handoff | Transferir Vendas | "Vou transferir esta conversa para um especialista da nossa equipa que irá enviar-lhe o link seguro de pagamento e todas as informações do protocolo recomendado. Um momento, por favor..." |
| 12 | message | Follow-up Agendado | "Sem problema, {nome}! Fico aqui disponível quando quiser retomar. Continuarei aqui para ajudar a escolher o melhor protocolo Dr. Kraut para si. Quando quiser avançar, basta enviar mensagem." |
| 13 | goal | Venda Iniciada | Objetivo: "Lead Qualificado para Venda Dr. Kraut" |
| 14 | goal | Lead Nurturing | Objetivo: "Lead para Follow-up Dr. Kraut" |

---

## Implementação Técnica

### Ficheiro a Modificar
- `src/components/flow-builder/FlowTemplates.tsx`

### Alterações
1. **Novo Template**: Adicionar constante `DR_KRAUT_TEMPLATE` com a estrutura completa
2. **Novo Ícone**: Usar `Sparkles` (já importado) para representar estética/beleza
3. **Categoria**: "Vendas" (mesma do template Pharliss)
4. **Canais**: WhatsApp, Instagram, Widget

### Código a Adicionar

```typescript
// Template: Funil Dr. Kraut - Estética Corporal e Facial
export const DR_KRAUT_TEMPLATE: FlowTemplate = {
  id: 'dr-kraut-estetica',
  name: 'Dr. Kraut - Estética Corporal e Facial',
  description: 'Fluxo de vendas para protocolos de estética corporal e facial Dr. Kraut',
  category: 'Vendas',
  icon: Sparkles,
  defaultGoalType: 'lead_capture',
  defaultChannels: ['whatsapp', 'instagram', 'widget'],
  
  variables: [...],  // 6 variáveis definidas acima
  steps: [...]       // 14 passos definidos acima
};
```

### Atualizar Lista de Templates

```typescript
export const FLOW_TEMPLATES: FlowTemplate[] = [
  PHARLISS_UNIVERSAL_TEMPLATE,
  DR_KRAUT_TEMPLATE  // Novo template
];
```

---

## Resultado Final

Após implementação, o utilizador poderá:
1. Ir ao Flow Builder
2. Clicar em "Criar Fluxo"
3. Selecionar "Usar Template" → "Dr. Kraut - Estética Corporal e Facial"
4. O fluxo completo com 14 passos será criado automaticamente
5. Personalizar mensagens conforme necessário
6. Ativar o fluxo para canais WhatsApp, Instagram e Widget

---

## Detalhes Técnicos

### Estimativa de Código
- Novo template: ~200 linhas TypeScript
- Nenhuma alteração de base de dados necessária
- Usa estrutura existente de `FlowTemplate`

### Diferenças do Template Pharliss
- Foco em estética corporal/facial vs. couro cabeludo/cabelo
- 7 objetivos de tratamento específicos Dr. Kraut
- 5 zonas corporais para tratamento
- Fluxo orientado diretamente para venda (handoff para pagamento)
- Mensagens de follow-up para leads não convertidos
