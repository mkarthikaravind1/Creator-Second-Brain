"""Per-video extraction at index time: reel candidates, on-camera promises and stances.

Split into steps the indexing graph (agents/indexing_graph.py) runs as separate nodes:
  transcript_slices → extract_slice (LLM) → check_slice (deterministic) → [retry with feedback] → save_analysis
"""

import re

from langsmith import traceable
from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy.orm import Session

from ai.llm import chat_json
from config import settings
from models import Chunk, Promise, ReelCandidate, Stance, Video
from search.embeddings import embed_texts
from search.vector import segments_between

SYSTEM = """You analyse YouTube video transcripts for the creator who made them.
Transcript lines are prefixed with their start time in seconds, e.g. "[83.2] text".
Return ONLY a JSON object with exactly these keys:

{
  "reels": [ {"start": <sec>, "end": <sec>, "hook": "<opening line / on-screen hook>",
              "caption": "<short social caption>", "reason": "<why it works as a reel>",
              "scores": {"hook": 0-10, "standalone": 0-10, "emotion": 0-10, "value": 0-10}} ],
  "promises": [ {"timestamp": <sec>, "quote": "<creator's exact words>",
                 "promise": "<normalised commitment, e.g. 'Make a part 2 about budgeting apps'>",
                 "kind": "video|series|review|update|other"} ],
  "stances": [ {"timestamp": <sec>, "topic": "<2-4 word lowercase topic>",
                "stance": "<the creator's position in one sentence>", "quote": "<exact words>"} ]
}

Rules:
- reels: at most 3 moments that would work as a 15-60 second Short/Reel on their own: a strong opening
  line, a complete thought, surprise/emotion/humour or a concrete takeaway. start/end must be line start
  times from the transcript and 15-60 s apart. Skip weak moments — an empty list is fine.
- promises: ONLY explicit commitments the creator makes about future content or actions
  ("I'll make a video on...", "part 2 is coming", "I'll review this in 6 months", "if this gets 1k likes I'll...").
  Ignore sponsor reads, "see you next time", "subscribe", and anything already done in this video.
- stances: at most 6 clear opinions, recommendations or judgements on a specific topic
  (products, tools, strategies, habits, beliefs). Use stable, generic topic names so the same topic
  from different videos can be matched (e.g. "used cameras", "morning routine", "index funds").
- Copy quotes verbatim from the transcript. Never invent timestamps."""

# Output reservation for one slice. With gpt-oss, chat_json adds 2000 for hidden reasoning; together with
# the slice (settings.analysis_segment_chars) this keeps each request under Groq's free-tier 8K tokens/min.
MAX_OUTPUT_TOKENS = 2000


# ---------- structured output ----------


class Scores(BaseModel):
    hook: float = 5
    standalone: float = 5
    emotion: float = 5
    value: float = 5

    @field_validator("*", mode="before")
    @classmethod
    def _score(cls, v):
        try:
            return max(0.0, min(10.0, float(v)))
        except (TypeError, ValueError):
            return 5.0


class ReelOut(BaseModel):
    start: float
    end: float
    hook: str = ""
    caption: str = ""
    reason: str = ""
    scores: Scores = Field(default_factory=Scores)


class PromiseOut(BaseModel):
    timestamp: float = 0
    quote: str = ""
    promise: str
    kind: str = "other"


class StanceOut(BaseModel):
    timestamp: float = 0
    topic: str
    stance: str
    quote: str = ""


class VideoAnalysis(BaseModel):
    reels: list[ReelOut] = Field(default_factory=list)
    promises: list[PromiseOut] = Field(default_factory=list)
    stances: list[StanceOut] = Field(default_factory=list)

    @classmethod
    def lenient(cls, data: dict) -> "VideoAnalysis":
        """Validate item by item so one malformed entry doesn't discard the whole slice."""
        out = cls()
        for key, model in (("reels", ReelOut), ("promises", PromiseOut), ("stances", StanceOut)):
            for item in data.get(key) or []:
                try:
                    getattr(out, key).append(model.model_validate(item))
                except ValidationError:
                    continue
        return out


# ---------- steps ----------


def transcript_slices(chunks: list[Chunk], max_chars: int | None = None) -> list[list[tuple[float, str]]]:
    """Transcript lines grouped into slices that fit one LLM request."""
    max_chars = max_chars or settings.analysis_segment_chars
    slices, current, size = [], [], 0
    for c in chunks:
        for start, text in c.segments:
            line = f"[{start}] {text}"
            if size + len(line) > max_chars and current:
                slices.append(current)
                current, size = [], 0
            current.append((float(start), text))
            size += len(line) + 1
    if current:
        slices.append(current)
    return slices


@traceable(name="Extract reels, promises, stances")
def extract_slice(video: Video, lines: list[tuple[float, str]], part: int, parts: int, feedback: list[str]) -> VideoAnalysis:
    header = f'Video title: "{video.title}" (published {video.published_at:%Y-%m-%d})'
    if parts > 1:
        header += f" — transcript part {part + 1} of {parts}"
    user = f"{header}\n\nTranscript:\n" + "\n".join(f"[{s}] {t}" for s, t in lines)
    if feedback:
        user += (
            "\n\nYour previous answer for this transcript had these problems — fix them and return the full JSON "
            "again:\n- " + "\n- ".join(feedback)
        )
    return VideoAnalysis.lenient(chat_json(SYSTEM, user, max_tokens=MAX_OUTPUT_TOKENS))


_WORD = re.compile(r"[\w']+")


def _words(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def quote_found(quote: str, transcript_words: set[tuple[str, ...]], vocab: set[str]) -> bool:
    """True when the quote really comes from the transcript: most of its word trigrams (or, for short
    quotes, its words) appear there. Tolerates small wording/punctuation differences, rejects invention."""
    words = _words(quote)
    if not words:
        return False
    if len(words) < 3:
        return all(w in vocab for w in words)
    grams = [tuple(words[i : i + 3]) for i in range(len(words) - 2)]
    return sum(g in transcript_words for g in grams) / len(grams) >= 0.6


def check_slice(result: VideoAnalysis, lines: list[tuple[float, str]]) -> tuple[VideoAnalysis, list[str]]:
    """Deterministic quality check. Returns the items that pass, plus problems to send back to the model."""
    words = _words(" ".join(t for _, t in lines))
    trigrams = {tuple(words[i : i + 3]) for i in range(len(words) - 2)}
    vocab = set(words)
    lo, hi = lines[0][0] - 1, lines[-1][0] + 60
    problems: list[str] = []
    ok = VideoAnalysis()

    for r in result.reels:
        if not (lo <= r.start <= hi and r.start < r.end):
            problems.append(f"reel at {r.start}-{r.end}s: times are outside this transcript or reversed")
            continue
        ok.reels.append(r)
    for p in result.promises:
        if not quote_found(p.quote, trigrams, vocab):
            problems.append(f'promise "{p.promise}": the quote is not in the transcript — copy the exact words')
        elif not lo <= p.timestamp <= hi:
            problems.append(f'promise "{p.promise}": timestamp {p.timestamp}s is outside this transcript')
        else:
            ok.promises.append(p)
    for s in result.stances:
        topic_words = len(s.topic.split())
        if not quote_found(s.quote, trigrams, vocab):
            problems.append(f'stance on "{s.topic}": the quote is not in the transcript — copy the exact words')
        elif not lo <= s.timestamp <= hi:
            problems.append(f'stance on "{s.topic}": timestamp {s.timestamp}s is outside this transcript')
        elif not 1 <= topic_words <= 4:
            problems.append(f'stance topic "{s.topic}" should be a generic 2-4 word topic')
        else:
            s.topic = s.topic.strip().lower()
            ok.stances.append(s)
    return ok, problems


def save_analysis(session: Session, video: Video, result: VideoAnalysis) -> dict:
    """Replace the video's reels/promises/stances with `result` (already quality-checked)."""
    chunks = sorted(video.chunks, key=lambda c: c.start)
    duration = max(video.duration_sec, chunks[-1].end if chunks else 0)

    for model in (ReelCandidate, Promise, Stance):
        session.query(model).filter(model.video_id == video.id).delete()

    reel_rows = []
    for r in result.reels:
        start, end = max(0.0, r.start), min(r.end, duration)
        if end - start < 8:
            end = min(start + 30, duration)
        if end - start > 90:
            end = start + 60
        parts = [r.scores.hook, r.scores.standalone, r.scores.emotion, r.scores.value]
        reel_rows.append(
            ReelCandidate(
                video_id=video.id,
                start=start,
                end=end,
                score=round(sum(parts) / 4 * 10, 1),
                hook=r.hook[:500],
                caption=r.caption[:500],
                reason=r.reason[:800],
                scores=r.scores.model_dump(),
                transcript=segments_between(chunks, start, end),
            )
        )
    promise_rows = [
        Promise(
            video_id=video.id,
            timestamp=max(0.0, p.timestamp),
            quote=p.quote[:800],
            promise=p.promise.strip()[:400],
            kind=p.kind[:20],
        )
        for p in result.promises
        if p.promise.strip()
    ]
    stance_rows = [
        Stance(
            video_id=video.id,
            timestamp=max(0.0, s.timestamp),
            topic=s.topic[:80],
            stance=s.stance.strip()[:500],
            quote=s.quote[:800],
        )
        for s in result.stances
        if s.stance.strip()
    ]

    texts = (
        [f"{r.hook} {r.transcript}" for r in reel_rows]
        + [p.promise for p in promise_rows]
        + [f"{s.topic}: {s.stance}" for s in stance_rows]
    )
    for row, vec in zip([*reel_rows, *promise_rows, *stance_rows], embed_texts(texts)):
        row.embedding = vec

    session.add_all([*reel_rows, *promise_rows, *stance_rows])
    video.status = "analyzed"
    session.commit()
    return {"reels": len(reel_rows), "promises": len(promise_rows), "stances": len(stance_rows)}
