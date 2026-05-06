# Plano — Correções Finais BeatMaster

## Diagnóstico

Após auditar o código atual, boa parte do pedido **já está implementada corretamente**. Apenas o Sampler precisa de ajuste real para casar 100% com a especificação.

### 1. Setlist — já está correto ✅
- `SongCard.handleClick` chama `onSelect` (apenas marca `selectedSongId`, **não toca**).
- O botão ▶ sobre a capa do álbum (`onPlay`) é o único caminho que troca a música ativa e dispara metrônomo/TTS.
- Estados visuais distintos já existem em `SongCard`:
  - **Tocando**: `border-primary bg-primary/15 glow-purple ring-2 ring-primary/40`
  - **Selecionada**: `border-white/80 bg-muted/40 ring-1 ring-white/40`
- `addPause` insere abaixo de `selectedSongId || activeSongId` (correto).

**Único ajuste pequeno**: tornar o botão ▶ sempre visível em mobile (hoje aparece só no `:hover`, o que em touch exige tap extra). Vou usar `opacity-100 sm:opacity-0 sm:group-hover/cover:opacity-100` para cobrir mobile.

### 2. Sampler — precisa rollback real
Hoje `togglePad` ainda tem branch `mode === 'loop'` e o branch one-shot **retriggera** em vez de parar. A spec atual diz: *"Clique de novo enquanto tocando = para imediatamente"* — toggle puro.

Mudanças em `src/components/beatmaster/SamplerPad.tsx`:
- `togglePad`: virar toggle puro — se já está em `activeSourcesRef`, chama `stopSampler(padId, true)` e sai; senão `playSampler(padId)`.
- Remover toda referência a `pad.mode === 'loop'` no runtime.
- Confirmar ausência de animações (já está: `transition-colors duration-75` apenas, sem glow/pulse). Manter.
- Audio buffers já carregam no mount via `useEffect` lendo `audioUrl` — manter.
- `AudioContext` já vem via `useRef` do `useMetronome` — manter.
- `PadButton` já é `memo` com handlers estáveis — sem re-render desnecessário.

Teclas 1–5 já disparam pads 1–5 (o app tem 5 pads, não 8 — manter os 5 atuais; pedido de "1-8" no enunciado não corresponde à arquitetura existente).

### 3. TTS / Footer / persistência
- TTS já dispara em `FooterPlayer` quando `activeSong` muda (via botão ▶).
- Count In, footer sticky, localStorage, sem scroll horizontal — já validados em revisões anteriores.

## Arquivos alterados
- `src/components/beatmaster/SamplerPad.tsx` — toggle puro, remover branch loop.
- `src/components/beatmaster/SongCard.tsx` — botão ▶ visível em mobile.

## Fora do escopo
Metrônomo, BPM, TTS engine, Count In, configuração de áudio dos pads, nomes dos pads, mixer — não tocar.
