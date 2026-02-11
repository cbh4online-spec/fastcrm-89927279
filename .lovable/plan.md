
# Tornar a Plataforma numa Ferramenta de Venda Completa

## O que ja existe
- Criacao de anuncios com IA (foto, titulo, descricao, preco, categoria)
- Marketplace com categorias, pesquisa, favoritos
- Chat entre comprador e vendedor
- Sistema de boost/CPC
- Dashboard do vendedor (KPIs basicos)
- Reviews e verificacao de vendedores
- Checkout e comissoes

## O que falta para competir com Vinted/OLX/KuantoKusta/StandVirtual

### 1. Perfil Publico do Vendedor
Na Vinted e OLX, cada vendedor tem uma pagina publica com os seus anuncios, rating, tempo na plataforma e badge de verificacao. Atualmente o comprador ve o anuncio mas nao consegue explorar o vendedor.

**Criar**: Pagina `/c2c/seller/:sellerId` com avatar, nome, bio, rating, numero de vendas, lista de anuncios ativos e reviews recebidas.

### 2. Sistema de Ofertas/Contraproposta (estilo Vinted)
Na Vinted, o comprador pode propor um preco diferente. O vendedor aceita, recusa ou contrapropoe. Atualmente so existe "Comprar agora" ou mensagem livre.

**Criar**: Botao "Fazer Oferta" na pagina do anuncio, com dialog para propor valor. O vendedor recebe notificacao e pode aceitar/recusar/contrapropor na pagina "Meus Anuncios".

### 3. Editar Anuncio Existente
Na OLX/Vinted e possivel editar titulo, preco, descricao e fotos depois de publicar. Atualmente so existe pausar/remover, nao editar.

**Criar**: Pagina de edicao de anuncio reutilizando o formulario de criacao, pre-preenchido com os dados existentes. Botao "Editar" nos cards de "Meus Anuncios".

### 4. Marcar como Vendido + Avaliar Comprador
Na Vinted, apos a venda o vendedor pode avaliar o comprador. Atualmente so existe reviews do vendedor.

**Criar**: Acao "Marcar como vendido" com dialog para indicar comprador e deixar review mutua.

### 5. Notificacoes do Vendedor (Centro de Atividade)
Na Vinted existe um feed de atividade: "Alguem adicionou o teu anuncio aos favoritos", "Nova mensagem", "Nova oferta", "O teu anuncio foi visto X vezes". Atualmente nao existe.

**Criar**: Pagina de notificacoes com feed de eventos relevantes para o vendedor (favoritos recebidos, mensagens, visualizacoes, ofertas).

### 6. Partilha Social do Anuncio
Na OLX e Vinted, cada anuncio tem botoes de partilha para WhatsApp, Facebook, copiar link. Atualmente nao existe.

**Criar**: Botoes de partilha na pagina de detalhe do anuncio e nos cards de "Meus Anuncios".

### 7. Estatisticas por Anuncio (para o vendedor)
No OLX Pro, o vendedor ve quantas visualizacoes, favoritos e mensagens cada anuncio recebeu. Atualmente so existe um contador de views global.

**Criar**: Mini-dashboard por anuncio na pagina "Meus Anuncios": views, favoritos recebidos, mensagens recebidas, posicao nos resultados.

## Seccao Tecnica

### Migracao SQL

```sql
-- Tabela de ofertas
CREATE TABLE public.c2c_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id),
  buyer_id UUID NOT NULL,
  offer_price NUMERIC NOT NULL,
  counter_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, rejected, countered, expired
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.c2c_offers ENABLE ROW LEVEL SECURITY;

-- Tabela de notificacoes do vendedor
CREATE TABLE public.c2c_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,  -- new_message, new_offer, new_favorite, listing_view_milestone, offer_accepted, offer_rejected
  title TEXT NOT NULL,
  body TEXT,
  listing_id UUID REFERENCES public.c2c_listings(id),
  related_user_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.c2c_notifications ENABLE ROW LEVEL SECURITY;

-- Contadores de favoritos por listing para estatisticas
ALTER TABLE public.c2c_listings ADD COLUMN favorites_count INTEGER DEFAULT 0;
ALTER TABLE public.c2c_listings ADD COLUMN messages_count INTEGER DEFAULT 0;
```

RLS policies para ofertas e notificacoes (comprador ve as suas, vendedor ve as do seu anuncio, utilizador ve as suas notificacoes).

### Ficheiros a Criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/c2c/C2CSellerProfile.tsx` | Pagina publica do vendedor com anuncios, rating, reviews |
| `src/pages/c2c/C2CEditListing.tsx` | Formulario de edicao (reutiliza logica do create) |
| `src/pages/c2c/C2CNotifications.tsx` | Centro de atividade/notificacoes do vendedor |
| `src/components/c2c/OfferDialog.tsx` | Dialog para fazer/gerir ofertas |
| `src/components/c2c/ShareButtons.tsx` | Botoes de partilha social (WhatsApp, Facebook, copiar link) |
| `src/components/c2c/ListingStats.tsx` | Mini-dashboard de estatisticas por anuncio |
| `src/hooks/useC2COffers.ts` | Hook para criar, aceitar, rejeitar, contrapropor ofertas |
| `src/hooks/useC2CNotifications.ts` | Hook para listar e marcar notificacoes como lidas |

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/c2c/C2CListingDetail.tsx` | Adicionar botao "Fazer Oferta", link para perfil do vendedor, botoes de partilha |
| `src/pages/c2c/C2CMyListings.tsx` | Adicionar botao editar, estatisticas por anuncio, gestao de ofertas recebidas |
| `src/pages/c2c/C2CMarketplace.tsx` | Adicionar icone de notificacoes no header com badge de nao lidas |
| Routing (App.tsx ou similar) | Adicionar rotas para perfil publico, editar anuncio e notificacoes |

### Prioridade de Implementacao

1. **Perfil Publico do Vendedor** - impacto alto na confianca
2. **Editar Anuncio** - funcionalidade basica que falta
3. **Sistema de Ofertas** - diferenciador competitivo (Vinted-style)
4. **Partilha Social** - rapido de implementar, alto impacto
5. **Estatisticas por Anuncio** - valor para o vendedor
6. **Centro de Notificacoes** - engagement e retencao
7. **Marcar como Vendido + Review Mutua** - fecho do ciclo de venda
