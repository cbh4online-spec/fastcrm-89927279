
O utilizador pergunta como captar leads através dos ebooks. O sistema de lead magnet já foi implementado nas mensagens anteriores (gating configurável, captura de nome/email/telemóvel, dedupe com CRM). 

Vou apresentar um plano estratégico de como usar o que já existe, em vez de re-implementar. Isto é mais consultoria/orientação do que código novo.

Vou verificar rapidamente o estado actual para confirmar.

# Plano: Estratégia de Captação de Leads via eBooks

## Diagnóstico
O sistema já tem toda a infraestrutura técnica para captar leads em ebooks (implementada nas sessões anteriores):
- Gating configurável por ebook (sempre / após N páginas / nunca)
- Formulário com nome, email, telemóvel (campos configuráveis)
- Dedupe automático contra Contactos e Leads existentes
- Tracking de leitura ligado ao CRM (páginas vistas, tempo, conclusão)

O que falta é a **estratégia de uso** e algumas **melhorias de conversão**.

## Estratégia recomendada (boas práticas seniores)

### 1. Configuração óptima por tipo de ebook
| Tipo de eBook | Trigger | Campos obrigatórios |
|---|---|---|
| Lead magnet topo de funil (guias, checklists) | Após 2-3 páginas (teaser) | Nome + Email |
| Conteúdo premium (estudos, cases) | Sempre (gate total) | Nome + Email + Telemóvel |
| Material de nurturing (clientes existentes) | Nunca | — |

**Porquê teaser**: mostrar valor antes de pedir dados aumenta conversão em 30-50%.

### 2. Melhorias de conversão a implementar
1. **Headline persuasiva no gate** — campo configurável já existe, mas adicionar sub-título e bullet points de benefícios
2. **Prova social** — mostrar "X pessoas já leram este ebook" no gate
3. **Double opt-in opcional** — enviar email de confirmação (RGPD-friendly)
4. **Thank-you state** — após captura, mostrar mensagem personalizada antes de abrir o ebook

### 3. Distribuição (onde partilhar o link)
- Loja online (banner "Download grátis")
- Funis (já existe `funnel_ebooks`)
- WhatsApp / SMS outbound (sequências SDR)
- Assinatura de email
- Posts sociais com OG image automática
- QR code em materiais físicos

### 4. Follow-up automático (fechar o ciclo)
Quando lead é capturado → disparar:
- **Email imediato** com link do ebook (caso saia antes de ler)
- **Sequência SDR** após 1-3-7 dias se não converter
- **Notificação ao gestor** quando lead atinge >70% de leitura (sinal forte)
- **Score automático** baseado em páginas lidas + tempo

### 5. Métricas a acompanhar (dashboard)
- Taxa de conversão (visualizações → leads capturados)
- Taxa de leitura completa (leads → ebook concluído)
- Origem dos leads (UTM tracking)
- Tempo médio até captura
- CTAs clicados dentro do ebook

## O que proponho construir agora

Apenas as **melhorias de conversão e follow-up** que faltam:

1. **Gate optimizado**
   - Adicionar campo `lead_gate_subtitle` e `lead_gate_benefits` (array de bullets) à tabela `ebooks`
   - Mostrar ícone/imagem do ebook no gate
   - Botão CTA com microcopy persuasiva configurável

2. **Email automático pós-captura**
   - Edge function `ebook-lead-welcome` que envia email com link do ebook
   - Template personalizável por ebook

3. **Notificação ao gestor**
   - Trigger no kernel event `ebook.read_completed` quando >70% lido
   - Cria tarefa/notificação no CRM com ficha do lead

4. **Dashboard de conversão**
   - Nova secção em `/dashboard/ebooks/[id]/analytics`
   - KPIs: views, leads capturados, taxa conversão, leitura completa
   - Lista de leads recentes com link directo para a ficha CRM

5. **Documentação no editor**
   - Painel "Boas práticas" com sugestões de configuração por tipo de ebook

## Estrutura técnica
```text
ebooks (novas colunas)
├── lead_gate_subtitle: text
├── lead_gate_benefits: text[]
├── lead_gate_cta_label: text
└── welcome_email_enabled: bool

Edge Functions (novas)
├── ebook-lead-welcome (envia email pós-captura)
└── ebook-completion-notify (notifica gestor quando >70%)

UI
├── EbookLeadGate.tsx (melhorado com subtitle + benefits)
├── EbookAnalyticsPanel.tsx (novo dashboard)
└── EbookEditorShell.tsx (secção "Boas Práticas")
```

## Critérios de aceitação
- Gate mostra benefícios e CTA persuasiva
- Email automático chega ao lead em < 30 segundos
- Gestor recebe notificação quando lead lê >70%
- Dashboard mostra funil de conversão por ebook
- Configuração por ebook documentada no editor

## Riscos / pontos por validar
- Confirmar provedor de email (Resend já está integrado nas SDR sequences — reutilizar)
- Definir threshold de "lead quente" (sugiro 70%, ajustável por ebook)
- RGPD: incluir checkbox de consentimento e link para política de privacidade no gate
