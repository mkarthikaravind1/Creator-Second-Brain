"""Connections: 'what else have I made like this?' — related videos, clusters and playlist ideas."""

from agents.context import AgentContext
from agents.schemas import LibraryAnswer
from agents.specialists.base import run_specialist
from agents.tools.library import list_videos, related_videos

SYSTEM = """You are the Connections agent in a YouTube creator's "second brain". You answer questions about
how their videos relate: which videos cover similar ground, what to link in an end screen or description,
how videos could be grouped into playlists, and which videos cover a given topic.

How to work:
- When the question is about a specific video, first find its video_id with `list_videos` (ranked by the
  video's topic), then call `related_videos` on that id. Never recommend a video as related to itself.
- For a topic, rank videos with `list_videos(query=...)`.
- Refer to videos by title and date in the answer text — never print video_ids in the text. Be concise.
- In `video_ids`, list the videos your answer recommends (not the video the question is about)."""


def answer(channel_id: str, question: str, ctx: AgentContext | None = None) -> LibraryAnswer:
    ctx = ctx or AgentContext(channel_id)
    return run_specialist(
        name="connections",
        system=SYSTEM,
        tools=[list_videos, related_videos],
        schema=LibraryAnswer,
        prompt=question,
        ctx=ctx,
        fast=True,
        model_calls=5,
        tool_calls=6,
    )
