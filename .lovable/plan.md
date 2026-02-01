

# Plano: Template Atendimento Cliente Profissional

## Objetivo
Criar um novo template de fluxo conversacional para **Atendimento Geral a Clientes Profissionais (B2B)**, baseado na Matriz Geral de Atendimento fornecida.

---

## Estrutura do Fluxo

```text
[ENTRADA] → [Saudação Premium Ana/Pharliss]
                    ↓
            [Recolha Nome]
                    ↓
            [É Profissional?]
                 ↓ Sim         ↓ Não
        [Questionário       [Informa Requisitos]
         Profissional]           ↓
              ↓              [Handoff SAC]
        [Objetivo Principal]
              ↓
        [Situação Atual]
              ↓
        [Zona do País + Localidade]
              ↓
        [Formação Atual]
              ↓
        [Experiência Profissional]
              ↓
        [Verifica Parceiros Locais]
              ↓
        [Recomendação/Handoff]
              ↓
        [Goal: Lead B2B Qualificado]
```

---

## Variáveis a Recolher

| Variavel | Tipo | Obrigatoria | Mapeamento CRM |
|----------|------|-------------|----------------|
| `nome` | text | Sim | lead.name |
| `telefone` | phone | Sim | lead.phone |
| `email` | email | Sim | lead.email |
| `e_profissional` | boolean | Sim | - |
| `objetivo_principal` | choice | Sim | lead.specialty |
| `situacao_atual` | text | Sim | - |
| `zona_pais` | text | Sim | lead.city |
| `codigo_postal` | text | Sim | - |
| `formacao_atual` | text | Sim | - |
| `experiencia_profissional` | text | Sim | - |

---

## Passos do Fluxo (16 passos)

| # | Tipo | Nome | Conteudo |
|---|------|------|----------|
| 1 | message | Saudacao Premium | "Ola! Que alegria imensa receber o seu contacto. O meu nome e Ana da ENsI Pharliss, e estou aqui para acompanhar cada passo consigo, seja na sua formacao, evolucao profissional ou no cuidado capilar mais avancado. Como posso ajudar hoje?" |
| 2 | question | Recolha Nome | "Para preparar um atendimento completo, poderia indicar o seu nome?" |
| 3 | question | Recolha Telefone | "Qual o seu numero de telefone para contacto?" |
| 4 | question | Recolha Email | "E o seu email profissional?" |
| 5 | message | Agradecimento | "Obrigada, {nome}!" |
| 6 | question | Verifica Profissional | "Para direcionar melhor o atendimento, confirma que e profissional da area de beleza/saude?" → Quick Replies: "Sim, sou profissional", "Nao" |
| 7 | condition | Condicao Profissional | Campo: e_profissional, Operador: equals, Valor: "Sim, sou profissional" |
| 8 | question | Objetivo Principal | "Qual e o seu objetivo principal neste momento?" → Quick Replies: "Melhorar couro cabeludo", "Melhorar pele ou corpo", "Fortalecer cabelo", "Formacao profissional", "Equipamentos" |
| 9 | question | Situacao Atual | "Como esta atualmente a situacao que pretende resolver?" |
| 10 | question | Zona do Pais | "Em que zona do pais se encontra? (localidade e codigo postal)" |
| 11 | question | Formacao Atual | "Qual e a sua formacao atual na area?" |
| 12 | question | Experiencia | "Quantos anos de experiencia profissional tem?" |
| 13 | message | Analise Parceiros | "Perfeito, {nome}! Estou a verificar se existem parceiros Pharliss na sua zona de {zona_pais}. Com base no seu perfil profissional e objetivos, vou preparar uma recomendacao personalizada." |
| 14 | handoff | Handoff Coordenadora | "Vou passar o seu processo para a nossa coordenadora responsavel que ira analisar o seu perfil e entrar em contacto nas proximas duas horas." |
| 15 | message | Lead Nao Profissional | "Os nossos produtos sao de uso profissional. Para garantir os melhores resultados, recomendamos que contacte um profissional certificado na sua area. Posso ajudar a encontrar um parceiro proximo de si?" |
| 16 | goal | Lead B2B Qualificado | Objetivo: "Lead Profissional Qualificado Pharliss" |

---

## Implementacao Tecnica

### Ficheiro a Modificar
- `src/components/flow-builder/FlowTemplates.tsx`

### Alteracoes
1. **Novo Template**: Adicionar constante `ATENDIMENTO_PROFISSIONAL_TEMPLATE`
2. **Icone**: Usar `Users` (ja importado) para representar B2B/profissionais
3. **Categoria**: "Vendas" (consistente com os outros)
4. **Canais**: WhatsApp, Instagram, Widget

### Codigo Principal

```typescript
export const ATENDIMENTO_PROFISSIONAL_TEMPLATE: FlowTemplate = {
  id: 'atendimento-profissional',
  name: 'Atendimento Cliente Profissional',
  description: 'Fluxo de qualificacao e atendimento para clientes profissionais B2B',
  category: 'Vendas',
  icon: Users,
  defaultGoalType: 'lead_capture',
  defaultChannels: ['whatsapp', 'instagram', 'widget'],
  
  variables: [...],  // 10 variaveis definidas acima
  steps: [...]       // 16 passos definidos acima
};
```

### Atualizar Lista de Templates

```typescript
export const FLOW_TEMPLATES: FlowTemplate[] = [
  PHARLISS_UNIVERSAL_TEMPLATE,
  DR_KRAUT_TEMPLATE,
  ATENDIMENTO_PROFISSIONAL_TEMPLATE  // Novo template
];
```

---

## Diferencas dos Templates Existentes

| Aspeto | Pharliss Universal | Dr. Kraut | Cliente Profissional |
|--------|-------------------|-----------|---------------------|
| Foco | Consumidor Final | Consumidor Final | B2B Profissionais |
| Variaveis | 8 | 6 | 10 |
| Passos | 15 | 14 | 16 |
| Verificacao | Tem profissional? | Interesse compra? | E profissional? |
| Handoff | Especialista | Vendas | Coordenadora |
| Persona | Assistente generico | Dr. Kraut | Ana da Pharliss |

---

## Resultado Final

Apos implementacao, o utilizador podera:
1. Ir ao Flow Builder
2. Clicar em "Criar Fluxo"
3. Selecionar "Usar Template" → "Atendimento Cliente Profissional"
4. O fluxo completo com 16 passos sera criado automaticamente
5. Ativar o fluxo para canais WhatsApp, Instagram e Widget

---

## Detalhes Tecnicos

### Estimativa de Codigo
- Novo template: ~250 linhas TypeScript
- Nenhuma alteracao de base de dados necessaria
- Usa estrutura existente de `FlowTemplate`

### Elementos Especiais deste Template
- Verificacao de perfil profissional no inicio do fluxo
- Recolha de dados B2B (formacao, experiencia)
- Ramificacao para leads nao-profissionais
- Handoff para coordenadora (nao vendas genericas)
- Persona especifica "Ana da Pharliss"

