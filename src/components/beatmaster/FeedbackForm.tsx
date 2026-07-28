import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Star } from 'lucide-react';
import { collectDiagnostics } from '@/lib/diagnostics';

interface Props {
  compact?: boolean;
  onSent?: () => void;
}

const categories = [
  { value: 'geral', label: 'Comentário geral' },
  { value: 'bug', label: 'Reportar um bug' },
  { value: 'sugestao', label: 'Sugestão de recurso' },
  { value: 'audio', label: 'Problema de áudio/timing' },
  { value: 'mobile', label: 'Problema no celular/tablet' },
];

export default function FeedbackForm({ compact, onSent }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('geral');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [attachDiag, setAttachDiag] = useState(true);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim();
    if (msg.length < 5) {
      toast.error('Escreva pelo menos algumas palavras no seu feedback.');
      return;
    }
    if (msg.length > 4000) {
      toast.error('Mensagem muito longa (máx. 4000 caracteres).');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        name: name.trim().slice(0, 120) || null,
        contact: contact.trim().slice(0, 200) || null,
        category,
        rating,
        message: msg,
        page: window.location.pathname,
        user_agent: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;

      if (attachDiag) {
        try {
          await supabase.from('diagnostics').insert({
            note: `anexado ao feedback (${category})`,
            payload: JSON.parse(JSON.stringify(collectDiagnostics())),
            user_agent: navigator.userAgent.slice(0, 500),
          });
        } catch { /* diagnóstico é opcional */ }
      }

      toast.success('Feedback enviado. Muito obrigado! 🥁');
      setMessage('');
      setRating(null);
      onSent?.();
    } catch {
      toast.error('Não foi possível enviar agora. Tente novamente em instantes.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={compact ? 'space-y-3' : 'grid sm:grid-cols-2 gap-3'}>
        <div className="space-y-1.5">
          <Label htmlFor="fb-name">Nome (opcional)</Label>
          <Input id="fb-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="Como te chamamos?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fb-contact">Contato (opcional)</Label>
          <Input id="fb-contact" value={contact} onChange={e => setContact(e.target.value)} maxLength={200} placeholder="WhatsApp ou e-mail" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fb-category">Tipo</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="fb-category"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Nota</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setRating(rating === n ? null : n)}
              aria-label={`Dar nota ${n} de 5`} aria-pressed={rating === n}
              className="p-1 rounded-md transition-colors hover:bg-secondary/50">
              <Star className={`w-5 h-5 ${rating && n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fb-message">Seu feedback</Label>
        <Textarea id="fb-message" value={message} onChange={e => setMessage(e.target.value)}
          maxLength={4000} rows={compact ? 4 : 5} required
          placeholder="O que funcionou bem? O que travou? Em qual celular/tablet você testou?" />
        <p className="text-[11px] text-muted-foreground text-right">{message.length}/4000</p>
      </div>

      <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={attachDiag} onChange={e => setAttachDiag(e.target.checked)} className="mt-0.5" />
        <span>Anexar relatório técnico automático (dispositivo, tela, áudio e erros recentes). Nenhum dado pessoal é coletado.</span>
      </label>

      <Button type="submit" disabled={sending} className="w-full">
        <Send className="w-4 h-4 mr-2" />{sending ? 'Enviando…' : 'Enviar feedback'}
      </Button>
    </form>
  );
}
