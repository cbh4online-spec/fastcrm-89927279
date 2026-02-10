

# Corrigir Email de Convite da Comunidade

## Problemas Identificados

1. **Botao CTA invisivel**: O botao "Juntar-se a Comunidade" usa `background: linear-gradient(...)` que muitos clientes de email (Gmail, Outlook) nao suportam. Resultado: botao aparece branco/invisivel.

2. **Link expoe dominio lovable**: O URL de fallback mostra `fastcrm.lovable.app`, deveria usar o dominio proprio ou pelo menos nao mostrar "lovable" no rodape.

## Solucao

### Corrigir o botao CTA
Substituir `linear-gradient` por `background-color` solida (compativel com todos os clientes de email). Gradientes CSS nao sao suportados em Gmail, Outlook, Yahoo Mail, etc.

### Limpar rodape
Remover referencia ao dominio lovable no texto de fallback. Usar apenas o texto "Juntar-se a Comunidade" como link clicavel sem expor o URL completo em texto.

## Detalhes Tecnicos

### Ficheiro: `supabase/functions/send-community-invite/index.ts`

**Botao CTA (linha 138):**
- De: `background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%)`
- Para: `background-color:${primaryColor}`
- Remover `box-shadow` com cor alpha (tambem mal suportado)

**Header gradient (linha 114):**
- De: `background:linear-gradient(135deg,...)`
- Para: `background-color:${primaryColor}`

**Fallback link (linhas 143-146):**
- Simplificar para mostrar apenas o link clicavel sem expor o URL raw
- Ou encurtar a apresentacao do URL

**Rodape (linhas 153-158):**
- Manter apenas "Este email foi enviado por [NomeComunidade]"
- Remover qualquer menção a lovable

