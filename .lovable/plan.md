

# Reorganizar MQPC: SKU como primeiro passo

## Conceito

Alterar o fluxo de criacao de produto para iniciar pelo SKU. Quando o utilizador introduz um SKU, o sistema pesquisa automaticamente via IA e pre-preenche o maximo de campos possiveis (nome, preco, descricoes, imagens externas). O utilizador revisa e ajusta apenas o necessario.

## Novo fluxo (4 passos)

```text
[1. SKU]  -->  [2. Imagens]  -->  [3. Dados]  -->  [4. Extras]
   |                                   |               |
   +-- Pesquisa IA automatica          |               |
   +-- Pre-preenche nome, preco,       |               |
       descricoes, categoria           |               |
                      Pre-carrega imagens do SKU       |
                                  Campos ja preenchidos pela IA
                                                   Descricoes ja geradas
```

## Alteracoes

### 1. Novo componente: `src/components/mqpc/MQPCStepSKU.tsx`

- Campo de input para SKU com botao "Pesquisar"
- Ao submeter, chama `searchBySKU` do hook `useProductAIAssistant`
- Mostra loading com animacao durante a pesquisa
- Se encontrar resultado:
  - Mostra preview do que a IA encontrou (nome, preco sugerido, categoria, imagens)
  - Botao "Usar estes dados" para aceitar e avancar
  - Botao "Ignorar e continuar manualmente" para saltar
- Se nao encontrar: mensagem informativa + botao para continuar manualmente
- Botao "Saltar" sempre visivel para quem nao tem SKU

### 2. Modificar: `src/components/mqpc/MQPCWizard.tsx`

- Adicionar Step 0 (SKU) antes dos steps actuais
- Actualizar `STEPS` de `["Imagens", "Dados", "Extras"]` para `["SKU", "Imagens", "Dados", "Extras"]`
- Quando a pesquisa SKU retorna dados, pre-preencher:
  - `details.name` com `commercialName` ou `name`
  - `details.price` com `suggestedPrice` (convertido a string)
  - `extras.shortDescription` com `commercialDescription`
  - `extras.fullDescription` com `technicalDescription`
  - `extras.sku` com o SKU introduzido
- Se a IA retornar `category`, tentar fazer match com as categorias existentes pelo nome e pre-seleccionar `details.categoryId`
- Se a IA retornar imagens (`images` array), pre-carregar no state de imagens como URLs externas para o utilizador ver (sem upload -- o upload real acontece no Step Imagens)

### 3. Modificar: `src/components/mqpc/MQPCStepDetails.tsx`

- Sem alteracoes estruturais -- os campos simplesmente aparecem pre-preenchidos
- Indicacao visual (badge ou texto) nos campos que foram preenchidos pela IA para o utilizador saber

### 4. Modificar: `src/components/mqpc/MQPCStepExtras.tsx`

- Se as descricoes ja vieram do SKU, o botao "Melhorar com IA" mostra estado "ja melhorado" automaticamente
- Sem alteracoes estruturais

## Detalhes tecnicos

### `MQPCStepSKU.tsx` -- Componente principal

```text
Estado interno:
- skuInput: string
- searchResult: SKUSearchResult | null
- searched: boolean

Props:
- onSKUResult: (result: SKUSearchResult, sku: string) => void
- onSkip: () => void

Usa: useProductAIAssistant().searchBySKU
```

### `MQPCWizard.tsx` -- Alteracoes chave

- Nova funcao `handleSKUResult(result, sku)` que pre-preenche todos os states
- Match de categoria por nome: `categories.find(c => c.name.toLowerCase().includes(result.category.toLowerCase()))`
- Step counter passa de 3 para 4 steps
- Validacoes e navegacao actualizadas para o novo indice

### Sem alteracoes no backend

A edge function `ai-product-assistant` (modo `sku-search`) ja retorna todos os dados necessarios. Nenhuma alteracao no backend e necessaria.
