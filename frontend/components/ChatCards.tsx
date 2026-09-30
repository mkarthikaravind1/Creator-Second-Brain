"use client";

import { ArrowRight, CheckCircle2, CircleDashed, Download, ExternalLink, FileText, Lightbulb, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge, Button, Card, Thumb } from "@/components/ui";
import { api, downloadText, fmtDate, type ChatCard, type Composition, type DriftResult } from "@/lib/api";

const VERDICT = {
  covered: { tone: "good" as const, label: "You've covered this" },
  partially: { tone: "warn" as const, label: "Partially covered" },
  new: { tone: "accent" as const, label: "New territory" },
};

const AGENT_LABEL: Record<string, string> = {
  researcher: "Researcher",
  clip_editor: "Clip Editor",
  drift_analyst: "Drift Analyst",
  promise_auditor: "Promise Auditor",
  connections: "Connections",
};

function Shell({ agent, title, action, children }: { agent: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2">
        <p className="min-w-0 truncate text-sm font-medium">
          <span className="text-muted">{AGENT_LABEL[agent] ?? agent} · </span>
          {title}
        </p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function OpenLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-1 text-xs text-muted hover:text-ink">
      {label} <ArrowRight className="size-3" />
    </Link>
  );
}

export default function ChatCards({ cards, base }: { cards: ChatCard[]; base: string }) {
  if (!cards.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {cards.map((card, i) => {
        switch (card.kind) {
          case "ask":
            return <AskCard key={i} card={card} base={base} />;
          case "compose":
            return <ComposeCard key={i} agent={card.agent} comp={card.data} base={base} />;
          case "drift":
            return <DriftCard key={i} agent={card.agent} drift={card.data} base={base} />;
          case "promises":
            return (
              <Shell key={i} agent={card.agent} title="Promises" action={<OpenLink href={`${base}/promises`} label="Promise Ledger" />}>
                <ul className="space-y-3">
                  {card.data.promises.map((p) => (
                    <li key={p.id} className="flex gap-3">
                      {p.status === "fulfilled" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
                      ) : p.status === "dismissed" ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-muted" />
                      ) : (
                        <CircleDashed className="mt-0.5 size-4 shrink-0 text-warn" />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">{p.promise}</p>
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink">
                          {p.title} · {p.timestamp} · {fmtDate(p.published_at)}
                        </a>
                        {p.evidence && <p className="mt-1 text-xs text-muted">{p.evidence}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Shell>
            );
          case "videos":
            return (
              <Shell key={i} agent={card.agent} title="Videos" action={<OpenLink href={`${base}/connections`} label="Connections" />}>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {card.data.videos.map((v) => (
                    <li key={v.video_id}>
                      <a href={v.url} target="_blank" rel="noreferrer" className="flex gap-3 rounded-lg p-1.5 hover:bg-surface-2">
                        <Thumb src={v.thumbnail} className="h-12 w-20 shrink-0" />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                          <p className="text-xs text-muted">{fmtDate(v.published_at)}</p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </Shell>
            );
        }
      })}
    </div>
  );
}

function AskCard({ card, base }: { card: Extract<ChatCard, { kind: "ask" }>; base: string }) {
  const [all, setAll] = useState(false);
  const r = card.data;
  const sources = [...r.sources].sort((a, b) => Number(b.cited) - Number(a.cited) || a.n - b.n);
  const shown = all ? sources : sources.slice(0, 4);
  return (
    <Shell agent={card.agent} title="From your videos" action={<OpenLink href={base} label="Ask page" />}>
      <Badge tone={VERDICT[r.verdict].tone}>{VERDICT[r.verdict].label}</Badge>
      {r.fresh_angle && (
        <div className="mt-3 flex gap-2 rounded-lg bg-surface-2 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            <span className="font-medium">Fresh angle: </span>
            {r.fresh_angle}
          </span>
        </div>
      )}
      <ul className="mt-3 space-y-1.5">
        {shown.map((s) => (
          <li key={s.n}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex gap-3 rounded-lg p-1.5 hover:bg-surface-2">
              <div className="relative shrink-0">
                <Thumb src={s.thumbnail} className="h-12 w-20" />
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] font-medium text-white">{s.timestamp}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm">
                  <span className="text-xs font-semibold text-violet-700">[{s.n}]</span>
                  <span className="truncate font-medium">{s.title}</span>
                  {s.cited && <Badge tone="accent">cited</Badge>}
                </p>
                <p className="line-clamp-1 text-xs text-muted">{s.text}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {sources.length > 4 && (
        <button onClick={() => setAll(!all)} className="mt-2 text-xs text-muted hover:text-ink">
          {all ? "Show fewer" : `Show all ${sources.length} moments`}
        </button>
      )}
    </Shell>
  );
}

const ROLE_TONE: Record<string, "accent" | "neutral" | "good" | "warn"> = {
  hook: "accent",
  context: "neutral",
  proof: "neutral",
  payoff: "good",
  cta: "warn",
};

function ComposeCard({ agent, comp, base }: { agent: string; comp: Composition; base: string }) {
  const [error, setError] = useState<string | null>(null);
  const exportFile = async (kind: "edl" | "shotlist") => {
    try {
      const text = await api.post<string>(`/api/export/${kind}`, {
        title: comp.title,
        clips: comp.clips,
        hook_overlay: comp.hook_overlay,
        caption: comp.caption,
      });
      const slug = comp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      downloadText(kind === "edl" ? `${slug}.edl` : `${slug}-shotlist.md`, text);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Shell agent={agent} title={comp.title} action={<OpenLink href={`${base}/compose`} label="Ghost Clips" />}>
      <p className="text-xs text-muted">
        {comp.total_seconds}s · {comp.clips.length} clips from {comp.source_videos} videos
      </p>
      {comp.hook_overlay && (
        <p className="mt-2 rounded-lg bg-black/85 px-3 py-2 text-center text-sm font-semibold text-white">{comp.hook_overlay}</p>
      )}
      <ol className="mt-3 space-y-2">
        {comp.clips.map((c, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 w-4 shrink-0 text-right text-xs text-muted">{i + 1}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex flex-wrap items-center gap-1.5">
                <Badge tone={ROLE_TONE[c.role] ?? "neutral"}>{c.role}</Badge>
                <a href={c.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs text-muted hover:text-ink">
                  {c.title} · {c.timestamp} <ExternalLink className="inline size-3" />
                </a>
              </p>
              <p className="mt-1 text-[13px]">&ldquo;{c.text}&rdquo;</p>
            </div>
          </li>
        ))}
      </ol>
      {comp.caption && <p className="mt-3 text-xs text-muted">{comp.caption}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => exportFile("edl")}>
          <Download className="size-3.5" /> EDL
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportFile("shotlist")}>
          <FileText className="size-3.5" /> Shot list
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </Shell>
  );
}

function DriftCard({ agent, drift, base }: { agent: string; drift: DriftResult; base: string }) {
  return (
    <Shell agent={agent} title={`Opinion on “${drift.topic}”`} action={<OpenLink href={`${base}/drift`} label="Opinion Drift" />}>
      <p className="text-sm">{drift.summary}</p>
      <div className="mt-3 flex justify-between text-[11px] text-muted">
        <span>{drift.axis.negative}</span>
        <span>{drift.axis.positive}</span>
      </div>
      <ul className="mt-1 space-y-2">
        {drift.points.map((p) => (
          <li key={p.id} className="text-sm">
            <div className="relative h-2 rounded-full bg-surface-2">
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
                style={{ left: `${((p.position + 1) / 2) * 100}%` }}
              />
            </div>
            <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-muted hover:text-ink">
              <span className="font-medium text-ink">{p.label}</span> · {fmtDate(p.published_at)} · {p.title}
            </a>
          </li>
        ))}
      </ul>
      {drift.shifts.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {drift.shifts.map((s, i) => (
            <li key={i} className="rounded-md bg-surface-2 px-2 py-1">
              <span className="font-medium capitalize">{s.type}:</span> {s.explanation}
            </li>
          ))}
        </ul>
      )}
      {drift.video_idea && (
        <div className="mt-3 flex gap-2 rounded-lg bg-surface-2 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>{drift.video_idea}</span>
        </div>
      )}
    </Shell>
  );
}
