"""'Have I talked about this before?' — retrieval + grounded answer with timestamp citations."""

from sqlalchemy.orm import Session

from ai.llm import chat_json
from search.embeddings import embed_query
from search.vector import fmt_ts, search_chunks, yt_url

SYSTEM = """You are the "second brain" of a YouTube creator. Answer their question using ONLY the
numbered excerpts from their own past videos. Speak to the creator directly ("you said...").
Cite excerpts inline as [n]. If the excerpts don't cover the topic, say so plainly.
Return JSON:
{"verdict": "covered" | "partially" | "new",
 "answer": "<2-6 sentences, markdown allowed, with [n] citations>",
 "cited": [<excerpt numbers you relied on>],
 "fresh_angle": "<if partially/new: an angle the creator hasn't covered yet; else empty string>"}
verdict meaning: covered = discussed in depth before; partially = touched on briefly or a related
angle; new = never really discussed."""


def ask(session: Session, channel_id: str, question: str, k: int = 10) -> dict:
    hits = search_chunks(session, channel_id, embed_query(question), limit=k)
    sources = [
        {
            "n": i + 1,
            "video_id": v.id,
            "title": v.title,
            "published_at": v.published_at.isoformat(),
            "thumbnail": v.thumbnail,
            "start": c.start,
            "timestamp": fmt_ts(c.start),
            "url": yt_url(v.id, c.start),
            "text": c.text,
            "similarity": round(sim, 3),
        }
        for i, (c, v, sim) in enumerate(hits)
    ]
    if not sources:
        return {"verdict": "new", "answer": "Nothing indexed yet for this channel.", "sources": [], "fresh_angle": ""}

    context = "\n\n".join(
        f'[{s["n"]}] "{s["title"]}" ({s["published_at"][:10]}) at {s["timestamp"]}:\n{s["text"]}' for s in sources
    )
    data = chat_json(SYSTEM, f"Question: {question}\n\nExcerpts:\n{context}", max_tokens=900)
    cited = {int(n) for n in data.get("cited", []) if str(n).isdigit()}
    for s in sources:
        s["cited"] = s["n"] in cited
    verdict = data.get("verdict") if data.get("verdict") in ("covered", "partially", "new") else "partially"
    return {
        "verdict": verdict,
        "answer": data.get("answer", ""),
        "fresh_angle": data.get("fresh_angle", ""),
        "sources": sources,
    }
