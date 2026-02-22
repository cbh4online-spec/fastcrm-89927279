
# Fix: Resultados da prospecao nao aparecem

## Diagnostico

A pesquisa mais recente ("Fisioterapeuta, Lisboa" - ID `618a3616`) encontrou 50 perfis, mas a analise falhou porque o limite estava em 200/200. Os perfis **nunca foram guardados** na base de dados porque a funcao de analise rejeitou o pedido com erro 429.

Depois de aumentar o limite para 500, o frontend continua a mostrar "Sem resultados" porque esta a filtrar por `search_id = 618a3616`, que nao tem perfis associados na BD.

## Solucao

### 1. Correcao no frontend (ProspectingSearch.tsx)

Alterar o fluxo para **nao navegar para resultados** quando a analise falha. Actualmente, mesmo quando a analise falha (linhas 116-123), o codigo continua para a linha 128 e chama `onSearchComplete(data.searchId)`, mostrando uma pagina vazia.

Alteracao:
- Se a analise falhar, mostrar erro e **nao navegar** para o tab de resultados
- Adicionar `return` apos o erro de analise para evitar navegacao

### 2. Correcao no frontend (ProspectingResults.tsx)

Melhorar o estado vazio quando `searchId` existe mas nao ha perfis:
- Adicionar botao "Repetir pesquisa" que volta ao tab de pesquisa
- Parar o polling (`refetchInterval`) apos um timeout (ex: 30 segundos sem resultados)

### 3. Acao imediata

O utilizador precisa de **repetir a pesquisa** "Fisioterapeuta, Lisboa". Agora com o limite em 500, a analise vai funcionar e os perfis serao guardados.

## Detalhes tecnicos

### ProspectingSearch.tsx - Nao navegar se analise falhou

```typescript
// Linha ~116-128: adicionar return quando analise falha
if (analysisError) {
  console.error("Analysis error:", analysisError);
  toast.error("Erro na analise de perfis");
  return; // <-- NOVO: nao navegar para resultados
} else if (analysisData.success) {
  // ...
}
// Mover onSearchComplete para dentro do else if success
```

### ProspectingResults.tsx - Melhorar estado vazio

```typescript
// Adicionar timeout para parar polling
// Adicionar botao para voltar a pesquisa quando nao ha resultados
```
