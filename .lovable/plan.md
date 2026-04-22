

## Sampler — Performance + Mixer Layout Horizontal

### 1. Performance do Sampler (resposta instantânea ao clicar)

**Problema atual:** os handlers `playSampler`/`stopSampler`/`togglePad` dependem de `buffers` e `padConfigs`, então são recriados a cada movimento de slider ou mudança de estado. Além disso, `onClick` + `onTouchStart` disparam em sequência em dispositivos touch (ghost click), e `setActivePads` re-renderiza os 5 pads + a linha do mixer.

**Mudanças em `src/components/beatmaster/SamplerPad.tsx`:**

- Espelhar `padConfigs` e `buffers` em refs (`padConfigsRef`, `buffersRef`) atualizados via `useEffect`. Os handlers de play/stop leem das refs → ficam com deps vazias e nunca são recriados.
- Trocar `padConfigs.find(p => p.id === padId)` por lookup direto via índice (Map id→index criado uma vez).
- Remover `onTouchStart` duplicado: usar apenas `onPointerDown` com `e.preventDefault()` para resposta imediata em touch e mouse, sem ghost click. `onClick` é removido do botão do pad.
- Trocar `setActivePads` (objeto inteiro) por um sinal mais barato: manter `activePads` como ref + um contador `tick` para forçar re-render só quando necessário — OU manter o estado mas isolar cada pad em um subcomponente `memo` para que sliders/mixer não re-renderizem o grid.
- Escolha: criar `<PadButton>` memoizado que recebe apenas `{ pad, isActive, hasBuffer, onTrigger, onConfig, colorClass }` → mover sliders pro mixer não causa re-render dos pads.
- Debounce do `setPadConfigs` durante drag dos sliders (commit no `onValueCommit` do Radix Slider para a persistência LocalStorage; o estado visual continua reativo via valor controlado interno). Isso elimina N writes por segundo no LocalStorage.
- `playSampler`: pré-criar nada (Web Audio já é leve), mas remover o `padConfigs.find` por leitura direta.

### 2. Mixer Sampler — layout horizontal em telas largas

Hoje o mixer é uma pilha vertical de 5 linhas (`Vol slider | Pan slider`), mesmo num viewport de 1311px. Vai virar grid responsivo com uma coluna por pad em telas médias+:

```text
Mobile (<sm):              md+ (telas largas):
[Kick   ━━━━━━ Pan ──]     ┌─ Kick ─┐ ┌─ Snare ┐ ┌─ HiHat ┐ ┌─ Clap ─┐ ┌─ Crash ┐
[Snare  ━━━━━━ Pan ──]     │ Vol▕▏  │ │ Vol▕▏  │ │ Vol▕▏  │ │ Vol▕▏  │ │ Vol▕▏  │
[HiHat  ━━━━━━ Pan ──]     │ Pan ─●─│ │ Pan ─●─│ │ Pan ─●─│ │ Pan ─●─│ │ Pan ─●─│
[Clap   ━━━━━━ Pan ──]     └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
[Crash  ━━━━━━ Pan ──]
```

- `<sm`: mantém o layout atual de 1 linha por pad (compacto vertical).
- `md+`: grid `grid-cols-5 gap-3`, cada coluna mostra nome do pad, slider de volume com % numérico, slider de pan com label L/C/R, alinhados ao botão do pad acima.
- A borda colorida de cada coluna do mixer reusa a `padColors[i]` (apenas a borda, suave) → liga visualmente o slider ao pad correspondente.

### 3. Arquivos afetados

- `src/components/beatmaster/SamplerPad.tsx` — refatorar handlers, extrair `PadButton` memo, refatorar JSX do mixer com grid responsivo, debounce de persistência via `onValueCommit`.

### 4. Não mexer

- Lógica de áudio (Web Audio API, ramp de stop, conexões de gain/panner).
- `defaultPadConfigs`, tipos `PadConfig`, modal de configuração.
- Atalhos de teclado 1-5.

