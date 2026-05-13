## Diagnóstico

Já existe um template estático "Poupança mensal — Demo Bebé" em `src/utils/leadchef/templates.ts` (linha 286) com valores fixos: 30 boiões, 15 papas, 4 sopas → 21,26€/mês. O agente quer poder ajustar as quantidades por lead e gerar o texto WhatsApp com o total recalculado, diretamente na página do lead.

## Decisões de produto/UX

- **Localização**: novo cartão "Calculadora de poupança" na `LeadChefLeadDetailPage`, posicionado abaixo das ações rápidas e antes da timeline (zona de alta visibilidade durante a chamada/follow-up).
- **Inputs ajustáveis** (3 linhas, defaults = template original):
  - Boiões de maçã / mês — qtd (default 30)
  - Papas de farinha de arroz / mês — qtd (default 15)
  - Sopas fora de casa / mês — qtd (default 4)
- **Preços por unidade** (compra vs Bimby) ficam numa constante editável em código (não na UI), para manter o cartão simples. Mostrados em texto pequeno por baixo de cada linha para o agente justificar ao lead.
- **Outputs em tempo real**:
  - Poupança mensal por categoria
  - Total mensal destacado em verde
  - Total anual (mensal × 12) como reforço
- **Ações**:
  - Botão "Copiar mensagem" → texto formatado idêntico ao template existente, mas com os valores do lead.
  - Botão "Enviar por WhatsApp" → reutiliza `LeadChefWhatsAppActionSheet` com o texto pré-preenchido.
- **Persistência**: as quantidades guardam-se em `localStorage` por `leadId` (chave `leadchef:savings:{leadId}`) para o agente não perder o ajuste se sair e voltar. Sem coluna nova na BD nesta fase.
- **Reset**: botão pequeno "Repor valores padrão".

## Estrutura técnica

Novos ficheiros:
- `src/utils/leadchef/savingsCalculator.ts` — constantes de preços, função `calcSavings({ boioes, papas, sopas })` devolvendo breakdown + totais, e `renderSavingsMessage(result, leadFirstName?)` para o texto WhatsApp.
- `src/components/leadchef/LeadChefSavingsCalculatorCard.tsx` — UI do cartão (inputs número, breakdown, totais, copiar, enviar WhatsApp, reset). Persistência via `localStorage` com hook interno.

Edição:
- `src/pages/leadchef/LeadChefLeadDetailPage.tsx` — montar `<LeadChefSavingsCalculatorCard leadId={lead.id} firstName={...} phone={...} />` na zona acordada e ligar ao `LeadChefWhatsAppActionSheet` existente (passar `prefilledMessage`).

```text
LeadChefLeadDetailPage
└─ LeadChefSavingsCalculatorCard
   ├─ inputs (boiões / papas / sopas)
   ├─ breakdown por categoria (mensal)
   ├─ total mensal + total anual
   └─ ações: Copiar | Enviar WhatsApp | Repor
```

Constantes (extraídas do template atual):
- Boião: compra 0,50€ · Bimby 0,16€ · poupança 0,34€/un
- Papa:  compra 0,53€ · Bimby 0,19€ · poupança 0,34€/un
- Sopa:  compra 1,99€ · Bimby 0,50€ · poupança 1,49€/un

## Plano de implementação

1. Criar `savingsCalculator.ts` com tipos, constantes, `calcSavings` e `renderSavingsMessage` (formato exatamente igual ao template existente, valores recalculados, separadores de milhares pt-PT, 2 casas decimais).
2. Criar `LeadChefSavingsCalculatorCard.tsx` (shadcn `Card`, `Input type=number`, `Button`). Usar tokens semânticos do design system (`text-emerald-600` apenas para o destaque do total, alinhado com `ExtrasCard`/`GanhosSimulator`).
3. Implementar persistência por lead via `localStorage` com fallback para defaults.
4. Integrar pré-visualização da mensagem reutilizando `LeadChefMessagePreview`.
5. Inserir o cartão em `LeadChefLeadDetailPage.tsx` e ligar o botão "Enviar WhatsApp" ao sheet existente passando o texto.
6. QA em mobile (LeadChef é mobile-first), validar inputs (mínimo 0, inteiros), estado vazio (0 em todas → totais 0€ + mensagem desativa botão de envio).

## Critérios de aceitação

- Alterar uma quantidade recalcula breakdown + totais instantaneamente.
- Texto gerado segue o mesmo layout/emoji do template "Poupança mensal — Demo Bebé".
- "Copiar" coloca texto na clipboard com toast de confirmação.
- "Enviar WhatsApp" abre o sheet existente com o texto pré-preenchido e telefone do lead.
- Quantidades persistem ao recarregar a página do mesmo lead.
- "Repor padrão" volta a 30/15/4.
- Sem erros de consola; funciona em mobile (375px).

## Riscos e pontos por validar

- Confirmar que `LeadChefWhatsAppActionSheet` aceita `prefilledMessage` (caso contrário, adicionar prop opcional sem alterar comportamento atual).
- Preços hardcoded — se quiser editáveis por workspace mais tarde, migrar para `leadchef_app_config.features.savings_calculator`.
- Não há tracking de uso — se quiser contar quantos leads viram a calculadora, adicionar `crm_activities` log no envio (decidir antes de implementar).