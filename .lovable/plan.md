

# Enriquecer Módulo de Fornecedores

## Problema Atual

O formulário de fornecedor tem apenas: Nome, NIF, IBAN, Email, Telefone, Morada, Categoria, Condições de Pagamento, Estado, Notas. Faltam dados operacionais importantes e não há forma de descobrir fornecedores automaticamente.

---

## 1. Novos Campos na Base de Dados

Adicionar à tabela `suppliers`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `website` | text | Site do fornecedor |
| `platforms` | jsonb | Plataformas onde operam (ex: Amazon, AliExpress, site próprio) com URLs e credenciais de acesso |
| `product_categories` | text[] | Categorias de produtos que vendem |
| `certifications` | text[] | Certificações (ISO, etc.) |
| `rating` | integer | Avaliação interna 1-5 estrelas |
| `contact_person` | text | Nome do contacto principal |
| `contact_person_role` | text | Cargo do contacto |
| `logo_url` | text | Logo do fornecedor |
| `min_order_value` | numeric | Valor mínimo de encomenda |
| `delivery_time_days` | integer | Prazo médio de entrega |
| `country` | text | País de origem |
| `tags` | text[] | Tags livres para classificação |

## 2. Formulário Expandido com Tabs

Reorganizar o `SupplierForm` em secções com Tabs:

- **Dados Gerais**: Nome, NIF, IBAN, Email, Telefone, Morada, País, Estado, Categoria
- **Comercial**: Condições de pagamento, Valor mínimo encomenda, Prazo entrega, Rating (estrelas), Certificações
- **Produtos & Plataformas**: Categorias de produtos (tags), Plataformas com URLs de acesso
- **Contacto & Notas**: Contacto principal, Cargo, Website, Tags, Notas

Usar dialog mais largo (`max-w-2xl`) com `Tabs` internos.

## 3. Tabela de Listagem Melhorada

Adicionar colunas visíveis:
- Rating (estrelas)
- País
- Website (link clicável)
- Contacto principal
- Manter as existentes

## 4. Pesquisa de Fornecedores com Conectores

- **SupplierSearchDialog**: Modal com campo de pesquisa livre (ex: "fornecedor de parafusos em Portugal")
- **Edge function `supplier-web-search`**: Usa Lovable AI (Gemini Flash) para interpretar resultados de pesquisa web e extrair dados estruturados de fornecedores
- **Import direto**: Dos resultados da pesquisa, o utilizador pode importar diretamente para a tabela de fornecedores com os campos pré-preenchidos
- Botão "Pesquisar Fornecedores" na page header ao lado do "Adicionar Fornecedor"

---

## Implementação Técnica

### Ficheiros Modificados
- `SupplierForm.tsx` — Expandir com tabs e novos campos
- `SuppliersPage.tsx` — Adicionar colunas na tabela + botão pesquisa

### Ficheiros Novos
- `SupplierSearchDialog.tsx` — Modal de pesquisa com resultados e import
- `supabase/functions/supplier-web-search/index.ts` — Edge function para descoberta

### Migração SQL
- ALTER TABLE suppliers ADD COLUMN para cada novo campo

### Ordem
1. Migração DB
2. Formulário expandido
3. Tabela melhorada
4. Pesquisa de fornecedores

