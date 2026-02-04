

# Plano: Corrigir Contadores e Remover Badge Beta

## Problemas Identificados

### 1. Contadores com Formato Invertido
Após analisar a resposta da API, o sistema está a funcionar correctamente e retorna:
```json
{
  "searches_count": 0,
  "searches_limit": 50,
  "profiles_analyzed_count": 0,
  "profiles_analyzed_limit": 200
}
```

No entanto, o componente `ProspectingUsage.tsx` apresenta `count/limit`, que com os dados actuais mostraria "0/50" e "0/200". O utilizador reportou ver "200 / 0" - o que indica que a ordem está invertida em algum ponto, possivelmente devido a uma reordenação ou bug na apresentação.

Vou verificar e corrigir para garantir que mostra claramente:
- "Pesquisas: 0 de 50 usadas"
- "Perfis: 0 de 200 analisados"

### 2. Badge Beta
O badge "Beta" está hardcoded na página principal e precisa ser removido conforme solicitado.

## Alterações a Efectuar

### Ficheiro 1: `src/pages/ProfessionalProspecting.tsx`

**Remover o Badge Beta (linhas 25-27):**

Antes:
```tsx
<div className="flex items-center gap-3">
  <h1 className="text-2xl font-bold">Prospecção Profissional</h1>
  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
    Beta
  </Badge>
</div>
```

Depois:
```tsx
<h1 className="text-2xl font-bold">Prospecção Profissional</h1>
```

### Ficheiro 2: `src/components/professional-prospecting/ProspectingUsage.tsx`

**Melhorar a apresentação dos contadores para maior clareza:**

Antes (pode causar confusão):
```tsx
<span className="text-sm">{usage.searches_count}/{usage.searches_limit}</span>
```

Depois (mais claro e com tooltips):
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="flex items-center gap-2">
      <Search className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {usage.searches_count}/{usage.searches_limit}
      </span>
      <Progress value={searchPercent} className="w-16 h-2" />
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <p>{usage.searches_count} pesquisas de {usage.searches_limit} usadas este mês</p>
  </TooltipContent>
</Tooltip>
```

**Adicionar labels visíveis (opcional):**
```tsx
<div className="flex items-center gap-4 text-sm">
  <div className="flex items-center gap-2" title="Pesquisas realizadas">
    <Search className="w-4 h-4 text-muted-foreground" />
    <span>{usage.searches_count} / {usage.searches_limit}</span>
    <Progress value={searchPercent} className="w-16 h-2" />
  </div>
  <div className="flex items-center gap-2" title="Perfis analisados">
    <Users className="w-4 h-4 text-muted-foreground" />
    <span>{usage.profiles_analyzed_count} / {usage.profiles_analyzed_limit}</span>
    <Progress value={profilePercent} className="w-16 h-2" />
  </div>
</div>
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ProfessionalProspecting.tsx` | Remover Badge Beta e simplificar header |
| `src/components/professional-prospecting/ProspectingUsage.tsx` | Adicionar tooltips e melhorar clareza dos contadores |

## Resultado Esperado

1. O título "Prospecção Profissional" aparece sem o badge "Beta"
2. Os contadores mostram claramente "X / Y" com tooltips explicativos
3. A barra de progresso reflecte correctamente a percentagem de uso
4. O utilizador entende que está a ver "usados / limite"

## Verificação Adicional

Os dados da base de dados para o workspace actual (período Fevereiro 2026) são:
- Pesquisas: 0/50 (0% usado)
- Perfis: 0/200 (0% usado)

Estes valores estão correctos - é um novo mês, por isso os contadores foram reiniciados a 1 de Fevereiro.

