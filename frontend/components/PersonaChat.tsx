"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Square } from "lucide-react";
import { postSse } from "@/lib/sse";
import { apiErrorMessage } from "@/lib/api";
import { ChatMessage, loadChat, saveChat } from "@/lib/history";
import { personaColor, personaLabel } from "@/lib/personas";
import { Persona } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_TURNS = 12; // backend limit per request
const RULE_BASED_NOTE = {
  quota: "Bugünkü AI hakkın doldu; persona simülasyon verisinden cevap verdi.",
  unavailable: "AI şu anda kullanılamıyor; persona simülasyon verisinden cevap verdi.",
} as const;
const SUGGESTIONS = ["Neden bu kararı verdin?", "Fiyat ne olsa alırdın?", "Açıklamada neyi eksik buldun?"];

const canChat = (id?: string | null): id is string => !!id && !id.startsWith("local-");

/**
 * Ask one simulated persona follow-up questions; answers stream in (POST /api/persona-chat).
 * Each persona's transcript is kept on the result's history entry, so it survives a reload.
 */
export default function PersonaChat({ simulationId, personas }: { simulationId?: string | null; personas: Persona[] }) {
  const [persona, setPersona] = useState(personas[0]?.name ?? "");
  // Mounted only on the client after a result loads, so reading localStorage here cannot cause a hydration mismatch.
  const [messages, setMessages] = useState<ChatMessage[]>(() => (canChat(simulationId) ? loadChat(simulationId, persona) : []));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  // Persist once an answer has finished streaming (not on every chunk).
  useEffect(() => {
    if (!busy && canChat(simulationId)) saveChat(simulationId, persona, messages);
  }, [busy, messages, persona, simulationId]);

  if (!canChat(simulationId)) {
    return (
      <p className="rounded-wobble border-2 border-dashed border-border p-5 text-sm text-muted-foreground">
        Persona sohbeti için sonucun sunucuda kayıtlı olması gerekir. Bu sonuç yalnızca bu tarayıcıda saklanıyor.
      </p>
    );
  }

  // Cancel a running answer without touching the transcript (see the `finally` in send).
  const cancelStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const switchPersona = (name: string) => {
    cancelStream();
    setPersona(name);
    setMessages(loadChat(simulationId, name));
    setError("");
  };

  const clear = () => {
    cancelStream();
    setMessages([]);
    setError("");
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history: ChatMessage[] = [...messages, { role: "user", text: question }];
    // Keep the last turns within the backend limit and starting with the user.
    let window = history.slice(-MAX_TURNS);
    if (window[0]?.role !== "user") window = window.slice(1);

    setMessages([...history, { role: "persona", text: "" }]);
    setInput("");
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;

    let answered = false;
    const appendToAnswer = (chunk: string) => {
      answered = true;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "persona", text: next[next.length - 1].text + chunk };
        return next;
      });
    };

    try {
      await postSse(
        "/api/persona-chat",
        { simulationId, persona, messages: window.map((m) => ({ role: m.role, text: m.text.slice(0, 600) })) },
        (event, data) => {
          const payload = data as { text?: string; detail?: string; ruleBased?: boolean; reason?: "quota" | "unavailable" };
          if (event === "delta" && payload.text) appendToAnswer(payload.text);
          if (event === "done" && payload.ruleBased) {
            const reason = payload.reason ?? "unavailable";
            setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: m.text.trim(), ruleBased: reason } : m)));
          }
          if (event === "error") setError(payload.detail || "Persona cevap veremedi.");
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
      // No answer at all (error or the stop button before the first chunk): drop the question too and give it back
      // to the input, so an unanswered question is never saved. Skipped if the persona was switched or the chat
      // cleared meanwhile, because the transcript on screen is then no longer this request's.
      if (!answered && abortRef.current === controller) {
        setMessages((prev) => prev.slice(0, -2));
        setInput(question);
      }
    }
  };

  const color = personaColor(persona);

  return (
    <section className="card-paper space-y-4" aria-labelledby="persona-chat-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="persona-chat-title" className="squiggle text-[19px] font-bold">Personaya sor</h3>
        <Select value={persona} onValueChange={switchPersona}>
          <SelectTrigger className="field h-10 w-60" aria-label="Persona seçin">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {personas.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {personaLabel(p.name)} · %{Math.round(p.purchaseProbability * 100)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="chip text-accent hover:bg-accent/10">
              {s}
            </button>
          ))}
        </div>
      ) : (
        <ol ref={listRef} className="max-h-[420px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <li key={i} className="ml-auto max-w-[85%] rounded-[16px_16px_4px_16px] border-2 border-border bg-secondary px-4 py-2.5">
                {m.text}
              </li>
            ) : (
              <li
                key={i}
                className="max-w-[90%] rounded-[4px_16px_16px_4px] border-2 border-l-[6px] border-border bg-card px-4 py-2.5 shadow-sticker-sm"
                style={{ borderLeftColor: color }}
              >
                <b className="flex items-center gap-2 font-display text-sm">
                  {personaLabel(persona)}
                  {m.ruleBased && (
                    <span className="chip font-sans text-muted-foreground" title={RULE_BASED_NOTE[m.ruleBased]}>
                      kural tabanlı
                    </span>
                  )}
                </b>
                {m.text || <Loader2 className="mt-1 h-4 w-4 animate-spin text-muted-foreground" aria-label="Yazıyor" />}
              </li>
            )
          )}
        </ol>
      )}

      {error && <p className="note-risk" role="alert">{error}</p>}

      {messages.length > 0 && !busy && (
        <button type="button" onClick={clear} className="text-sm font-bold text-accent underline-offset-4 hover:underline">
          Sohbeti temizle
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <label htmlFor="persona-chat-input" className="sr-only">Mesajınız</label>
        <input
          id="persona-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={600}
          placeholder={`${personaLabel(persona)} kişisine bir soru sorun…`}
          className="field"
          disabled={busy}
        />
        {busy ? (
          <button type="button" onClick={() => abortRef.current?.abort()} className="btn-sticker shrink-0" aria-label="Cevabı durdur">
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" className="btn-sticker-primary shrink-0" aria-label="Gönder" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </section>
  );
}
