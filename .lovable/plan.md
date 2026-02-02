

# Plano: Reorganizar Estrutura do Documento de Proposta

## Estrutura Actual vs Pretendida

| Ordem Actual | Ordem Pretendida |
|-------------|------------------|
| 1. Cabeçalho (logo, empresa, nº proposta) | 1. **Capa da Proposta** (página separada com título e cliente) |
| 2. Dados do Cliente | 2. **Âmbito do Projecto** (objectivos, entregáveis, exclusões) |
| 3. Tabela de Itens (produtos/serviços) | 3. **Cronograma** (fases e marcos) |
| 4. Totais (subtotal, IVA, total) | 4. **Referências e Credenciais** (projectos, testemunho) |
| 5. Âmbito do Projecto | 5. **Proposta e Condições** (itens, preços, pagamento) |
| 6. Cronograma | |
| 7. Referências | |
| 8. Rodapé (pagamento, assinatura) | |

## Nova Estrutura do Documento

### Página 1: CAPA DA PROPOSTA
```text
┌─────────────────────────────────────────────────┐
│                                                 │
│              [LOGO DA EMPRESA]                  │
│                                                 │
│                  PROPOSTA                       │
│              Nº PROP-2026-001                   │
│                                                 │
│         ─────────────────────────               │
│                                                 │
│                 Preparado para:                 │
│             [NOME DO CLIENTE]                   │
│              [Morada Cliente]                   │
│                                                 │
│                                                 │
│           Data: 02 de Fevereiro 2026            │
│         Válido até: 02 de Março 2026            │
│                                                 │
│                                                 │
│         ─────────────────────────               │
│         [Dados de contacto empresa]             │
└─────────────────────────────────────────────────┘
```

### Página 2+: ÂMBITO DO PROJECTO
```text
┌─────────────────────────────────────────────────┐
│ ÂMBITO DO PROJECTO                              │
├─────────────────────────────────────────────────┤
│ Objectivos                                       │
│ [Texto dos objectivos]                           │
├─────────────────────────────────────────────────┤
│ ✓ Entregáveis                                    │
│   • Item 1                                       │
│   • Item 2                                       │
├─────────────────────────────────────────────────┤
│ ✗ Exclusões                                      │
│   • Item excluído 1                              │
├─────────────────────────────────────────────────┤
│ ⚠ Pressupostos                                  │
│ [Texto dos pressupostos]                         │
└─────────────────────────────────────────────────┘
```

### Página 3+: CRONOGRAMA
```text
┌─────────────────────────────────────────────────┐
│ CRONOGRAMA                                       │
├─────────────────────────────────────────────────┤
│ Duração Total: X semanas                         │
│ Início Previsto: [data]                          │
├─────────────────────────────────────────────────┤
│ Semana │ Fase/Marco               │ Duração     │
│   1    │ • Análise de Requisitos  │ 5 dias      │
│   2    │ ⚑ Marco: Kickoff         │ -           │
│   3    │ • Desenvolvimento        │ 10 dias     │
└─────────────────────────────────────────────────┘
```

### Página 4+: REFERÊNCIAS E CREDENCIAIS
```text
┌─────────────────────────────────────────────────┐
│ REFERÊNCIAS E CREDENCIAIS                        │
├─────────────────────────────────────────────────┤
│ Projectos Similares                              │
│ ┌───────────┐  ┌───────────┐                    │
│ │ Projecto A│  │ Projecto B│                    │
│ │ [descrição]│ │ [descrição]│                   │
│ └───────────┘  └───────────┘                    │
├─────────────────────────────────────────────────┤
│ "Citação do testemunho..."                       │
│ — Autor, Cargo @ Empresa                         │
├─────────────────────────────────────────────────┤
│ Certificações: [Badge] [Badge]                   │
└─────────────────────────────────────────────────┘
```

### Página 5+: PROPOSTA E CONDIÇÕES DE VENDA
```text
┌─────────────────────────────────────────────────┐
│ PROPOSTA                                         │
├─────────────────────────────────────────────────┤
│ # │ Item                    │ Preço  │ Qtd │ Total │
│ 1 │ [Produto/Serviço]       │ €XXX   │  2  │ €XXX  │
│ 2 │ [Produto/Serviço]       │ €XXX   │  1  │ €XXX  │
├─────────────────────────────────────────────────┤
│                          Subtotal:   €X.XXX,XX  │
│                          IVA (23%):    €XXX,XX  │
│                          TOTAL:      €X.XXX,XX  │
├─────────────────────────────────────────────────┤
│ CONDIÇÕES DE VENDA                               │
│ • Pagamento: A 30 dias                           │
│ • IBAN: PT50 XXXX XXXX XXXX                     │
│ • Notas: [notas adicionais]                      │
├─────────────────────────────────────────────────┤
│ Validade: Esta proposta é válida até DD/MM/AAAA │
├─────────────────────────────────────────────────┤
│ _____________________                            │
│ [Nome Assinante]                                 │
│ [Cargo]                                          │
└─────────────────────────────────────────────────┘
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalClientDocument.tsx` | Reorganizar toda a estrutura do documento |

## Implementação Técnica

### Reorganização das Secções

O componente será reestruturado para renderizar as secções na nova ordem:

1. **Nova Secção: Capa** (`data-pdf-section="cover"`)
   - Altura mínima de uma página A4 (~1123px)
   - Logo centrado
   - Título "PROPOSTA" em destaque
   - Número da proposta
   - Dados do cliente (nome, morada)
   - Datas (criação e validade)
   - Contacto da empresa no rodapé da capa

2. **Âmbito** (`data-pdf-section="scope"`) - já implementado, mover para 2º lugar

3. **Cronograma** (`data-pdf-section="timeline"`) - já implementado, mover para 3º lugar

4. **Referências** (`data-pdf-section="references"`) - já implementado, mover para 4º lugar

5. **Proposta e Condições** (`data-pdf-section="proposal"`) - combinar:
   - Título "PROPOSTA"
   - Tabela de itens (mover de cima)
   - Totais (subtotal, IVA, total)
   - Nova subsecção "CONDIÇÕES DE VENDA":
     - Método de pagamento
     - Condições de pagamento
     - IBAN
     - Notas
   - Validade
   - Área de assinatura

### Estrutura de Código Simplificada

```typescript
export function ProposalClientDocument(...) {
  return (
    <div className="max-w-[210mm] mx-auto">
      {/* Action Bar (print/download) */}
      
      <Card>
        {/* ====== 1. CAPA DA PROPOSTA ====== */}
        <div data-pdf-section="cover" className="min-h-[1000px] flex flex-col">
          {/* Logo centrado */}
          {/* Título PROPOSTA */}
          {/* Número da proposta */}
          {/* Dados do cliente */}
          {/* Datas */}
          {/* Contacto empresa (rodapé capa) */}
        </div>

        {/* ====== 2. ÂMBITO DO PROJECTO ====== */}
        {scopeData && hasContent && (
          <div data-pdf-section="scope">
            {/* Objectivos, Entregáveis, Exclusões, Pressupostos */}
          </div>
        )}

        {/* ====== 3. CRONOGRAMA ====== */}
        {timelineData && hasPhases && (
          <div data-pdf-section="timeline">
            {/* Tabela de fases e marcos */}
          </div>
        )}

        {/* ====== 4. REFERÊNCIAS E CREDENCIAIS ====== */}
        {referencesData && hasReferences && (
          <div data-pdf-section="references">
            {/* Projectos, Testemunho, Certificações */}
          </div>
        )}

        {/* ====== 5. PROPOSTA E CONDIÇÕES DE VENDA ====== */}
        <div data-pdf-section="proposal">
          <h2>PROPOSTA</h2>
          {/* Tabela de itens */}
          {/* Totais */}
          
          <h3>CONDIÇÕES DE VENDA</h3>
          {/* Método pagamento, IBAN, notas */}
          {/* Validade */}
          {/* Assinatura */}
        </div>
      </Card>
    </div>
  );
}
```

## Resultado Esperado

O documento de proposta terá uma estrutura profissional e sequencial:

1. **Capa** - Primeira impressão visual com logo e dados essenciais
2. **Âmbito** - O que vai ser feito (conteúdo antes do preço)
3. **Cronograma** - Quando vai ser feito
4. **Referências** - Credibilidade e casos de sucesso
5. **Proposta Comercial** - Preços e condições (no final, após demonstrar valor)

Esta ordem segue as melhores práticas de propostas comerciais: primeiro mostrar o VALOR, depois apresentar o PREÇO.

