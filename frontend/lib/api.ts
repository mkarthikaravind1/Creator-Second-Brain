export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Can't reach the backend at ${API_URL}. Is it running?`, 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {}
    throw new ApiError(detail, res.status);
  }
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<T>(path, { method: "POST", body: form });
  },
};

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- types ----------

export type Health = { ok: boolean; youtube_key: boolean; groq_key: boolean; llm_model: string };

export type Job = {
  id: number;
  channel_id: string | null;
  kind: string;
  status: "queued" | "running" | "done" | "failed";
  stage: string;
  progress: number;
  total: number;
  message: string;
};

export type ChannelSummary = { id: string; title: string; handle: string | null; thumbnail: string | null; videos: number };

export type ChannelOverview = ChannelSummary & {
  video_status: Record<string, number>;
  chunks: number;
  reels: number;
  promises: number;
  open_promises: number;
  stances: number;
  latest_job: Job | null;
};

export type VideoRow = {
  id: string;
  title: string;
  thumbnail: string | null;
  published_at: string;
  duration_sec: number;
  view_count: number;
  status: string;
};

export type Source = {
  n: number;
  video_id: string;
  title: string;
  published_at: string;
  thumbnail: string | null;
  start: number;
  timestamp: string;
  url: string;
  text: string;
  similarity: number;
  cited: boolean;
};

export type AskResult = {
  verdict: "covered" | "partially" | "new";
  answer: string;
  fresh_angle: string;
  sources: Source[];
};

export type Reel = {
  id: number;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string;
  start: number;
  end: number;
  duration: number;
  timestamp: string;
  url: string;
  score: number;
  scores: Record<string, number>;
  hook: string;
  caption: string;
  reason: string;
  transcript: string;
};

export type PromiseRow = {
  id: number;
  promise: string;
  quote: string;
  kind: string;
  status: "open" | "fulfilled" | "dismissed";
  manual: boolean;
  evidence: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string;
  timestamp: string;
  url: string;
  fulfilled_by: { video_id: string; title: string; timestamp: string; url: string } | null;
};

export type DriftTopic = { topic: string; videos: number; mentions: number };

export type DriftPoint = {
  id: number;
  position: number;
  label: string;
  stance: string;
  quote: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string;
  timestamp: string;
  url: string;
};

export type DriftResult = {
  topic: string;
  axis: { negative: string; positive: string };
  points: DriftPoint[];
  shifts: { from_id: number; to_id: number; type: string; explanation: string }[];
  summary: string;
  video_idea: string;
};

export type ComposedClip = {
  video_id: string;
  title: string;
  thumbnail: string | null;
  role: "hook" | "context" | "proof" | "payoff" | "cta";
  start: number;
  end: number;
  duration: number;
  timestamp: string;
  url: string;
  text: string;
  why: string;
};

export type Composition = {
  theme: string;
  title: string;
  hook_overlay: string;
  caption: string;
  editor_notes: string;
  clips: ComposedClip[];
  total_seconds: number;
  source_videos: number;
};

export type GraphData = {
  nodes: { id: string; title: string; thumbnail: string | null; views: number; year: number; published_at: string }[];
  links: { source: string; target: string; similarity: number }[];
};

export type Related = { video_id: string; title: string; thumbnail: string | null; published_at: string; similarity: number };

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export const fmtViews = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`;

// ---------- Brain chat (agent) ----------

export type ChatStep = { agent: string; tool: string; detail: string };

export type ChatCard =
  | { kind: "ask"; agent: string; data: AskResult }
  | { kind: "compose"; agent: string; data: Composition }
  | { kind: "drift"; agent: string; data: DriftResult }
  | { kind: "promises"; agent: string; data: { promises: ChatPromise[] } }
  | { kind: "videos"; agent: string; data: { videos: ChatVideo[] } };

export type ChatPromise = {
  id: number;
  promise: string;
  status: "open" | "fulfilled" | "dismissed";
  evidence: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string;
  timestamp: string;
  url: string;
};

export type ChatVideo = { video_id: string; title: string; thumbnail: string | null; published_at: string; url: string };

export type ChatMessage = { role: "user" | "assistant"; content: string; cards?: ChatCard[]; steps?: ChatStep[] };

export type ChatThread = { id: string; title: string; created_at: string | null; updated_at: string | null };

export type ChatEvent =
  | { type: "thread"; thread_id: string }
  | ({ type: "step" } & ChatStep)
  | { type: "token"; text: string }
  | ({ type: "card" } & ChatCard)
  | { type: "final"; thread_id: string; message: string }
  | { type: "error"; message: string };

/** POST a chat turn and call `onEvent` for each Server-Sent Event until the stream ends. */
export async function streamChat(
  channelId: string,
  message: string,
  threadId: string | null,
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/channels/${channelId}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, thread_id: threadId }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(`Can't reach the backend at ${API_URL}. Is it running?`, 0);
  }
  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {}
    throw new ApiError(detail, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      for (const line of frame.split("\n")) {
        if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)) as ChatEvent);
      }
    }
  }
}
