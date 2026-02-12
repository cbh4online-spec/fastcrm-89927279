
# Enriquecer a experiencia dentro dos canais do forum

## Problema

Quando se seleciona um canal, a experiencia e pobre: apenas um pequeno banner com o nome do canal e a lista de topicos (ou estado vazio generico). Falta animacao, contexto visual, e elementos que incentivem o engagement.

## Alteracoes

### 1. Banner de canal imersivo (substituir o banner simples)

Quando um canal esta selecionado, mostrar um banner mais rico com:
- Icone grande do canal com animacao de entrada (scale + fade)
- Nome e descricao do canal
- Contagem de topicos nesse canal
- Badges visuais para canais privados, somente leitura ou pagos
- Fundo com gradiente subtil baseado na cor do canal (se definida)
- Botao rapido "Novo Topico neste canal" que pre-seleciona o canal no dialog

### 2. Estado vazio animado e motivacional

Substituir o estado vazio atual (icone + texto simples) por:
- Animacao de entrada com framer-motion (bounce/spring)
- Icone ilustrativo maior e com animacao de pulso suave
- Texto motivacional contextual ao canal selecionado ("Sê o primeiro a publicar em {canal}!")
- Botao CTA direto "Criar primeiro topico" que abre o dialog com o canal pre-selecionado
- Sugestoes rapidas de topicos (3 chips com ideias geradas localmente baseadas no nome do canal)

### 3. Animacoes melhoradas nos cards de topicos

- Hover com escala subtil (scale 1.01) e elevacao de sombra mais pronunciada
- Animacao stagger mais visivel na entrada dos cards (spring com bounce)
- Transicao suave ao mudar de canal (AnimatePresence no container de topicos)

### 4. Barra de atividade do canal

Adicionar abaixo do banner do canal uma mini-barra com:
- Numero de membros ativos (com icone animado)
- Ultimo topico publicado ("Ultima publicacao ha X minutos")
- Indicador visual de tendencia (seta para cima se houve posts recentes)

## Ficheiros

| Ficheiro | Acao |
|---|---|
| `src/pages/community/ForumPage.tsx` | Editar -- banner de canal imersivo, estado vazio animado, animacoes melhoradas, barra de atividade |

Total: 1 ficheiro editado, 0 criados.

## Seccao tecnica

### Banner de canal imersivo
```tsx
{selectedCategoryData && (
  <motion.div
    key={selectedCategoryData.id}
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    className="rounded-2xl border p-5 bg-gradient-to-r from-primary/8 to-transparent"
  >
    <div className="flex items-center gap-4">
      <motion.span 
        initial={{ scale: 0 }} 
        animate={{ scale: 1 }} 
        className="text-3xl"
      >
        {selectedCategoryData.icon || "💬"}
      </motion.span>
      <div className="flex-1">
        <h2 className="font-bold text-lg">{selectedCategoryData.name}</h2>
        <p className="text-sm text-muted-foreground">{selectedCategoryData.description}</p>
      </div>
      <div className="text-right text-sm">
        <p className="font-bold">{filteredTopics.length}</p>
        <p className="text-muted-foreground text-xs">topicos</p>
      </div>
    </div>
    {/* Badges + CTA */}
  </motion.div>
)}
```

### Estado vazio motivacional
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: "spring", bounce: 0.3 }}
  className="text-center py-16"
>
  <motion.div
    animate={{ y: [0, -8, 0] }}
    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
  >
    <MessageSquare className="h-16 w-16 mx-auto text-primary/30" />
  </motion.div>
  <h3 className="font-semibold mt-4">
    {selectedCategoryData 
      ? `Sê o primeiro a publicar em ${selectedCategoryData.name}!`
      : "Nenhum tópico ainda. Sê o primeiro!"}
  </h3>
  <Button onClick={() => { setNewCategoryId(selectedCategory || ""); setDialogOpen(true); }}>
    Criar primeiro tópico
  </Button>
  {/* Chips de sugestao */}
</motion.div>
```

### Animacoes nos cards
```tsx
<motion.div
  key={topic.id}
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
  whileHover={{ scale: 1.008, transition: { duration: 0.2 } }}
>
  <SocialPostCard ... />
</motion.div>
```
