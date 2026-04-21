import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">❔ Ajuda · BeatMaster</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="how" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="how" className="text-xs">Como usar</TabsTrigger>
            <TabsTrigger value="features" className="text-xs">Funções</TabsTrigger>
            <TabsTrigger value="about" className="text-xs">Sobre</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs">Créditos</TabsTrigger>
          </TabsList>

          <TabsContent value="how" className="text-sm space-y-2 pt-3 text-foreground/90">
            <p><strong>1.</strong> Escolha o modo: <em>BPM Livre</em> (ensaio) ou <em>Modo Setlist</em> (show).</p>
            <p><strong>2.</strong> Em Modo Setlist, importe um .xlsx ou use as setlists prontas. Cada música roda no seu BPM.</p>
            <p><strong>3.</strong> Botão central <strong>START</strong> dispara o metrônomo. Use <em>Count In</em> para iniciar com 2 compassos de contagem.</p>
            <p><strong>4.</strong> <strong>Tap</strong> = bata o BPM com o dedo. Duplo clique nos sliders reseta para o padrão.</p>
            <p><strong>5.</strong> Pads do sampler: aperte para tocar, aperte de novo para parar.</p>
          </TabsContent>

          <TabsContent value="features" className="text-sm space-y-2 pt-3 text-foreground/90">
            <ul className="list-disc list-inside space-y-1">
              <li>🥁 Metrônomo profissional 40-240 BPM com 13 timbres</li>
              <li>📋 Setlist Manager com import/export .xlsx</li>
              <li>🎙️ Anúncio TTS automático ("Now playing...")</li>
              <li>🎛️ 5 pads de sampler com volume e pan independentes</li>
              <li>⏱️ Count-in de 2 compassos no BPM da música</li>
              <li>⏸ Pausas no setlist com TTS</li>
              <li>🎨 5 skins (Violeta, Azul, Verde, Vermelho, Laranja) + Light/Dark</li>
              <li>📱 PWA offline · atalhos de teclado · drag & drop</li>
            </ul>
          </TabsContent>

          <TabsContent value="about" className="text-sm space-y-2 pt-3 text-foreground/90">
            <p><strong>BeatMaster</strong> é um app profissional de performance ao vivo, criado para músicos que precisam de precisão de tempo, organização de setlist e samples sob demanda — tudo numa interface só.</p>
            <p>Funciona offline (PWA), com áudio de alta precisão via Web Audio API.</p>
          </TabsContent>

          <TabsContent value="legal" className="text-sm space-y-2 pt-3 text-foreground/90">
            <p><strong>Metadados de música:</strong> MusicBrainz (CC0).</p>
            <p><strong>Síntese de voz:</strong> ElevenLabs.</p>
            <p><strong>Ícones:</strong> Lucide.</p>
            <p><strong>UI:</strong> shadcn/ui · Tailwind · React.</p>
            <p className="text-muted-foreground text-xs pt-2">© BeatMaster · Feito com Lovable.</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
