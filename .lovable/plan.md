
# Plano: Adicionar Selector de Moeda nas Condições de Pagamento

## Diagnóstico

Após investigar a base de dados, confirmei que a proposta "Solução Wi-Fi Alta Performance" está gravada com **currency: BRL** (Reais) em vez de EUR. Este é o motivo pelo qual aparece "R$" no cabeçalho.

| id | title | currency |
|----|-------|----------|
| b83949a8-... | Solução Wi-Fi Alta Performance | **BRL** |
| d8f9f8f3-... | Proposta Comercial (cópia) | EUR |

O sistema está a funcionar correctamente - está a usar a moeda gravada na proposta. O problema é que **não existe forma de alterar a moeda** depois da proposta ser criada.

## Solução

Adicionar um campo de selecção de moeda na secção **Condições de Pagamento** (step 4: Condições), permitindo ao utilizador escolher entre EUR, USD, BRL, etc.

### Layout Proposto

```text
╔══════════════════════════════════════════════════════╗
║ 💳 Condições de Pagamento                            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Moeda da Proposta          Prazo de Pagamento       ║
║  ┌─────────────────┐        ┌─────────────────┐      ║
║  │ EUR (€)       ▾ │        │ 30 dias       ▾ │      ║
║  └─────────────────┘        └─────────────────┘      ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

## Alterações Técnicas

### 1. Ficheiro: `src/components/proposals/ProposalConditionsSection.tsx`

**Adicionar propriedade à interface ConditionsData:**
```typescript
export interface ConditionsData {
  paymentConditions: string;
  customPaymentConditions: string;
  validityDays: number;
  notes: string;
  currency: string;  // NOVO
  isAIGenerated?: boolean;
}
```

**Adicionar selector de moeda no card "Condições de Pagamento":**
- Opções: EUR (€), USD ($), BRL (R$), GBP (£)
- Posicionado ao lado do "Prazo de Pagamento"
- Com ícone de moeda

### 2. Ficheiro: `src/components/proposals/ProposalDetailDialog.tsx`

**Inicializar currency no estado conditionsData (linha ~148-155):**
```typescript
const [conditionsData, setConditionsData] = useState<ConditionsData>({
  paymentConditions: "30_dias",
  customPaymentConditions: "",
  validityDays: 30,
  notes: "",
  currency: "EUR",  // NOVO
});
```

**Carregar currency da proposta na inicialização (linha ~282-289):**
```typescript
setConditionsData({
  paymentConditions: isCustom ? "custom" : paymentValue,
  customPaymentConditions: isCustom ? paymentValue : "",
  validityDays: proposal.validity_days || 30,
  notes: proposal.notes || "",
  currency: proposal.currency || "EUR",  // NOVO
});
```

**Gravar currency na proposta ao salvar (linha ~378-395):**
```typescript
const { error } = await supabase
  .from("proposals")
  .update({
    // ... outros campos
    currency: conditionsData.currency,  // NOVO
  })
  .eq("id", proposal.id);
```

**Passar currency para POSProposalItemsEditor (linha ~484-493):**
```typescript
<POSProposalItemsEditor 
  proposalId={proposalId}
  currency={conditionsData.currency || proposal?.currency || "EUR"}  // Usar do estado
  onSaved={...}
/>
```

### 3. Ficheiro: `src/types/proposal.ts` (opcional)

Adicionar array de moedas suportadas para reutilização:
```typescript
export const SUPPORTED_CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "Dólar ($)" },
  { code: "BRL", symbol: "R$", label: "Real (R$)" },
  { code: "GBP", symbol: "£", label: "Libra (£)" },
] as const;
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalConditionsSection.tsx` | Adicionar selector de moeda e prop na interface |
| `src/components/proposals/ProposalDetailDialog.tsx` | Inicializar, carregar e gravar currency |
| `src/types/proposal.ts` | Definir constante SUPPORTED_CURRENCIES |

## Comportamento Esperado

1. Utilizador abre proposta existente com BRL
2. Vai à secção "Condições"
3. No campo "Moeda da Proposta", selecciona "EUR (€)"
4. Clica "Guardar"
5. O cabeçalho actualiza para mostrar € em vez de R$
6. Os itens da proposta também mostram €

## Fluxo de Dados

```text
ProposalConditionsSection           ProposalDetailDialog          POSProposalItemsEditor
        │                                   │                              │
        │ onChange({ currency: "EUR" })     │                              │
        │─────────────────────────────────▶ │                              │
        │                                   │ setConditionsData(...)       │
        │                                   │──────────────────────▶ state │
        │                                   │                              │
        │                                   │ currency prop                │
        │                                   │─────────────────────────────▶│
        │                                   │                              │
                                            │ handleSaveEdit()             │
                                            │─────▶ supabase.update({      │
                                            │         currency: "EUR"      │
                                            │       })                     │
```

## Complexidade

Baixa-Média - Requer:
1. Adicionar um novo campo à interface existente
2. Adicionar um componente Select standard
3. Propagar o valor através do fluxo de dados existente
