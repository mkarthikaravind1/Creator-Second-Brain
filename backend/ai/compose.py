"""Ghost Clip Composer: stitch moments from different videos into one new Short."""

from collections import defaultdict

from sqlalchemy.orm import Session

from ai.llm import chat_json
from search.embeddings import embed_query
from search.vector import fmt_ts, search_chunks, yt_url

ROLES = ("hook", "context", "proof", "payoff", "cta")

SYSTEM = """You are a short-form video editor. Build ONE new vertical Short (Reel/TikTok) for a creator
by stitching moments from their existing videos — no new filming. You receive numbered source
excerpts; each line is prefixed with its start time in seconds, e.g. "[83.2] text".
Return JSON:
{"title": "<working title>",
 "hook_overlay": "<punchy on-screen text for the first 2 seconds>",
 "clips": [{"source": <excerpt number>, "role": "hook|context|proof|payoff|cta",
            "start": <sec>, "end": <sec>, "why": "<why this piece, in this position>"}],
 "caption": "<post caption with 2-3 hashtags>",
 "editor_notes": "<transitions, b-roll or text suggestions>"}
Rules:
- 3-5 clips that form one arc: open with a hook, end with a payoff (or cta).
- Use at least 2 different source videos; 3+ is better. Never reuse the same moment.
- Each clip 4-20 seconds; start/end must be line start times from that excerpt.
- Total length close to the target duration.
- The spoken lines must flow as a coherent story when played back to back."""


def compose(session: Session, channel_id: str, theme: str, target_seconds: int = 45) -> dict:
    hits = search_chunks(session, channel_id, embed_query(theme), limit=40)
    per_video: dict[str, int] = defaultdict(int)
    picked = []
    for c, v, sim in hits:
        if per_video[v.id] >= 3:
            continue
        per_video[v.id] += 1
        picked.append((c, v, sim))
        if len(picked) >= 14:
            break
    if len({v.id for _, v, _ in picked}) < 2:
        return {"error": "Need material from at least two different videos on this theme. Try a broader theme."}

    listing = "\n\n".join(
        f'=== Excerpt {i + 1} — "{v.title}" ({v.published_at:%Y-%m-%d}) ===\n'
        + "\n".join(f"[{s}] {t}" for s, t in c.segments)
        for i, (c, v, _) in enumerate(picked)
    )
    data = chat_json(
        SYSTEM, f"Theme: {theme}\nTarget duration: {target_seconds} seconds\n\nSources:\n{listing}", max_tokens=1800
    )

    clips, seen = [], set()
    for clip in data.get("clips", []):
        try:
            idx = int(clip.get("source")) - 1
            start, end = float(clip.get("start")), float(clip.get("end"))
        except (TypeError, ValueError):
            continue
        if not 0 <= idx < len(picked) or (idx, round(start)) in seen:
            continue
        chunk, video, _ = picked[idx]
        seg_starts = [s for s, _ in chunk.segments]
        # snap to the closest line boundary inside the excerpt so cuts land between sentences
        start = min(seg_starts, key=lambda s: abs(s - start))
        if end <= start + 3 or end > chunk.end + 5:  # model's range was off — take a sensible slice
            end = min(start + 10, chunk.end)
        end = min(end, start + 25)
        if end <= start + 2:
            end = start + 6
        seen.add((idx, round(start)))
        text = " ".join(t for s, t in chunk.segments if start - 0.5 <= s < end)
        clips.append(
            {
                "video_id": video.id,
                "title": video.title,
                "thumbnail": video.thumbnail,
                "role": clip.get("role") if clip.get("role") in ROLES else "context",
                "start": round(start, 1),
                "end": round(end, 1),
                "duration": round(end - start, 1),
                "timestamp": f"{fmt_ts(start)}–{fmt_ts(end)}",
                "url": yt_url(video.id, start),
                "text": text,
                "why": clip.get("why", ""),
            }
        )
    if len(clips) < 2:
        return {"error": "The model couldn't build a sequence for this theme. Try rephrasing it."}

    return {
        "theme": theme,
        "title": data.get("title") or theme,
        "hook_overlay": data.get("hook_overlay", ""),
        "caption": data.get("caption", ""),
        "editor_notes": data.get("editor_notes", ""),
        "clips": clips,
        "total_seconds": round(sum(c["duration"] for c in clips), 1),
        "source_videos": len({c["video_id"] for c in clips}),
    }


def _tc(seconds: float, fps: int = 30) -> str:
    frames = int(round(seconds * fps))
    h, rem = divmod(frames, 3600 * fps)
    m, rem = divmod(rem, 60 * fps)
    s, f = divmod(rem, fps)
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"


def to_edl(title: str, clips: list[dict], fps: int = 30) -> str:
    """CMX3600 EDL — opens in Premiere Pro, DaVinci Resolve and Final Cut (via import)."""
    lines = [f"TITLE: {title[:60]}", "FCM: NON-DROP FRAME", ""]
    rec = 0.0
    for i, c in enumerate(clips, start=1):
        dur = c["end"] - c["start"]
        reel = f"V{i:03d}"
        lines.append(
            f"{i:03d}  {reel:<8} B     C        "
            f"{_tc(c['start'], fps)} {_tc(c['end'], fps)} {_tc(rec, fps)} {_tc(rec + dur, fps)}"
        )
        lines.append(f"* FROM CLIP NAME: {c['title'][:80]} [{c['video_id']}]")
        lines.append(f"* ROLE: {c.get('role', '').upper()} | SOURCE: https://youtu.be/{c['video_id']}")
        lines.append("")
        rec += dur
    return "\n".join(lines)


def to_shot_list(title: str, clips: list[dict], hook_overlay: str = "", caption: str = "") -> str:
    out = [f"# {title}", ""]
    if hook_overlay:
        out += [f"**On-screen hook:** {hook_overlay}", ""]
    rec = 0.0
    for i, c in enumerate(clips, start=1):
        dur = c["end"] - c["start"]
        out += [
            f"## {i}. {c.get('role', '').upper()} ({fmt_ts(rec)}–{fmt_ts(rec + dur)})",
            f"- Source: {c['title']} @ {fmt_ts(c['start'])}–{fmt_ts(c['end'])} — https://youtu.be/{c['video_id']}?t={int(c['start'])}",
            f"- Says: \"{c.get('text', '')}\"",
            "",
        ]
        rec += dur
    if caption:
        out += ["**Caption:** " + caption]
    return "\n".join(out)
