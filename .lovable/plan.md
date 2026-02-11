

# Corrigir link /sell e publicar alteracoes no dominio personalizado

## Problema

O dominio personalizado (`fastcrm.metodopare.ai`) esta a correr uma versao antiga do codigo que nao inclui as rotas publicas do C2C. Quando se acede a `/c2c/metodopare/sell`, o sistema nao encontra a rota e redireciona para `/onboarding`. As alteracoes feitas anteriormente (rotas publicas, redirect nos formularios de login) nunca foram publicadas.

Como o botao "Publicar" nao mostra alteracoes pendentes, e necessario forcar uma nova compilacao com uma pequena alteracao no codigo.

## Solucao

### 1. Forcar nova compilacao (trigger de publish)

Adicionar um comentario inofensivo num ficheiro relevante (por exemplo, `src/App.tsx`) para que o sistema detete uma alteracao e permita publicar.

### 2. Publicar

Apos a alteracao, clicar em "Publicar" para enviar o codigo atualizado para o dominio personalizado.

## O que sera corrigido apos publicar

Todas as alteracoes ja feitas anteriormente passarao a funcionar no dominio personalizado:

- **`/c2c/metodopare`** -- marketplace publico acessivel sem login
- **`/c2c/metodopare/sell`** -- pagina de registo de vendedor acessivel sem login
- **Botao "Entrar"** -- redireciona de volta ao marketplace apos login (em vez de ir para o onboarding do CRM)
- **Botao "Comecar a Vender"** -- redireciona de volta a pagina de registo apos login

## Secao tecnica

A unica alteracao de codigo e um comentario no `src/App.tsx` para forcar o rebuild:

```typescript
// Force rebuild for C2C public routes deployment
```

Nao ha alteracoes funcionais -- todas as correcoes ja estao implementadas no codigo, apenas falta publicar.

