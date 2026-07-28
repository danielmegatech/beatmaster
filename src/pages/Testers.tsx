import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Activity, Users, Eye, Smartphone, Download, Bug, ClipboardCheck } from 'lucide-react';
import FeedbackForm from '@/components/beatmaster/FeedbackForm';
import { collectDiagnostics, sendDiagnostics } from '@/lib/diagnostics';
import { useVisitorCount } from '@/hooks/useVisitorCount';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const checklist = [
  'Metrônomo: iniciar/parar, mudar BPM, tap tempo e compasso',
  'Setlist: criar playlist, adicionar música, inserir pausa e navegar entre faixas',
  'Sampler: tocar os pads repetidamente e conferir se há atraso',
  'Mixer: volume, pan (L/C/R) e mute de cada pad',
  'Importar e exportar setlist em .xlsx',
  'Anúncio de voz (TTS) ao trocar de música',
  'Uso em modo avião / sem internet',
  'Girar o aparelho (retrato e paisagem) em celular e tablet',
];

export default function Testers() {
  const { visits, uniqueVisitors, loading } = useVisitorCount(true);
  const [diagNote, setDiagNote] = useState('');
  const [sendingDiag, setSendingDiag] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  };

  const handleSendDiag = async () => {
    setSendingDiag(true);
    try {
      await sendDiagnostics(diagNote);
      toast.success('Diagnóstico enviado. Obrigado!');
      setDiagNote('');
    } catch {
      toast.error('Falha ao enviar o diagnóstico. Verifique sua conexão.');
    } finally {
      setSendingDiag(false);
    }
  };

  const togglePreview = () => {
    setPreview(p => (p ? '' : JSON.stringify(collectDiagnostics(), null, 2)));
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto">
      <Helmet>
        <title>Programa de Testadores | BeatMaster</title>
        <meta name="description" content="Participe do teste do BeatMaster: envie feedback, relatórios de diagnóstico e instale o app no seu Android." />
        <link rel="canonical" href="https://beatmaster.lovable.app/testadores" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" />Voltar ao app</Link>
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{loading ? '—' : visits.toLocaleString('pt-BR')} visitas</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{loading ? '—' : uniqueVisitors.toLocaleString('pt-BR')} testadores</span>
          </div>
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">🥁 Programa de Testadores do BeatMaster</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado por testar! Use o app normalmente nos seus ensaios e conte o que funcionou e o que quebrou.
            Seu retorno é o que define as próximas versões.
          </p>
        </header>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-primary" />O que testar</h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {checklist.map(item => (
              <li key={item} className="flex gap-2"><span className="text-primary">•</span><span>{item}</span></li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 space-y-3" id="feedback">
          <h2 className="font-semibold flex items-center gap-2"><Bug className="w-4 h-4 text-primary" />Enviar feedback</h2>
          <FeedbackForm />
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Enviar diagnóstico</h2>
          <p className="text-xs text-muted-foreground">
            Se algo travou, envie um relatório técnico do seu aparelho: modelo de tela, suporte de áudio,
            quantidade de playlists salvas e os erros recentes registrados pelo app.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="diag-note">O que aconteceu? (opcional)</Label>
            <Textarea id="diag-note" value={diagNote} onChange={e => setDiagNote(e.target.value)} rows={3} maxLength={2000}
              placeholder="Ex.: o som do pad 3 sumiu depois de 10 minutos tocando." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSendDiag} disabled={sendingDiag}>
              <Activity className="w-4 h-4 mr-2" />{sendingDiag ? 'Enviando…' : 'Enviar diagnóstico'}
            </Button>
            <Button variant="outline" onClick={togglePreview}>{preview ? 'Ocultar dados' : 'Ver o que será enviado'}</Button>
          </div>
          {preview && (
            <pre className="text-[10px] leading-relaxed bg-secondary/40 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">{preview}</pre>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4 text-primary" />Versão para Android</h2>
          <p className="text-sm text-muted-foreground">
            O BeatMaster instala direto no seu Android como aplicativo — ícone na tela inicial, tela cheia,
            sem barra do navegador e sem passar pela loja.
          </p>
          {installed ? (
            <p className="text-sm text-primary font-medium">✅ App já instalado neste aparelho.</p>
          ) : installEvent ? (
            <Button onClick={handleInstall}><Download className="w-4 h-4 mr-2" />Instalar no Android</Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Se o botão de instalação não aparecer, abra este site no <strong>Chrome do Android</strong> e toque em
              <strong> ⋮ → Instalar aplicativo</strong> (ou “Adicionar à tela inicial”).
            </p>
          )}
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Abra <strong>beatmaster.lovable.app</strong> no Chrome do Android.</li>
            <li>Toque no menu <strong>⋮</strong> no canto superior direito.</li>
            <li>Escolha <strong>Instalar aplicativo</strong> / <strong>Adicionar à tela inicial</strong>.</li>
            <li>Abra pelo ícone criado — ele roda em tela cheia, ideal para tablets no palco.</li>
          </ol>
          <p className="text-[11px] text-muted-foreground">
            No iPhone/iPad: Safari → botão Compartilhar → <strong>Adicionar à Tela de Início</strong>.
          </p>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Feito para bateristas, por bateristas. Obrigado por testar! 🎵
        </p>
      </div>
    </div>
  );
}
