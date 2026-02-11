
# Adicionar Bio e Foto de Perfil ao Vendedor Strongadget

## O que vai ser feito

Atualizar os dados do vendedor Strongadget na base de dados com uma bio descritiva e uma foto de perfil (avatar).

## Alteracoes

### 1. Atualizar bio do vendedor

Inserir uma bio profissional para o Strongadget diretamente na tabela `c2c_sellers`:

- **Bio**: Uma descricao curta e profissional (ex: "Especialistas em gadgets e acessorios tecnologicos. Produtos novos e seminovos com garantia de qualidade.")

### 2. Foto de perfil (avatar)

Para a foto de perfil, existem duas opcoes:

- **Opcao A (rapida)**: Usar um URL externo de uma imagem (se tiveres uma imagem/logo do Strongadget, podes envia-la no chat e eu uso-a)
- **Opcao B**: Fazer upload de uma imagem para o bucket `avatars` ja existente e guardar o URL publico

### 3. Verificar que o perfil publico mostra os novos dados

A pagina `C2CPublicSellerProfile.tsx` ja suporta exibir `bio` e `avatar_url`, por isso nao serao necessarias alteracoes de codigo - apenas atualizar os dados na base de dados.

## Preciso de input

Para avancar preciso que me digas:
- Que texto queres na bio do Strongadget?
- Tens uma imagem/logo para usar como avatar? Se sim, envia-a no chat. Caso contrario, posso deixar sem foto ou usar as iniciais que ja aparecem.
