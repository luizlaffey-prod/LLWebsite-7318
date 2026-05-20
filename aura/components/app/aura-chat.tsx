'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AuraChatProps {
  locale: Locale;
}

const STORAGE_KEY = 'aura-chat-history';
const MAX_HISTORY = 20;

/**
 * Floating support chat for Standard / Pro operators. Lives in the
 * bottom-right corner; closed-state is a small FAB, opened-state is a
 * fixed panel with message list + input. Conversation persists in
 * sessionStorage so a page reload doesn't blow it away, but a tab
 * close does (no server-side persistence in v1).
 *
 * Gating happens server-side at /api/support/chat — the FAB is only
 * mounted in the (app) layout when the user is Standard or Pro, so
 * Starter operators never see it.
 */
export function AuraChat({ locale }: AuraChatProps) {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Restore history from sessionStorage on first mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_HISTORY));
      }
    } catch {
      /* ignore — storage unavailable */
    }
  }, []);

  // Persist + autoscroll on each message change.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setPending(true);
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-MAX_HISTORY), locale }),
      });
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-aura-gradient text-base shadow-[0_8px_24px_-8px_rgba(0,229,200,0.4)] transition-transform hover:scale-105 active:scale-95"
          aria-label={t('open')}
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-elevated px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#0F2D2A]">
                <MessageCircle className="h-3.5 w-3.5 text-teal" />
              </span>
              <div>
                <div className="text-sm font-semibold">{t('title')}</div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  {t('subtitle')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-[10px] uppercase tracking-wider text-text-muted hover:text-text-primary"
                >
                  {t('reset')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-2 text-text-muted hover:text-text-primary"
                aria-label={t('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="rounded-lg border border-border bg-elevated/40 p-3 text-xs text-text-secondary">
                {t('greeting')}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'ml-auto bg-aura-gradient text-base'
                    : 'mr-auto bg-elevated text-text-primary'
                )}
              >
                {m.content}
              </div>
            ))}
            {pending && (
              <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-elevated px-3 py-2 text-xs text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('thinking')}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
                {error}
              </div>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-border bg-elevated px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t('placeholder')}
              rows={2}
              className="flex-1 resize-none rounded-md border border-border bg-base px-2.5 py-1.5 text-sm outline-none focus:border-teal/60"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-aura-gradient text-base transition-opacity disabled:opacity-40"
              aria-label={t('send')}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
