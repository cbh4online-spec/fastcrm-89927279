
# Plano: Dois Modos de Visualizacao - Interno vs. Cliente

## Objetivo

Criar dois modos distintos de visualizacao da proposta:

1. **Vista Interna (Gestao)** - Para uso interno da equipa comercial
2. **Vista Cliente (Documento Profissional)** - Para enviar ao cliente

---

## Modo 1: Vista Interna (Gestao)

Layout inspirado no modelo HAPTIC enviado, optimizado para gestao e edicao.

### Estrutura da Vista Interna

```text
+---------------------------------------------------------------------+
|  CABECALHO                                                          |
|  [Logo/Nome Empresa]                    [Agendar Chamada] [Menu]    |
|  #PROP-001 | Titulo da Proposta  ● Status                           |
+---------------------------------------------------------------------+
|  INFORMACOES GERAIS                                                 |
|  +-------------------+  +-------------------+  +-------------------+ |
|  | Referencia        |  | Validade          |  | Ponto de Contacto | |
|  | #PROP2025-001     |  | 26 Jan - 26 Fev   |  | Joao Silva        | |
|  +-------------------+  +-------------------+  | joao@empresa.com  | |
|  | Endereco          |                        | Enviar Mensagem   | |
|  | Cliente ABC       |                        +-------------------+ |
|  | Rua Exemplo, 123  |                        | Comercial         | |
|  | Lisboa, 1000-001  |                        | Maria Costa       | |
|  +-------------------+                        | maria@crm.com     | |
+---------------------------------------------------------------------+
|  TABELA DE ITENS (Editavel)                                         |
|  +------------------------------------------------------------------+
|  | Item              | Status | Qtd.      | Preco | Subtotal | Sel  |
|  +------------------------------------------------------------------+
|  | Servico A         |   -    | [10 Qtd]  | 200€  | 2.000€   | [●]  |
|  | Servico B         |   -    | [5 Qtd]   | 150€  | 750€     | [●]  |
|  | Produto X         |   -    | [2 Qtd]   | 500€  | 1.000€   | [○]  |
|  +------------------------------------------------------------------+
+---------------------------------------------------------------------+
|  Ver Comentarios (3)            [Solicitar Alteracao] [Aceitar]     |
|  +----------------------------------------------------------------+ |
|  | [Campo de comentarios...]                          [Enviar]   | |
|  +----------------------------------------------------------------+ |
|  | @ Paulo - 21 Jan 2025 18:00                                    | |
|  | Lorem ipsum dolor sit amet, consectetur...                     | |
|  +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Funcionalidades da Vista Interna

| Funcionalidade | Descricao |
|----------------|-----------|
| Toggle de itens | Activar/desactivar itens da proposta |
| Edicao de quantidades | Dropdown para ajustar quantidades |
| Comentarios | Sistema de comentarios interno |
| Historico | Ver versoes anteriores |
| Quick Actions | Agendar chamada, enviar mensagem |
| Status visual | Indicador de progresso da proposta |

---

## Modo 2: Vista Cliente (Documento Profissional)

Layout inspirado no modelo Invoice enviado, documento PDF-like profissional.

### Estrutura da Vista Cliente

```text
+---------------------------------------------------------------------+
|                                                                     |
|  +------------------+                                               |
|  |                  |         Proposta                              |
|  |  [LOGO EMPRESA]  |         No. PROP-2025-001                     |
|  |                  |         26/01/2025                            |
|  +------------------+                                               |
|                               Proposta Para:                        |
|  +------------------+        Cliente ABC                            |
|  | [Barra lateral  |         Rua Exemplo, 123                       |
|  | com cores da    |         1000-001 Lisboa                        |
|  | marca]          |         NIF: 123456789                         |
|  |                 |         Tel: +351 912 345 678                  |
|  | Morada          |                                                |
|  | Rua X, 123      |                                                |
|  | Lisboa          |                                                |
|  |                 |                                                |
|  | website.com     |                                                |
|  | email@emp.com   |                                                |
|  |                 |                                                |
|  | +351 912 XXX    |                                                |
|  +------------------+                                               |
+---------------------------------------------------------------------+
|     Item Descricao                      Preco    Qtd.    Total      |
|  ------------------------------------------------------------------ |
|  1  Servico A                           200,00€   10    2.000,00€   |
|     Descricao detalhada do servico...                               |
|                                                                     |
|  2  Servico B                           150,00€    5      750,00€   |
|     Descricao detalhada...                                          |
|                                                                     |
|  3  Produto X                           500,00€    2    1.000,00€   |
|     Especificacoes do produto...                                    |
|                                                                     |
|  ------------------------------------------------------------------ |
|                                         Subtotal :     3.750,00€    |
|                                         IVA (23%):       862,50€    |
|                                         --------------------------  |
|                                         Total :        4.612,50€    |
+---------------------------------------------------------------------+
|                                                                     |
|  Metodos de Pagamento:                       [Assinatura Digital]   |
|  - Transferencia Bancaria                                           |
|  - IBAN: PT50 0000 0000 0000 0000 0000 0                            |
|  - Multibanco                                 Nome do Responsavel   |
|                                               CEO & Diretor         |
+---------------------------------------------------------------------+
|  +--------------------------------------------------------------+  |
|  | Termos e Condicoes: Esta proposta e valida por 30 dias...   |  |
|  +--------------------------------------------------------------+  |
+---------------------------------------------------------------------+
```

### Campos para a Vista Cliente

| Secao | Campos |
|-------|--------|
| Cabecalho Empresa | Logo, Nome, Endereco, Website, Email, Telefone |
| Cabecalho Documento | Numero proposta, Data, Validade |
| Dados Cliente | Nome, Endereco, NIF, Telefone, Email |
| Tabela Itens | Numero, Descricao, Preco, Quantidade, Total |
| Totais | Subtotal, IVA (opcional), Total Geral |
| Pagamento | Metodos, IBAN, Referencias |
| Rodape | Assinatura, Termos, Observacoes |

---

## Alteracoes Tecnicas

### Fase 1: Base de Dados (Novos campos workspace)

Se nao existirem, adicionar campos a tabela `workspaces`:
- `logo_url` (text) - URL do logotipo
- `company_iban` (text) - IBAN para pagamentos
- `signature_name` (text) - Nome para assinatura
- `signature_title` (text) - Cargo para assinatura
- `payment_info` (text) - Informacoes de pagamento

### Fase 2: Novos Componentes

| Componente | Descricao |
|------------|-----------|
| `ProposalInternalView.tsx` | Vista interna completa de gestao |
| `ProposalClientDocument.tsx` | Documento profissional para cliente |
| `ProposalViewToggle.tsx` | Alternador entre vistas |
| `ProposalCommentsSection.tsx` | Sistema de comentarios interno |
| `ProposalItemsTable.tsx` | Tabela de itens com toggles |

### Fase 3: Modificar Dialog Existente

**Ficheiro:** `ProposalDetailDialog.tsx`

Adicionar toggle no cabecalho:
```typescript
const [viewMode, setViewMode] = useState<"internal" | "client">("internal");

// No TabsContent de preview:
{viewMode === "internal" ? (
  <ProposalInternalView proposal={proposal} items={proposalItems} />
) : (
  <ProposalClientDocument proposal={proposal} items={proposalItems} workspace={workspace} />
)}
```

### Fase 4: Integrar Dados do Workspace

O documento cliente usara dados do workspace actual:
- `company_name` - Nome da empresa
- `billing_address`, `billing_city`, `billing_postal_code` - Endereco
- `phone`, `website` - Contactos
- `tax_id` - NIF da empresa
- `logo_url` - Logotipo (novo campo)

### Fase 5: Funcionalidade de Exportacao PDF

Adicionar botao para exportar a vista cliente como PDF usando a biblioteca `jspdf` ja instalada.

---

## Resumo das Alteracoes

| Tipo | Ficheiro | Accao |
|------|----------|-------|
| DB | `workspaces` table | Adicionar campos logo_url, iban, etc. (se necessario) |
| Novo | `ProposalInternalView.tsx` | Vista interna com tabela editavel |
| Novo | `ProposalClientDocument.tsx` | Documento profissional |
| Novo | `ProposalViewToggle.tsx` | Alternador de vistas |
| Novo | `ProposalCommentsSection.tsx` | Comentarios internos |
| Editar | `ProposalDetailDialog.tsx` | Integrar toggle e duas vistas |
| Editar | `PublicProposalPage.tsx` | Usar ProposalClientDocument |

---

## Resultado Esperado

1. **Vista Interna**: Painel funcional para a equipa gerir propostas, editar itens, adicionar comentarios
2. **Vista Cliente**: Documento profissional com branding da empresa, pronto para enviar ou exportar PDF
3. **Toggle facil**: Alternar entre vistas com um clique
4. **Pagina publica**: Clientes veem apenas a vista profissional
5. **Exportacao PDF**: Gerar documento para envio offline
