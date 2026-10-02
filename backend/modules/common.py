"""Shared utilities for CreatorOS modules: grounding via Creator Brain vector search & Gemini LLM calls."""

import logging
from sqlalchemy import select
from langsmith import traceable
from db import SessionLocal
from models import Channel, Video
from search.embeddings import embed_query
from search.vector import search_chunks
from ai.llm import chat_json

log = logging.getLogger("creatoros.modules")


def creator_tool(name: str, module: str):
    """Trace a CreatorOS tool as its own named step and label it for the request-level trace."""

    def wrap(fn):
        traced = traceable(name=name, run_type="tool", metadata={"module": module})(fn)
        traced.tool_name, traced.module_label = name, module
        return traced

    return wrap


@traceable(name="Creator Brain context")
def get_channel_context(channel_id: str, query: str | None = None, max_chunks: int = 5) -> str:
    """Retrieve creator background and relevant past transcript chunks as grounding context."""
    channel_title = "Creator"
    titles_summary = "General creator content"
    relevant_chunks_text = ""

    try:
        with SessionLocal() as session:
            channel = session.scalar(select(Channel).where(Channel.id == channel_id))
            if channel and channel.title:
                channel_title = channel.title

            # Recent videos for style and topical context
            recent_videos = session.scalars(
                select(Video)
                .where(Video.channel_id == channel_id)
                .order_by(Video.published_at.desc())
                .limit(10)
            ).all()
            if recent_videos:
                titles_summary = ", ".join(f'"{v.title}"' for v in recent_videos if v.title) or titles_summary

            if query:
                try:
                    q_vec = embed_query(query)
                    matches = search_chunks(session, channel_id, q_vec, limit=max_chunks)
                    if matches:
                        relevant_chunks_text = "\n".join(
                            f"- From '{v.title}': {c.text}" for c, v, _ in matches
                        )
                except Exception as e:
                    log.warning(f"Vector search skipped: {e}")
    except Exception as e:
        log.info(f"Database offline or channel not found, using direct context ({e})")

    context = f"Creator Channel: {channel_title}\nRecent Topics/Videos: {titles_summary}\n"
    if relevant_chunks_text:
        context += f"\nRelevant Past Knowledge & Style Excerpts from Creator's Brain:\n{relevant_chunks_text}\n"
    return context
