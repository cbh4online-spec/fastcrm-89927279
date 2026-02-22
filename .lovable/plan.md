

# Botao "Enviar" no dialog de mensagem - Fast Send

## Resumo

Adicionar um botao "Enviar" ao dialog de geracao de mensagem que copia automaticamente a mensagem para o clipboard e abre o perfil Instagram num novo separador, pronto para colar a mensagem no DM. Tudo num unico clique.

## Alteracoes

### Ficheiro: `src/components/professional-prospecting/ProspectingMessageDialog.tsx`

1. Adicionar `profile_url` ao interface `ProfileData`
2. Adicionar botao "Enviar" (com icone Send/ExternalLink) ao lado de "Copiar mensagem"
3. A accao do botao:
   - Copia a mensagem para o clipboard
   - Abre o perfil Instagram (`profile_url`) num novo separador
   - Mostra toast de confirmacao "Mensagem copiada! A abrir perfil..."
   - Fecha o dialog automaticamente
4. O botao "Enviar" sera o botao primario (destaque visual), "Copiar mensagem" passa a secundario

### Ficheiro: `src/components/professional-prospecting/ProspectingResults.tsx`

- Garantir que `profile_url` e passada ao `ProspectingMessageDialog` (ja passa o profile completo, so precisa confirmar que o tipo inclui `profile_url`)

### Layout dos botoes (de-para)

**Antes:** `[Regenerar]  ............  [Copiar mensagem]`

**Depois:** `[Regenerar]  ............  [Copiar]  [Enviar no Instagram]`

O botao "Enviar no Instagram" sera o primario com cor de destaque, tornando o fluxo: gerar -> enviar -> um clique.

