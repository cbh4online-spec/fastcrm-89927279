
# Adicionar botao de rejeitar lead no painel de Outreach em Massa

## Problema

No painel de Outreach em Massa, nao existe forma de rejeitar/saltar um perfil que o utilizador nao quer contactar. A unica opcao e enviar ou fechar o painel inteiro.

## Solucao

Adicionar um botao "Rejeitar" a cada perfil no painel de Outreach em Massa que:
1. Marca o perfil como `status: "rejected"` na base de dados (mesmo padrao ja usado no `ProspectingResults.tsx`)
2. Remove-o visualmente da lista (ou marca como rejeitado com opacidade reduzida)
3. Atualiza os contadores de progresso para excluir perfis rejeitados
4. Avanca automaticamente para o proximo perfil

## Alteracoes

### Ficheiro: `src/components/professional-prospecting/BulkOutreachDialog.tsx`

1. **Novo estado `rejectedIds`** (junto aos outros estados, linha 74):
   - `const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());`

2. **Nova funcao `handleReject`**:
   - Atualiza o perfil na BD com `status: "rejected"`, `rejection_reason: "Rejeitado no outreach em massa"`
   - Adiciona o ID ao set `rejectedIds`
   - Invalida queries de perfis
   - Mostra toast de confirmacao

3. **Atualizar `ProfileState`** (linha 59):
   - Adicionar estado `"rejected"` ao tipo
   - Atualizar `getProfileState` para verificar `rejectedIds`

4. **Atualizar contadores** (linhas 80-86):
   - `totalProfiles` efetivo exclui rejeitados: `profiles.length - rejectedIds.size`
   - `allDone` considera perfis rejeitados como processados
   - `nextProfile` ignora perfis rejeitados

5. **UI do botao Rejeitar**: Adicionar um botao com icone `X` ou `Ban` junto ao botao "Abrir DM" para perfis em estado `idle`:
   - Botao discreto (variant ghost, texto vermelho) para nao competir com o botao principal
   - Texto: "Rejeitar" com icone X

6. **Visual de perfil rejeitado**: Semelhante ao "sent" mas com estilo vermelho/cinza:
   - Badge "Rejeitado" em vermelho
   - Opacidade reduzida

7. **Reset do estado** ao fechar (linha 100): limpar `rejectedIds`

8. **Mensagem de progresso** atualizada para mostrar rejeitados separadamente:
   - Ex: "3 de 16 enviados, 2 rejeitados"
