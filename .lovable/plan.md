
# Plano: Fases 3 e 4 - Modulo de Nota de Encomenda

## Estado Actual (Fases 1 e 2 Concluidas)

As Fases 1 e 2 implementaram:
- Base de dados completa com RLS
- Portal do Cliente (7 paginas funcionais)
- Edge Functions (order-note-submit, order-note-notify)
- Dashboard Admin (OrderNotesPage, OrderNoteDetailPage, ClientUsersPage)
- Hooks admin (useOrderNotes, useOrderNoteStatus, useClientUsers)
- Menu de navegacao actualizado

---

## Fase 3: Polish (A Implementar)

### 1. Ficha de Produto Completa (Atributos Clinicos)

Actualmente, o modal de produto no catalogo mostra apenas informacao basica. Vamos expandir para incluir os atributos tecnicos/clinicos.

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/client-portal/catalog/ProductDetailModal.tsx` | Novo | Modal completo com ficha tecnica |
| `src/components/client-portal/catalog/ProductImageGallery.tsx` | Novo | Galeria de imagens com navegacao |
| `src/components/client-portal/catalog/ProductTechnicalInfo.tsx` | Novo | Composicao, modo de uso, especificacoes |
| `src/components/client-portal/catalog/ProductAttributeTags.tsx` | Novo | Tags de funcao, patologia, protocolo |

**Seccoes da Ficha:**
- Galeria de imagens (principal + miniaturas)
- Descricao tecnica completa
- Composicao / Ativos (de specifications)
- Modo de uso (de specifications)
- Funcoes clinicas (de product_attributes type=function)
- Patologias / Situacoes (de product_attributes type=pathology)
- Resultados esperados (de specifications)
- Seccao de compra com calculo IVA

### 2. Integracao Edge Function na Submissao

O hook useClientOrders ainda faz update directo. Precisa chamar a edge function.

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/hooks/client-portal/useClientOrders.ts` | Editar | Usar supabase.functions.invoke |

**Alteracao:**
```text
// submitOrder passa a chamar edge function
const response = await supabase.functions.invoke('order-note-submit', {
  body: { orderId, installmentData }
});
```

### 3. Exportar PDF da Nota de Encomenda

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/order-notes/OrderNotePDF.tsx` | Novo | Componente para gerar PDF |
| `src/hooks/useOrderNotePDF.ts` | Novo | Hook para geracao PDF |

**Conteudo do PDF:**
- Cabecalho com dados do workspace
- Numero da encomenda e data
- Dados do cliente (nome, NIF, morada)
- Tabela de produtos
- Totais (sem IVA, IVA, com IVA)
- Notas do cliente
- Informacao de prestacoes (se aplicavel)

### 4. Dialogo para Convidar/Criar Cliente B2B

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/client-users/InviteClientDialog.tsx` | Novo | Formulario para criar cliente |
| `src/components/client-users/EditClientDialog.tsx` | Novo | Formulario para editar cliente |

**Campos do formulario:**
- Nome
- Email
- Telefone
- NIF/NIPC
- Morada de faturacao
- Morada de entrega (opcional)
- Limite de credito
- Condicoes de pagamento
- Associar a Contacto CRM (select)
- Associar a Empresa CRM (select)
- Notas internas

### 5. Historico de Encomendas Melhorado

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/pages/client/ClientOrdersPage.tsx` | Editar | Melhorar visualizacao |
| `src/components/client-portal/orders/OrderCard.tsx` | Novo | Card de encomenda |
| `src/components/client-portal/orders/OrderTimeline.tsx` | Novo | Timeline de estados |

**Melhorias:**
- Cards visuais em vez de tabela simples
- Timeline visual de estados
- Indicador de prestacoes
- Botao para repetir encomenda

---

## Fase 4: Integracao CRM (A Implementar)

### 1. Timeline de Encomendas no Contacto

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/contacts/timeline/OrderNoteEvent.tsx` | Novo | Evento de encomenda |
| `src/hooks/useContactOrderNotes.ts` | Novo | Hook para buscar encomendas do contacto |

**Funcionalidade:**
- Quando client_user.contact_id existe, mostrar encomendas no timeline
- Card visual com numero, data, estado, valor
- Link para abrir detalhe no dashboard admin

### 2. Timeline de Encomendas na Empresa

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/companies/timeline/CompanyOrderNoteEvent.tsx` | Novo | Evento para empresas |
| `src/hooks/useCompanyOrderNotes.ts` | Novo | Hook para buscar encomendas da empresa |

**Funcionalidade:**
- Quando client_user.company_id existe, mostrar encomendas na empresa
- Agregar encomendas de todos os contactos da empresa

### 3. Criar Oportunidade a Partir de Encomenda

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/order-notes/CreateDealFromOrder.tsx` | Novo | Botao e modal para criar oportunidade |

**Funcionalidade:**
- Botao "Criar Oportunidade" no detalhe da encomenda
- Pre-preencher com dados da encomenda
- Valor da oportunidade = total da encomenda
- Associar ao contacto/empresa do cliente

### 4. Estatisticas de Clientes B2B

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/client-users/ClientUserStats.tsx` | Novo | Dashboard de estatisticas |

**Metricas:**
- Total de clientes activos
- Encomendas no mes
- Valor total de encomendas
- Top 5 clientes por volume
- Taxa de aprovacao de prestacoes

---

## Estrutura de Ficheiros a Criar/Editar

### Fase 3: Polish (11 ficheiros)
```text
src/components/client-portal/catalog/
  ProductDetailModal.tsx         # Novo
  ProductImageGallery.tsx        # Novo
  ProductTechnicalInfo.tsx       # Novo
  ProductAttributeTags.tsx       # Novo

src/components/order-notes/
  OrderNotePDF.tsx               # Novo

src/components/client-users/
  InviteClientDialog.tsx         # Novo
  EditClientDialog.tsx           # Novo

src/components/client-portal/orders/
  OrderCard.tsx                  # Novo
  OrderTimeline.tsx              # Novo

src/hooks/
  useOrderNotePDF.ts             # Novo

src/hooks/client-portal/
  useClientOrders.ts             # Editar (edge function)
```

### Fase 4: Integracao (6 ficheiros)
```text
src/components/contacts/timeline/
  OrderNoteEvent.tsx             # Novo

src/components/companies/timeline/
  CompanyOrderNoteEvent.tsx      # Novo

src/components/order-notes/
  CreateDealFromOrder.tsx        # Novo

src/components/client-users/
  ClientUserStats.tsx            # Novo

src/hooks/
  useContactOrderNotes.ts        # Novo
  useCompanyOrderNotes.ts        # Novo
```

---

## Detalhe Tecnico: Ficha de Produto

Layout da modal expandida:

```text
+------------------------------------------+
|  [X]                                     |
|                                          |
|  +----------------+  +------------------+|
|  |                |  | Nome Produto     ||
|  |  IMAGEM        |  | SKU: ABC-123     ||
|  |  PRINCIPAL     |  |                  ||
|  |                |  | DESCRICAO        ||
|  +----------------+  | Lorem ipsum...   ||
|  [o] [o] [o] [o]     |                  ||
|                      +------------------+|
|                                          |
|  COMPOSICAO / ATIVOS                     |
|  +--------------------------------------+|
|  | - Ingrediente A                      ||
|  | - Ingrediente B                      ||
|  +--------------------------------------+|
|                                          |
|  MODO DE USO                             |
|  +--------------------------------------+|
|  | Aplicar 2x dia...                    ||
|  +--------------------------------------+|
|                                          |
|  FUNCOES           PATOLOGIAS            |
|  [Tag1] [Tag2]     [Tag3] [Tag4]         |
|                                          |
|  +--------------------------------------+|
|  | Preco (s/IVA): 45.00€   IVA: 10.35€  ||
|  | Quantidade: [- 1 +]                  ||
|  | Subtotal (c/IVA): 55.35€             ||
|  | [     ADICIONAR AO CARRINHO     ]    ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

## Detalhe Tecnico: PDF da Nota

Estrutura do documento:

```text
+------------------------------------------+
| LOGO                    NOTA DE ENCOMENDA|
|                         NE-2026-00001    |
+------------------------------------------+
| Data: 31/01/2026                         |
| Estado: Aprovado                         |
+------------------------------------------+
| CLIENTE                                  |
| Nome: Joao Silva                         |
| NIF: 123456789                           |
| Email: joao@exemplo.pt                   |
| Morada: Rua X, Lisboa                    |
+------------------------------------------+
| PRODUTOS                                 |
| +------+----------+-----+-------+------+ |
| | Ref  | Produto  | Qtd | Preco | Subt | |
| +------+----------+-----+-------+------+ |
| | A001 | Prod A   |  2  | 25.00 | 50.00| |
| | B002 | Prod B   |  1  | 40.00 | 40.00| |
| +------+----------+-----+-------+------+ |
+------------------------------------------+
| TOTAIS                                   |
| Subtotal (s/IVA):              90.00€    |
| IVA (23%):                     20.70€    |
| TOTAL:                        110.70€    |
+------------------------------------------+
| PRESTACOES (se aplicavel)                |
| 3x de 36.90€                             |
+------------------------------------------+
| NOTAS: Entregar de manha                 |
+------------------------------------------+
```

---

## Ordem de Implementacao

**Fase 3:**
1. ProductDetailModal com galeria e info tecnica
2. Integrar edge function no useClientOrders
3. InviteClientDialog e EditClientDialog
4. OrderNotePDF para exportacao
5. Melhorar ClientOrdersPage com cards e timeline

**Fase 4:**
6. OrderNoteEvent para timeline de contactos
7. CompanyOrderNoteEvent para timeline de empresas
8. CreateDealFromOrder no detalhe admin
9. ClientUserStats com metricas

---

## Dependencias Externas

- **jsPDF**: Ja instalado (para geracao de PDF)
- **date-fns**: Ja instalado (para formatacao de datas)
- **Resend**: Ja configurado nas edge functions

---

## Notas de Implementacao

1. A ficha de produto deve buscar product_attributes do catalogo
2. O PDF usa a biblioteca jsPDF ja instalada
3. A integracao CRM usa as tabelas contacts e companies existentes
4. O hook useContactOrderNotes faz JOIN com client_users.contact_id
