
# Gestao Avancada de Vendedores C2C

## Resumo

Expandir a pagina de gestao de vendedores (`/dashboard/c2c/sellers`) de uma simples tabela de aprovacao para um painel de gestao completo com perfil detalhado, historico de vendas por vendedor, edicao de comissoes individuais, anuncios ativos, verificacao manual, comunicacao direta e exportacao de dados.

## Funcionalidades a Adicionar

### 1. Perfil Expandido do Vendedor (Dialog melhorado)
O dialog de detalhes atual mostra apenas dados basicos. Sera expandido com tabs:
- **Perfil**: Dados pessoais, bancarios e fiscais (atual, melhorado com avatar e verificacao)
- **Anuncios**: Lista de anuncios do vendedor com status (ativos, vendidos, removidos)
- **Vendas**: Historico de comissoes/transacoes do vendedor com totais
- **Avaliacoes**: Reviews recebidas pelo vendedor

### 2. Edicao de Dados do Vendedor pelo Admin
- Editar comissao individual (override do default 5%)
- Marcar como verificado/nao verificado (selo de confianca)
- Editar dados bancarios (IBAN, banco, titular)
- Reativar vendedor suspenso/rejeitado

### 3. Metricas por Vendedor na Tabela
- Adicionar colunas: Total Vendas, Receita, Rating, Verificado
- Ordenacao por qualquer coluna

### 4. Acoes em Massa
- Selecionar multiplos vendedores
- Aprovar/suspender em massa
- Enviar notificacao em massa

### 5. Exportacao CSV
- Botao para exportar lista de vendedores com todos os dados para CSV

### 6. Notas Internas do Admin
- Campo para o admin adicionar notas internas sobre cada vendedor (nao visiveis ao vendedor)

## Seccao Tecnica

### Migracao SQL

Adicionar tabela de notas internas e campo de notas:

```sql
CREATE TABLE public.c2c_seller_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.c2c_sellers(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_seller_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage seller notes"
  ON public.c2c_seller_notes FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
```

### Novo Hook: `src/hooks/useC2CSellerAdmin.ts`

Hook dedicado a gestao avancada com:
- `useSellerListings(sellerId)` - buscar anuncios de um vendedor
- `useSellerCommissions(sellerId)` - buscar comissoes/vendas
- `useSellerReviews(sellerId)` - buscar avaliacoes
- `useUpdateSellerDetails()` - editar comissao, verificacao, dados bancarios
- `useSellerNotes(sellerId)` - listar notas internas
- `useAddSellerNote()` - adicionar nota interna
- `useBulkUpdateSellers()` - acoes em massa

### Ficheiro Modificado: `src/pages/c2c/C2CSellersAdmin.tsx`

Redesenho completo:
- Tabela com mais colunas (vendas, receita, rating, verificado)
- Checkboxes para selecao em massa
- Toolbar com acoes em massa e botao exportar CSV
- Dialog de detalhes com sistema de Tabs (Perfil, Anuncios, Vendas, Avaliacoes, Notas)
- Formulario de edicao inline para comissao e verificacao
- Ordenacao de colunas clicavel

### Ficheiro Modificado: `src/hooks/useC2CSellers.ts`

Adicionar mutation para editar detalhes do vendedor (comissao, verificacao, dados bancarios, reativar).

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | Criar tabela `c2c_seller_notes` com RLS |
| `src/hooks/useC2CSellerAdmin.ts` | Novo hook com queries para listings, comissoes, reviews, notas e acoes em massa |
| `src/hooks/useC2CSellers.ts` | Adicionar mutation `useUpdateSellerDetails` |
| `src/pages/c2c/C2CSellersAdmin.tsx` | Redesenho com tabela expandida, tabs no dialog, selecao em massa, export CSV |
