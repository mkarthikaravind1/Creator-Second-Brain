"""Indexing as a LangGraph workflow: channel → videos → transcripts → per-video analysis with a quality
check and one self-correcting retry → Promise Auditor → done.

    START ─┬─ index ────▶ resolve_channel → list_videos → fetch_transcript ⟲ (one video per step)
           │                                                  │
           ├─ upload ───▶ store_upload ────────────────┐      ▼
           │                                           └──▶ next_video ◀──────────────┐
           │                                                  │ (none left)           │
           │                                                  │         extract → quality_check
           │                                                  │            ▲   │ problems    │ ok
           │                                                  │            └───┘ (1 retry)   ▼
           │                                                  ▼                            save
           └─ promises ─────────────────────────────▶ audit_promises → finish → END

Job progress is written in one place (the `_stage` wrapper) instead of being threaded through the logic.
"""

import logging
import traceback
from dataclasses import dataclass
from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.runtime import Runtime
from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.specialists.promise_auditor import verify_all
from ai.analyze import VideoAnalysis, check_slice, extract_slice, save_analysis, transcript_slices
from ai.llm import LLMConfigError, LLMDailyLimit
from config import settings
from db import SessionLocal
from ingest.transcripts import TranscriptBlocked, chunk_transcript, fetch_transcript, parse_subtitles, transcribe_audio
from ingest.youtube import list_upload_ids, resolve_channel, video_details
from models import Channel, Chunk, Job, Video
from search.embeddings import embed_texts, mean_vector

log = logging.getLogger("indexing")

MAX_RETRIES = 1  # quality-check retries per video (each is one more LLM call per failing slice)
BLOCKED_STREAK_LIMIT = 3  # stop hammering YouTube once it is clearly blocking us


class IndexState(TypedDict, total=False):
    mode: Literal["index", "upload", "promises"]
    channel_input: str
    max_videos: int | None
    channel_id: str
    # upload mode
    video_id: str
    upload_name: str
    upload_data: bytes
    # transcript stage
    fetch_queue: list[str]
    listed: int
    fetched: int
    blocked_streak: int
    blocked: int
    # analysis stage
    analyze_queue: list[str]
    analyze_total: int
    current: str | None
    slices: list[list[tuple[float, str]]]
    drafts: list[VideoAnalysis | None]  # this pass's raw LLM output per slice (None = not re-extracted)
    kept: list[VideoAnalysis | None]  # verified items per slice
    problems: list[list[str]]  # quality-check findings per slice, fed back on a retry
    attempt: int
    retry: bool
    analyzed: int
    failures: int
    retried: int


@dataclass
class IndexContext:
    session: Session
    job: Job

    def update(self, **fields) -> None:
        for k, v in fields.items():
            setattr(self.job, k, v)
        self.session.commit()


def _stage(label: str):
    """Node decorator: show the stage on the job before the node runs."""

    def wrap(fn):
        def node(state: IndexState, runtime: Runtime[IndexContext]):
            if runtime.context.job.stage != label:
                runtime.context.update(stage=label)
            return fn(state, runtime.context)

        node.__name__ = fn.__name__
        return node

    return wrap


# ---------- store transcripts ----------


def store_transcript(session: Session, video: Video, snippets: list[dict]) -> None:
    session.query(Chunk).filter(Chunk.video_id == video.id).delete()
    chunks = chunk_transcript(snippets)
    vecs = embed_texts([c["text"] for c in chunks])
    session.add_all(Chunk(video_id=video.id, embedding=v, **c) for c, v in zip(chunks, vecs))
    video.embedding = mean_vector(vecs)
    video.status = "transcribed"
    session.flush()
    session.expire(video, ["chunks"])


# ---------- nodes ----------


@_stage("Finding channel")
def resolve(state: IndexState, ctx: IndexContext) -> IndexState:
    info = resolve_channel(state["channel_input"])
    channel = ctx.session.get(Channel, info["id"])
    if channel is None:
        ctx.session.add(Channel(**info))
    else:
        for k, v in info.items():
            setattr(channel, k, v)
    ctx.update(channel_id=info["id"])
    return {"channel_id": info["id"]}


@_stage("Fetching video list")
def list_videos(state: IndexState, ctx: IndexContext) -> IndexState:
    s = ctx.session
    channel = s.get(Channel, state["channel_id"])
    ids = list_upload_ids(channel.uploads_playlist, state.get("max_videos") or settings.max_videos)
    for d in video_details(ids):
        video = s.get(Video, d["id"])
        if video is None:
            s.add(Video(channel_id=channel.id, **d))
        else:
            video.view_count, video.title = d["view_count"], d["title"]
    s.commit()
    queue = s.scalars(
        select(Video.id).where(Video.channel_id == channel.id, Video.status.in_(["pending", "blocked"]))
    ).all()
    ctx.update(progress=0, total=len(queue))
    return {"listed": len(ids), "fetch_queue": list(queue), "fetched": 0, "blocked_streak": 0, "blocked": 0}


@_stage("Fetching transcripts & embedding")
def fetch_one(state: IndexState, ctx: IndexContext) -> IndexState:
    queue = list(state["fetch_queue"])
    video = ctx.session.get(Video, queue.pop(0))
    streak, blocked = state["blocked_streak"], state["blocked"]
    if streak >= BLOCKED_STREAK_LIMIT:
        video.status, blocked = "blocked", blocked + 1
    else:
        try:
            snippets = fetch_transcript(video.id)
            streak = 0
            if snippets:
                store_transcript(ctx.session, video, snippets)
            else:
                video.status = "no_transcript"
        except TranscriptBlocked:
            video.status, streak, blocked = "blocked", streak + 1, blocked + 1
    fetched = state["fetched"] + 1
    ctx.update(progress=fetched)
    return {"fetch_queue": queue, "fetched": fetched, "blocked_streak": streak, "blocked": blocked}


@_stage("AI analysis (reels, promises, opinions)")
def plan_analysis(state: IndexState, ctx: IndexContext) -> IndexState:
    """Queue every transcribed video, plus earlier failures so a re-index retries them."""
    queue = ctx.session.scalars(
        select(Video.id)
        .where(Video.channel_id == state["channel_id"], Video.status.in_(["transcribed", "failed"]))
        .order_by(Video.published_at)
    ).all()
    ctx.update(progress=0, total=len(queue))
    return {"analyze_queue": list(queue), "analyze_total": len(queue), "analyzed": 0, "failures": 0, "retried": 0}


@_stage("Reading your upload")
def store_upload(state: IndexState, ctx: IndexContext) -> IndexState:
    video = ctx.session.get(Video, state["video_id"])
    name, data = state["upload_name"], state["upload_data"]
    if name.lower().endswith((".srt", ".vtt")):
        snippets = parse_subtitles(data.decode("utf-8", errors="ignore"))
    else:
        ctx.update(stage="Transcribing audio with Whisper")
        snippets = transcribe_audio(name, data)
    if not snippets:
        raise ValueError("No speech/subtitle lines found in that file")
    store_transcript(ctx.session, video, snippets)
    ctx.session.commit()
    ctx.update(stage="AI analysis (reels, promises, opinions)", progress=0, total=1, message=f"Added {len(snippets)} transcript lines.")
    return {
        "channel_id": video.channel_id,
        "analyze_queue": [video.id],
        "analyze_total": 1,
        "analyzed": 0,
        "failures": 0,
        "retried": 0,
    }


@_stage("AI analysis (reels, promises, opinions)")
def next_video(state: IndexState, ctx: IndexContext) -> IndexState:
    ctx.update(progress=state["analyzed"] + state["failures"])
    queue = list(state["analyze_queue"])
    if not queue:
        return {"current": None}
    video = ctx.session.get(Video, queue.pop(0))
    chunks = sorted(video.chunks, key=lambda c: c.start)
    slices = transcript_slices(chunks)
    return {
        "analyze_queue": queue,
        "current": video.id,
        "slices": slices,
        "kept": [None] * len(slices),
        "problems": [[] for _ in slices],
        "attempt": 0,
    }


@_stage("AI analysis (reels, promises, opinions)")
def extract(state: IndexState, ctx: IndexContext) -> IndexState:
    """LLM extraction for every slice not yet done — on a retry, only slices that had problems, with the
    problems fed back to the model."""
    video = ctx.session.get(Video, state["current"])
    slices, kept, problems = state["slices"], list(state["kept"]), state["problems"]
    drafts: list[VideoAnalysis | None] = [None] * len(slices)
    try:
        for i, lines in enumerate(slices):
            if kept[i] is None or problems[i]:
                drafts[i] = extract_slice(video, lines, i, len(slices), problems[i])
    except (LLMConfigError, LLMDailyLimit):
        raise  # stop the whole job — every remaining video would fail the same way
    except Exception:
        ctx.session.rollback()
        log.exception("analysis failed for %s", video.id)
        video = ctx.session.get(Video, state["current"])
        video.status = "failed"
        ctx.session.commit()
        return {"current": None, "failures": state["failures"] + 1}
    return {"drafts": drafts}


@_stage("AI analysis (reels, promises, opinions)")
def quality_check(state: IndexState, ctx: IndexContext) -> IndexState:
    """Deterministic check (quotes really in the transcript, timestamps in range, topic names); decides
    whether to send the problems back to the model for one more attempt."""
    kept, problems = list(state["kept"]), [list(p) for p in state["problems"]]
    for i, draft in enumerate(state["drafts"]):
        if draft is None:
            continue
        ok, issues = check_slice(draft, state["slices"][i])
        previous = kept[i]
        # a retry replaces the earlier result only if it kept at least as much verified content
        if previous is None or _size(ok) >= _size(previous):
            kept[i] = ok
        problems[i] = issues
    retry = any(problems) and state["attempt"] < MAX_RETRIES
    return {
        "kept": kept,
        "problems": problems,
        "retry": retry,
        "attempt": state["attempt"] + (1 if retry else 0),
        "retried": state["retried"] + (1 if retry else 0),
    }


def _size(a: VideoAnalysis) -> int:
    return len(a.reels) + len(a.promises) + len(a.stances)


@_stage("AI analysis (reels, promises, opinions)")
def save(state: IndexState, ctx: IndexContext) -> IndexState:
    video = ctx.session.get(Video, state["current"])
    merged = VideoAnalysis()
    for part in state["kept"]:
        if part is not None:
            merged.reels += part.reels
            merged.promises += part.promises
            merged.stances += part.stances
    save_analysis(ctx.session, video, merged)
    return {"analyzed": state["analyzed"] + 1, "current": None}


@_stage("Checking which promises you kept")
def audit_promises(state: IndexState, ctx: IndexContext) -> IndexState:
    ctx.update(progress=0, total=0)
    verify_all(ctx.session, state["channel_id"], on_progress=lambda d, t: ctx.update(progress=d, total=t))
    return {}


@_stage("Done")
def finish(state: IndexState, ctx: IndexContext) -> IndexState:
    mode = state["mode"]
    if mode == "index":
        msg = f"Indexed {state['listed']} videos."
        if state.get("blocked"):
            msg += (
                f" YouTube blocked transcript downloads for {state['blocked']} videos — re-index later, set"
                " TRANSCRIPT_PROXY, or upload subtitles/audio per video on the Videos tab."
            )
    else:
        msg = ctx.job.message or ""
    if state.get("failures"):
        msg += f" {state['failures']} failed AI analysis — re-run indexing to retry them."
    ctx.update(status="done", stage="Done", message=msg.strip())
    return {}


# ---------- routing ----------


def _entry(state: IndexState) -> str:
    return {"index": "resolve_channel", "upload": "store_upload", "promises": "audit_promises"}[state["mode"]]


def _after_fetch(state: IndexState) -> str:
    return "fetch_transcript" if state["fetch_queue"] else "plan_analysis"


def _after_next(state: IndexState) -> str:
    return "extract" if state.get("current") else "audit_promises"


def _after_extract(state: IndexState) -> str:
    return "quality_check" if state.get("current") else "next_video"  # current cleared = video failed


def _after_check(state: IndexState) -> str:
    return "extract" if state.get("retry") else "save"


def build_graph():
    g = StateGraph(IndexState, context_schema=IndexContext)
    g.add_node("resolve_channel", resolve)
    g.add_node("list_videos", list_videos)
    g.add_node("fetch_transcript", fetch_one)
    g.add_node("plan_analysis", plan_analysis)
    g.add_node("store_upload", store_upload)
    g.add_node("next_video", next_video)
    g.add_node("extract", extract)
    g.add_node("quality_check", quality_check)
    g.add_node("save", save)
    g.add_node("audit_promises", audit_promises)
    g.add_node("finish", finish)

    g.add_conditional_edges(START, _entry, ["resolve_channel", "store_upload", "audit_promises"])
    g.add_edge("resolve_channel", "list_videos")
    g.add_conditional_edges("list_videos", _after_fetch, ["fetch_transcript", "plan_analysis"])
    g.add_conditional_edges("fetch_transcript", _after_fetch, ["fetch_transcript", "plan_analysis"])
    g.add_edge("plan_analysis", "next_video")
    g.add_edge("store_upload", "next_video")
    g.add_conditional_edges("next_video", _after_next, ["extract", "audit_promises"])
    g.add_conditional_edges("extract", _after_extract, ["quality_check", "next_video"])
    g.add_conditional_edges("quality_check", _after_check, ["extract", "save"])
    g.add_edge("save", "next_video")
    g.add_edge("audit_promises", "finish")
    g.add_edge("finish", END)
    return g.compile(name="indexing")


_graph = None


def run(job_id: int, initial: IndexState, videos_hint: int = 0) -> None:
    """Run the graph for one job; failures are recorded on the job, never raised to the caller."""
    global _graph
    if _graph is None:
        _graph = build_graph()
    session = SessionLocal()
    job = session.get(Job, job_id)
    ctx = IndexContext(session, job)
    try:
        ctx.update(status="running")
        limit = 12 * max(videos_hint, settings.max_videos, 1) + 50  # every loop iteration is a graph step
        _graph.invoke(
            initial,
            context=ctx,
            config={
                "recursion_limit": limit,
                "run_name": f"Indexing ({initial['mode']})",
                "tags": ["indexing"],
                "metadata": {"job_id": job_id, "channel_id": initial.get("channel_id") or initial.get("channel_input")},
            },
        )
    except LLMConfigError as e:
        session.rollback()
        if initial["mode"] == "upload":
            msg = f"Transcript saved, but AI analysis needs a key: {e}"
        else:
            msg = f"{e}. Transcripts and search are ready; add the key and re-index to run the AI features."
        ctx.update(status="failed", message=msg)
    except LLMDailyLimit as e:
        session.rollback()
        ctx.update(status="failed", message=f"{e} Finished videos are kept — re-index later to continue.")
    except Exception as e:  # noqa: BLE001 — recorded on the job for the UI
        session.rollback()
        log.error(traceback.format_exc())
        ctx.update(status="failed", message=str(e)[:1000])
    finally:
        session.close()
