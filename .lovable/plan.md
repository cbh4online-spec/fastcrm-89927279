

# Plano: Corrigir Problemas no Documento de Proposta

## Problemas Identificados no PDF

Após analisar o documento PDF gerado, encontrei os seguintes problemas:

### 1. Problema de Layout na Página 1 (Capa)
- A secção "Âmbito do Projecto" está a aparecer na mesma página que a capa
- A capa deveria ocupar uma página A4 completa, mas está a "encolher" e permite que o conteúdo seguinte apareça ainda na primeira página
- O footer com "Simples e Divertido" aparece mal posicionado - deveria estar no fundo da capa, mas está a meio

### 2. Problema nas Condições de Venda (Página 4)
- **Condições mostra "50_adju" em vez do valor legível** - O campo `payment_conditions` guarda o valor técnico (`50_adju`) em vez de traduzir para a label legível
- O valor está a ser mostrado como `50_adju` quando deveria aparecer "50% Adjudicação + 50% Entrega" ou similar

### 3. Falta de Quebra de Página Após a Capa
- O documento não força uma quebra de página após a capa
- O conteúdo do Âmbito começa logo após a capa na mesma página, quebrando a estrutura pretendida

### 4. Falta do IBAN
- Na secção "Condições de Venda" não aparece o IBAN da empresa
- Deveria mostrar o IBAN para facilitar o pagamento

## Solução Proposta

### 1. Corrigir Altura da Capa
Garantir que a capa ocupa exactamente uma página A4 (1123px a 96 DPI) para forçar quebra de página:

```typescript
{/* ====== 1. CAPA DA PROPOSTA ====== */}
<div 
  data-pdf-section="cover" 
  className="flex flex-col relative"
  style={{ minHeight: '1090px' }} // ~A4 page height
>
```

### 2. Corrigir Tradução de Condições de Pagamento
O problema é que o código actual procura o valor em `PAYMENT_CONDITIONS` mas o valor armazenado (`50_adju`) não existe nessa lista. Preciso verificar se há uma lista personalizada ou se o valor `custom` está a ser usado incorrectamente.

```typescript
// Actual - falha porque "50_adju" não está na lista
const paymentLabel = proposal.payment_conditions 
  ? PAYMENT_CONDITIONS.find(p => p.value === proposal.payment_conditions)?.label 
    || proposal.payment_conditions // Cai aqui e mostra "50_adju"
  : null;
```

A solução é:
- Se o valor não for encontrado nas opções padrão, formatá-lo de forma legível
- Ou verificar se `50_adju` é um valor personalizado que precisa de tratamento especial

### 3. Garantir IBAN Visível
Verificar se o `companyIban` está a ser passado correctamente e aparece no documento.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalClientDocument.tsx` | Corrigir altura da capa; melhorar tratamento de condições de pagamento personalizadas |

## Implementação

### Alteração 1: Forçar Altura da Capa para Página Completa

```typescript
{/* ====== 1. CAPA DA PROPOSTA ====== */}
<div 
  data-pdf-section="cover" 
  className="flex flex-col relative"
  style={{ minHeight: '1090px' }} // Força quebra de página A4
>
```

### Alteração 2: Melhorar Tratamento de Condições de Pagamento

```typescript
// Helper para formatar condições de pagamento personalizadas
const formatPaymentCondition = (value: string): string => {
  // Primeiro, procurar nas opções padrão
  const standardOption = PAYMENT_CONDITIONS.find(p => p.value === value);
  if (standardOption) return standardOption.label;
  
  // Se for valor personalizado, formatar para ser legível
  // Converter underscores para espaços e capitalizar
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const paymentLabel = proposal.payment_conditions 
  ? formatPaymentCondition(proposal.payment_conditions)
  : null;
```

### Alteração 3: Assegurar Visibilidade do IBAN

Verificar que o IBAN está a ser exibido correctamente na secção de condições:

```typescript
{companyIban && (
  <p className="font-mono text-xs mt-1">
    <strong>IBAN:</strong> {companyIban}
  </p>
)}
```

## Resultado Esperado

1. **Capa em página separada** - A capa ocupará uma página A4 completa, forçando o Âmbito a começar na página 2
2. **Condições legíveis** - "50_adju" será mostrado como "50 Adju" ou com tratamento personalizado adequado
3. **IBAN visível** - O IBAN da empresa aparecerá na secção de condições de venda

## Complexidade

Baixa - Ajustes de CSS e lógica de formatação simples

