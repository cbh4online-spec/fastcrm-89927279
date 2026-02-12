

# Enriquecer a experiencia dos canais no FastClub Hub

## Problema

Na pagina principal do FastClub, os canais sao simples chips sem animacao e o estado vazio e estatico. A ForumPage ja tem banner imersivo, animacoes stagger e estado vazio motivacional -- falta aplicar o mesmo nivel de qualidade aqui.

## Alteracoes

### 1. Animacoes nos channel chips (DraggableChannelList)

- Entrada animada dos chips com stagger (fade + slide horizontal)
- Hover com scale subtil nos chips
- Transicao suave ao selecionar um canal (destaque animado)

### 2. Estado vazio animado e motivacional (FastClubPage)

Substituir o `EmptyState` atual por uma versao com:
- Animacao de entrada com framer-motion (spring/bounce)
- Icone com animacao de pulso flutuante (y bounce infinito)
- Texto motivacional mais envolvente
- Botao CTA com destaque visual

### 3. Animacoes stagger nos cards de topicos (FastClubPage)

- Cada SocialPostCard entra com delay sequencial (stagger 0.05s)
- Hover com scale subtil (1.008) e sombra elevada
- AnimatePresence para transicoes ao filtrar

### 4. Animacoes nos cards de eventos (FastClubPage)

- Entrada stagger nos eventos
- Hover com elevacao de sombra
- Estado vazio de eventos tambem animado

## Ficheiros

| Ficheiro | Acao |
|---|---|
| `src/pages/community/FastClubPage.tsx` | Editar -- estado vazio animado, stagger nos topic cards e event cards |
| `src/components/community/DraggableChannelList.tsx` | Editar -- animacoes de entrada e hover nos chips |

Total: 2 ficheiros editados, 0 criados.

## Seccao tecnica

### DraggableChannelList -- chips animados
Envolver cada chip em `motion.div` com stagger de entrada:
```tsx
<motion.div
  key={c.id}
  initial={{ opacity: 0, x: -8 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
  whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
>
  {/* chip content */}
</motion.div>
```

### FastClubPage -- EmptyState animado
```tsx
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", bounce: 0.3 }}
      className="text-center py-16 rounded-2xl border border-dashed bg-muted/20"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <MessageSquare className="h-14 w-14 text-primary/30 mx-auto" />
      </motion.div>
      <p className="font-semibold mt-4">Nenhuma discussao ainda</p>
      <p className="text-sm text-muted-foreground mb-5">Se o primeiro a iniciar uma conversa!</p>
      <Button>Criar Topico</Button>
    </motion.div>
  );
}
```

### FastClubPage -- topic cards com stagger
```tsx
{filteredTopics.slice(0, 15).map((topic, i) => (
  <motion.div
    key={topic.id}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
    whileHover={{ scale: 1.008, transition: { duration: 0.2 } }}
    className="transition-shadow hover:shadow-md rounded-2xl"
  >
    <SocialPostCard ... />
  </motion.div>
))}
```

### FastClubPage -- event cards com stagger
Mesma logica de stagger aplicada aos cards de eventos na funcao `EventsList`, com hover elevacao.
