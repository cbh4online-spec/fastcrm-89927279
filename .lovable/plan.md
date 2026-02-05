
# Plano: Publicar/Ocultar Produtos no Portal B2B

## ✅ IMPLEMENTADO

## Objectivo

Adicionar um toggle que permite ao utilizador escolher se cada produto deve aparecer (ou não) no catálogo do Portal B2B.

## Alterações Realizadas

### 1. ✅ Base de Dados - Nova Coluna

Coluna `b2b_published` adicionada à tabela `products`:
- Tipo: `boolean`
- Valor padrão: `true` (produtos existentes continuam visíveis)

### 2. ✅ Tipo TypeScript

Campo `b2b_published` adicionado aos tipos:
- `Product` interface
- `CreateProductInput` interface

### 3. ✅ Formulário de Criação/Edição

Toggle "Publicar no Portal B2B" adicionado ao `CreateProductDialog.tsx`:
- Localização: Secção dedicada após o modelo de consumo
- Valor padrão: `true` (publicado por defeito)
- Descrição: "Quando ativo, este produto ficará visível no catálogo para clientes B2B"

### 4. ✅ Hook de Produtos

`useProducts.ts` actualizado para incluir `b2b_published` nas operações de update.

### 5. ✅ Listagem de Produtos no Portal B2B

`useClientProducts.ts` actualizado com filtro `.eq("b2b_published", true)` - apenas produtos publicados são visíveis.

### 6. ✅ Indicador Visual

- **ProductsList.tsx**: Nova coluna "Portal B2B" com badge "Publicado" (verde) ou "Oculto" (cinza)
- **ProductDetailDialog.tsx**: Badge "B2B" ou "B2B Oculto" no cabeçalho do produto

## Fluxo de Utilização

```text
ADMINISTRADOR (Dashboard)
└─> Cria/edita produto
    └─> Define "Publicar no Portal B2B" = ON/OFF
        └─> Guarda produto
            │
            ├─ b2b_published = true  → Aparece no catálogo B2B
            └─ b2b_published = false → Invisível para clientes
```

## Benefícios

1. ✅ Controlo granular - Escolher produto a produto o que mostrar
2. ✅ Produtos internos - Manter produtos apenas para uso interno/propostas
3. ✅ Lançamentos faseados - Preparar produtos antes de os tornar públicos
4. ✅ Catálogo limpo - Mostrar apenas produtos relevantes para clientes B2B
