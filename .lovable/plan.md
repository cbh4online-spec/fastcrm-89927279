

# Melhorar assinatura de email com ícones 3D para redes sociais

## Diagnóstico
A assinatura atual usa links de texto simples para redes sociais ("LinkedIn · X · Instagram · Facebook · YouTube · WhatsApp"). O utilizador quer substituir por ícones visuais com aspeto 3D/moderno, como é comum em assinaturas profissionais.

## Solução
Substituir os links de texto por ícones SVG inline (compatíveis com email) com estilo 3D (gradientes, sombras simuladas). Como muitos clientes de email não suportam SVG nem CSS avançado, a abordagem mais fiável é usar **imagens PNG hospedadas no storage** do projeto com aspeto 3D/glossy.

**Abordagem escolhida**: Gerar ícones 3D usando a API de geração de imagem (Gemini), fazer upload para o storage bucket, e referenciar os URLs públicos no HTML da assinatura.

## Plano

### 1. Gerar ícones 3D para cada rede social
Usar a API de imagem para criar ícones 3D/glossy (32x32px) para: LinkedIn, X, Instagram, Facebook, YouTube, WhatsApp.

### 2. Upload dos ícones para storage
Criar bucket `email-assets` (se não existir) e fazer upload dos ícones PNG.

### 3. Atualizar `generateSignatureHtml` no EmailSignatureEditor
Substituir os links de texto (`<a>LinkedIn</a>`) por `<a><img src="URL_ICONE" width="24" height="24" /></a>` com os URLs públicos dos ícones hospedados.

### Ficheiros
- **Editado**: `src/components/settings/sections/EmailSignatureEditor.tsx` (função `generateSignatureHtml`, linhas 357-365 e 384-386)
- **Storage**: Upload de 6 ícones PNG para bucket `email-assets`

