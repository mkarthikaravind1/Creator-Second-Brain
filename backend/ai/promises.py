"""Promise Ledger: decide whether each on-camera promise was fulfilled by a later video."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai.llm import chat_json
from config import settings
from models import Promise, Video
from search.vector import fmt_ts, search_chunks

SYSTEM = """You check whether a YouTube creator kept a promise they made on camera.
You get the promise and candidate excerpts from videos published AFTER it.
A promise is fulfilled only if a candidate clearly delivers it (e.g. the promised part 2, review or
follow-up video actually exists). Merely mentioning the topic again is NOT fulfilment.
Return JSON: {"fulfilled": true|false, "candidate": <number of the fulfilling excerpt or null>,
"evidence": "<one sentence explaining the decision>"}"""


def match_promise(session: Session, promise: Promise) -> None:
    video = session.get(Video, promise.video_id)
    if promise.embedding is None or video is None:
        return
    candidates = search_chunks(
        session, video.channel_id, promise.embedding, limit=5, published_after=video.published_at, min_similarity=0.55
    )
    if not candidates:
        promise.status, promise.fulfilled_video_id, promise.fulfilled_timestamp = "open", None, None
        promise.evidence = "No later video discusses this yet."
        return

    listing = "\n\n".join(
        f'[{i + 1}] Video "{v.title}" ({v.published_at:%Y-%m-%d}) at {fmt_ts(c.start)}:\n{c.text[:700]}'
        for i, (c, v, _) in enumerate(candidates)
    )
    user = (
        f'Promise (made {video.published_at:%Y-%m-%d} in "{video.title}"): {promise.promise}\n'
        f'Exact words: "{promise.quote}"\n\nCandidates:\n{listing}'
    )
    data = chat_json(SYSTEM, user, model=settings.llm_fast_model, max_tokens=300, temperature=0)
    idx = data.get("candidate")
    if data.get("fulfilled") and isinstance(idx, int) and 1 <= idx <= len(candidates):
        chunk, v, _ = candidates[idx - 1]
        promise.status = "fulfilled"
        promise.fulfilled_video_id, promise.fulfilled_timestamp = v.id, chunk.start
    else:
        promise.status, promise.fulfilled_video_id, promise.fulfilled_timestamp = "open", None, None
    promise.evidence = str(data.get("evidence", ""))[:600]


def match_all_promises(session: Session, channel_id: str, on_progress=None) -> int:
    promises = session.scalars(
        select(Promise).join(Video, Promise.video_id == Video.id).where(Video.channel_id == channel_id)
    ).all()
    todo = [p for p in promises if not p.manual]
    for i, p in enumerate(todo):
        match_promise(session, p)
        session.commit()
        if on_progress:
            on_progress(i + 1, len(todo))
    return len(todo)
