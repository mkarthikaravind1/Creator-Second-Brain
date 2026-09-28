"""Opinion Drift: how the creator's stance on a topic changed over time."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ai.llm import chat_json
from models import Stance, Video
from search.embeddings import embed_query
from search.vector import fmt_ts, search_stances, yt_url

SYSTEM = """You track how a YouTube creator's opinion on a topic evolved. You receive their stances,
oldest first, each with an id. Place each on an axis from -1 to +1 relative to the topic and detect
changes of mind. Ignore stances that are not actually about the topic.
Return JSON:
{"axis": {"negative": "<label for -1, e.g. 'Against'>", "positive": "<label for +1, e.g. 'In favour'>"},
 "points": [{"id": <stance id>, "position": <-1..1>, "label": "<3-6 word summary>"}],
 "shifts": [{"from_id": <id>, "to_id": <id>, "type": "reversal|softening|strengthening|contradiction",
             "explanation": "<one sentence>"}],
 "summary": "<2-3 sentences on how the view evolved, or that it stayed consistent>",
 "video_idea": "<a video idea built on this evolution, e.g. 'Why I changed my mind about X', or empty>"}"""


def list_topics(session: Session, channel_id: str, limit: int = 40) -> list[dict]:
    videos = func.count(func.distinct(Stance.video_id))
    rows = session.execute(
        select(Stance.topic, videos.label("videos"), func.count().label("mentions"))
        .join(Video, Stance.video_id == Video.id)
        .where(Video.channel_id == channel_id)
        .group_by(Stance.topic)
        .order_by(videos.desc(), func.count().desc())
        .limit(limit)
    ).all()
    return [{"topic": t, "videos": v, "mentions": m} for t, v, m in rows]


def analyze_drift(session: Session, channel_id: str, topic: str) -> dict:
    hits = search_stances(session, channel_id, embed_query(topic), limit=25, min_similarity=0.6)
    hits.sort(key=lambda h: h[1].published_at)
    if len({v.id for _, v, _ in hits}) < 2:
        return {
            "topic": topic,
            "points": [],
            "shifts": [],
            "summary": "You've only expressed an opinion on this in one video (or none), so there's no drift to track yet.",
            "axis": {"negative": "Against", "positive": "In favour"},
            "video_idea": "",
        }

    listing = "\n".join(
        f'id={s.id} | {v.published_at:%Y-%m-%d} | "{v.title}" | stance: {s.stance} | quote: "{s.quote}"'
        for s, v, _ in hits
    )
    data = chat_json(SYSTEM, f"Topic: {topic}\n\nStances (oldest first):\n{listing}", max_tokens=1800)

    by_id = {s.id: (s, v) for s, v, _ in hits}
    points = []
    for p in data.get("points", []):
        pid = p.get("id")
        if pid not in by_id:
            continue
        s, v = by_id[pid]
        try:
            position = max(-1.0, min(1.0, float(p.get("position", 0))))
        except (TypeError, ValueError):
            position = 0.0
        points.append(
            {
                "id": s.id,
                "position": position,
                "label": p.get("label", ""),
                "stance": s.stance,
                "quote": s.quote,
                "video_id": v.id,
                "title": v.title,
                "thumbnail": v.thumbnail,
                "published_at": v.published_at.isoformat(),
                "timestamp": fmt_ts(s.timestamp),
                "url": yt_url(v.id, s.timestamp),
            }
        )
    points.sort(key=lambda p: p["published_at"])
    valid = {p["id"] for p in points}
    shifts = [s for s in data.get("shifts", []) if s.get("from_id") in valid and s.get("to_id") in valid]
    return {
        "topic": topic,
        "axis": data.get("axis") or {"negative": "Against", "positive": "In favour"},
        "points": points,
        "shifts": shifts,
        "summary": data.get("summary", ""),
        "video_idea": data.get("video_idea", ""),
    }
