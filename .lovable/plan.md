

## Diagnóstico

A hierarquia de layout que contém a tabela de produtos tem um problema clássico de CSS flexbox: containers flex sem `min-h-0`, o que impede o scroll de funcionar.

**Cadeia de scroll actual:**
```text
<main class="flex-1 overflow-auto p-6">           ← DashboardLayout (scrollável)
  <div class="flex h-full -m-6">                  ← ProductsList root (linha 801)
    <div class="flex-1 flex flex-col p-6           ← Conteúdo principal (linha 820)
                overflow-y-auto">
      <Card class="overflow-hidden">               ← Card da tabela (linha 1035)
        <div class="overflow-x-auto">              ← Wrapper horizontal (linha 1053)
          <Table>                                   ← Tabela de produtos
```

**Causa raiz:** Em flexbox, um filho com `flex-1` não encolhe abaixo do tamanho do seu conteúdo a menos que tenha `min-height: 0` (ou `min-h-0` em Tailwind). Sem isto, o div da linha 801 e o div da linha 820 expandem-se para acomodar todo o conteúdo da tabela em vez de activar o scroll. O resultado é que o conteúdo fica cortado pelo `overflow-hidden` do Card ou pelo `overflow-hidden` do layout pai (`h-screen`), mostrando apenas as primeiras linhas visíveis.

## Plano de implementação

### 1. Corrigir o container raiz do ProductsList (linha 801)
**Ficheiro:** `src/components/products/ProductsList.tsx`

Alterar de:
```tsx
<div className="flex h-full -m-6">
```
Para:
```tsx
<div className="flex h-full min-h-0 -m-6">
```

### 2. Corrigir o container principal do conteúdo (linha 820)
**Ficheiro:** `src/components/products/ProductsList.tsx`

Alterar de:
```tsx
<div className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto">
```
Para:
```tsx
<div className="flex-1 flex flex-col min-w-0 min-h-0 p-6 overflow-y-auto">
```

### 3. Garantir que o Card não corta a tabela verticalmente (linha 1035)
**Ficheiro:** `src/components/products/ProductsList.tsx`

O `overflow-hidden` no Card está a cortar linhas que excedem a altura visível. Deve permitir crescer naturalmente dentro do container scrollável:

Alterar de:
```tsx
<Card className="overflow-hidden">
```
Para:
```tsx
<Card className="overflow-x-hidden">
```

Isto mantém o clip horizontal (para a tabela wide) mas permite que o Card cresça verticalmente sem cortar linhas.

### Ficheiros a alterar
- `src/components/products/ProductsList.tsx` — 3 alterações de classes CSS (linhas 801, 820, 1035)

### Critérios de aceitação
- Ao seleccionar 10, 25, 50 ou 100 por página, todas as linhas são visíveis via scroll vertical
- O scroll horizontal da tabela continua a funcionar
- O dropdown de page size abre e permite seleccionar qualquer opção
- A paginação (botões anterior/seguinte) continua funcional
- O layout não quebra em viewports mais pequenos

