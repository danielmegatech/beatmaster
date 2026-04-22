

## Remover barra de filtro de bandas do Setlist

A linha de botões selecionada (🎵 Todas, Geral, e o botão "+" de adicionar banda) será completamente removida do `SetlistManager`, simplificando o topo do painel.

### O que será removido
- A barra horizontal de tabs de bandas (linhas ~216-256 em `SetlistManager.tsx`), incluindo:
  - Botão "🎵 Todas"
  - Botões dinâmicos por banda (ex: "Geral")
  - Input + botão "+" de criar nova banda
- Estado relacionado: `addingBand`, `newBandName`, função `addBand`
- Lógica de filtro `selectedBand` no componente (passa a usar sempre todas as playlists)
- Prop `selectedBand` / `setSelectedBand` em `SetlistManager` e `Index.tsx`
- LocalStorage `bm-selected-band` em `Index.tsx`

### O que permanece intacto
- Tabs de playlists (linha "Nova setlist...")
- Funcionalidade de adicionar/remover playlist
- Campo `band` no tipo `Playlist` (mantido no modelo de dados — não remove migração existente, apenas deixa de ser exposto na UI)
- Toda lógica de áudio, TTS, count-in, drag & drop e setlists existentes

### Resultado visual
Topo do Setlist passa a ter apenas:
1. Cabeçalho "📋 Setlist" + duração
2. Tabs de playlists com botão "+"
3. Lista de músicas

### Arquivos afetados
- `src/components/beatmaster/SetlistManager.tsx` — remover JSX da barra, props e estado de bandas
- `src/pages/Index.tsx` — remover `selectedBand`, `setSelectedBand` e o useLocalStorage `bm-selected-band`; remover prop nas duas instâncias (mobile e desktop) do `SetlistManager`

