

# Melhorar UX do Dialog de Outreach em Massa

## Problemas identificados

1. **Dialog desaparece**: Clicar fora do dialog ou carregar Escape fecha-o imediatamente, mesmo durante a geracao de mensagens
2. **Fluxo confuso**: Nao ha instrucoes claras passo-a-passo do que fazer
3. **Sem confirmacao ao fechar**: Se fechar acidentalmente, perde todo o progresso
4. **Mensagens geradas nao sao visiveis de imediato**: O estado de loading nao e suficientemente claro

## Solucao

### 1. Impedir fecho acidental do dialog

- Bloquear fecho por clique fora (overlay) e tecla Escape enquanto esta a gerar ou enquanto ha perfis por enviar
- Adicionar confirmacao "Tem a certeza?" se tentar fechar com perfis pendentes
- So permitir fechar livremente quando todos os perfis foram enviados

### 2. Melhorar o fluxo visual com etapas claras

Adicionar 3 estados visuais distintos no dialog:

- **Estado 1 - A Gerar**: Animacao de loading com progresso claro "A preparar mensagens... 3 de 12"
- **Estado 2 - Pronto para Enviar**: Lista de mensagens com botao grande "Proximo perfil" destacado no fundo. Instrucao clara: "Clique 'Proximo' para copiar a mensagem e abrir o Instagram"
- **Estado 3 - Concluido**: Resumo "12/12 enviados!" com botao "Concluir"

### 3. Botao "Proximo perfil" mais prominente

- Tornar o botao "Proximo perfil" maior e com cor primaria
- Mostrar o nome do proximo perfil no botao: "Enviar para Ricardo Silva"
- Scroll automatico para o perfil activo

### 4. Impedir fecho durante geracao

- `onOpenChange` so aceita `false` se nao estiver a gerar e se o utilizador confirmar

## Ficheiros a modificar

- **`src/components/professional-prospecting/BulkOutreachDialog.tsx`** - toda a logica de UX melhorada

## Detalhes tecnicos

### BulkOutreachDialog.tsx

1. Alterar `onOpenChange` para nao fechar durante geracao:
```
onOpenChange={(open) => {
  if (!open && isGenerating) return; // bloquear fecho durante geracao
  if (!open && sentCount < totalProfiles && sentCount > 0) {
    // mostrar confirmacao
    setShowCloseConfirm(true);
    return;
  }
  handleClose();
}}
```

2. Adicionar estado de confirmacao de fecho com mini-dialog inline

3. Redesenhar o layout com 3 fases visuais claras:
   - Fase de geracao: spinner grande centrado com barra de progresso
   - Fase de envio: lista com highlight no perfil activo + botao grande "Enviar para [Nome]"
   - Fase concluida: icone de sucesso + resumo

4. Scroll automatico para o proximo perfil nao enviado usando `scrollIntoView`

5. Botao "Proximo perfil" mostra o nome: "Abrir DM de [Nome]" em vez de generico "Proximo perfil"

