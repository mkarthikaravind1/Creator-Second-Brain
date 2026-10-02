"use client";

import { Bot, ChevronDown, ChevronRight, Loader2, MessageSquarePlus, Send, Square, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatCards from "@/components/ChatCards";
import RichText from "@/components/RichText";
import { Button, Card, ErrorNote, PageHeader, cn } from "@/components/ui";
import { api, streamChat, type ChatCard, type ChatMessage, type ChatStep, type ChatThread } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";

const EXAMPLES = [
  "Have I talked about electric cars before?",
  "Make me a 30-second Short about 3-cylinder engines",
  "Which promises haven't I kept yet?",
  "How has my opinion on EVs changed over time?",
  "Which videos should I link from my Thar review?",
];

const AGENT = {
  brain: "Brain",
  researcher: "Researcher",
  clip_editor: "Clip Editor",
  drift_analyst: "Drift Analyst",
  promise_auditor: "Promise Auditor",
  promise_auditor_chat: "Promise Auditor",
  connections: "Connections",
} as Record<string, string>;

const TOOL = {
  search_transcripts: "Searching transcripts",
  search_moments: "Finding moments",
  search_reels: "Checking reel candidates",
  get_transcript_window: "Reading the transcript",
  validate_sequence: "Checking the cut",
  search_stances: "Searching opinions",
  list_stance_topics: "Listing opinion topics",
  list_promises: "Reviewing promises",
  list_videos: "Browsing videos",
  related_videos: "Finding related videos",
  finalise: "Finalising",
} as Record<string, string>;

function stepText(s: ChatStep): string {
  if (s.agent === "brain") return `Asked the ${AGENT[s.tool] ?? s.tool}`;
  return TOOL[s.tool] ?? s.tool;
}

type LiveMessage = ChatMessage & { pending?: boolean; error?: string };

function Steps({ steps, live }: { steps: ChatStep[]; live: boolean }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const agents = [...new Set(steps.filter((s) => s.agent === "brain").map((s) => AGENT[s.tool] ?? s.tool))];
  const expanded = live || open;
  return (
    <div className="mb-2 text-xs text-muted">
      {!live && (
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-ink">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {agents.length ? `Worked with ${agents.join(", ")}` : "Worked on it"} · {steps.length} steps
        </button>
      )}
      {expanded && (
        <ol className={cn("space-y-1 border-l border-line pl-3", !live && "mt-1.5")}>
          {steps.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              {live && i === steps.length - 1 ? <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin" /> : <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line" />}
              <span>
                <span className="font-medium text-ink/80">{s.agent === "brain" ? "Brain" : AGENT[s.agent] ?? s.agent}</span> · {stepText(s)}
                {s.detail && <span className="text-muted"> — {s.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function BrainPage() {
  const { channelId } = useChannel();
  const base = `/channel/${channelId}`;
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(() => {
    api
      .get<ChatThread[]>(`/api/channels/${channelId}/agent/threads`)
      .then(setThreads)
      .catch((e) => setError(e.message));
  }, [channelId]);

  useEffect(loadThreads, [loadThreads]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const openThread = async (id: string) => {
    if (busy) return;
    setError(null);
    try {
      const t = await api.get<ChatThread & { messages: ChatMessage[] }>(`/api/channels/${channelId}/agent/threads/${id}`);
      setThreadId(id);
      setMessages(t.messages);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const newChat = () => {
    if (busy) return;
    setThreadId(null);
    setMessages([]);
    setError(null);
  };

  const removeThread = async (id: string) => {
    try {
      await api.delete(`/api/channels/${channelId}/agent/threads/${id}`);
      if (id === threadId) newChat();
      loadThreads();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // apply an update to the assistant message currently streaming (always the last one)
  const patchLast = (fn: (m: LiveMessage) => LiveMessage) =>
    setMessages((ms) => (ms.length ? [...ms.slice(0, -1), fn(ms[ms.length - 1])] : ms));

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((ms) => [...ms, { role: "user", content: message }, { role: "assistant", content: "", cards: [], steps: [], pending: true }]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await streamChat(
        channelId,
        message,
        threadId,
        (e) => {
          switch (e.type) {
            case "thread":
              setThreadId(e.thread_id);
              break;
            case "step":
              patchLast((m) => ({ ...m, steps: [...(m.steps ?? []), { agent: e.agent, tool: e.tool, detail: e.detail }] }));
              break;
            case "token":
              patchLast((m) => ({ ...m, content: m.content + e.text }));
              break;
            case "card": {
              const card = { kind: e.kind, agent: e.agent, data: e.data } as ChatCard;
              patchLast((m) => ({ ...m, cards: [...(m.cards ?? []), card] }));
              break;
            }
            case "final":
              patchLast((m) => ({ ...m, content: e.message, pending: false }));
              break;
            case "error":
              patchLast((m) => ({ ...m, pending: false, error: e.message }));
              break;
          }
        },
        controller.signal,
      );
    } catch (e) {
      const stopped = (e as Error).name === "AbortError";
      patchLast((m) => ({ ...m, pending: false, error: stopped ? "Stopped." : (e as Error).message }));
    } finally {
      patchLast((m) => ({ ...m, pending: false }));
      setBusy(false);
      abort.current = null;
      loadThreads();
    }
  };

  const openCitation = (m: LiveMessage, n: number) => {
    for (const card of m.cards ?? []) {
      if (card.kind === "ask") {
        const s = card.data.sources.find((x) => x.n === n);
        if (s) return window.open(s.url, "_blank", "noopener");
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Brain"
        subtitle="Chat with your channel. The Brain hands your question to specialist agents — Researcher, Clip Editor, Drift Analyst, Promise Auditor and Connections — and combines what they find."
      />
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          <Button variant="outline" className="w-full" onClick={newChat} disabled={busy}>
            <MessageSquarePlus className="size-4" /> New chat
          </Button>
          <ul className="scroll-thin max-h-64 space-y-0.5 overflow-y-auto lg:max-h-[60vh]">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center">
                <button
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-sm",
                    t.id === threadId ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                  )}
                  title={t.title}
                >
                  {t.title || "Untitled"}
                </button>
                <button
                  onClick={() => removeThread(t.id)}
                  className="rounded p-1 text-muted opacity-0 hover:text-bad group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete conversation"
                  disabled={busy}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="min-h-[45vh] space-y-5">
            {!messages.length && (
              <Card className="p-6">
                <div className="flex items-center gap-2 font-medium">
                  <Bot className="size-5 text-accent" /> What do you want to know about your channel?
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {EXAMPLES.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-ink"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted">
                  Answers come only from your own videos. Multi-step questions can take a minute on Gemini&apos;s free tier.
                </p>
              </Card>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end gap-2">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-sm text-white">{m.content}</div>
                  <User className="mt-2 size-4 shrink-0 text-muted" />
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <Bot className="mt-1 size-5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <Steps steps={m.steps ?? []} live={!!m.pending} />
                    {m.content ? (
                      <div className="text-[15px]">
                        <RichText text={m.content} onCite={(n) => openCitation(m, n)} />
                      </div>
                    ) : m.pending && !(m.steps ?? []).length ? (
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 className="size-4 animate-spin" /> Thinking…
                      </p>
                    ) : null}
                    {m.error && <p className="mt-2 text-sm text-bad">{m.error}</p>}
                    <ChatCards cards={m.cards ?? []} base={base} />
                  </div>
                </div>
              ),
            )}
            <div ref={bottom} />
          </div>

          <div className="mt-4">
            <ErrorNote error={error} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="sticky bottom-0 mt-3 flex items-end gap-2 bg-bg pb-4 pt-2"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your videos, request a Short, check your promises…"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
            {busy ? (
              <Button type="button" variant="outline" onClick={() => abort.current?.abort()} className="h-11">
                <Square className="size-3.5" /> Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()} className="h-11">
                <Send className="size-4" /> Send
              </Button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
