"""Repurpose Engine Module: Content Repurposer, Content Recycler, Autonomous Content Pipeline."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Content Repurposer", "Repurpose Engine")
def repurpose_content(channel_id: str, input_content: str) -> dict:
    """Tool 2: Content Repurposer - converts one source piece into platform-native LinkedIn, Instagram, X, and YouTube Community posts."""
    context = get_channel_context(channel_id, query=input_content[:200])
    system = """You are the Master Repurposing Specialist in CreatorOS.
Transform one input idea or script into 4 platform-native content assets:
1. LinkedIn Post (story-driven, insight-dense, clean spacing)
2. X Thread / Long Tweet (punchy hook, 4-5 follow-up points, CTA)
3. Instagram Carousel / Caption (visual slide copy or carousel slide outline)
4. YouTube Community Post (discussion starter or poll question)

Output as JSON:
{
  "source_summary": string,
  "linkedin_post": string,
  "x_thread": [string],
  "instagram_carousel_slides": [
    {"slide_number": int, "slide_text": string}
  ],
  "youtube_community_post": string
}"""
    user = f"Source Content:\n{input_content}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Content Recycler", "Repurpose Engine")
def content_recycler(channel_id: str) -> dict:
    """Tool 16: Content Recycler - analyzes channel catalog to identify high-potential evergreen content to update and re-publish."""
    context = get_channel_context(channel_id, max_chunks=8)
    system = """You are the Content Recycler in CreatorOS.
Review the creator's video history and themes.
Identify 3 evergreen topics/videos that deserve to be recycled, updated, or flipped into a 2026 perspective.

Output as JSON:
{
  "recommendations": [
    {
      "original_angle_or_title": string,
      "why_recycle_now": string,
      "fresh_angle_2026": string,
      "new_format_recommendation": "Shorts Series" | "Remake with new tools" | "Case Study Breakdown"
    }
  ]
}"""
    user = f"Creator Catalog Context:\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Autonomous Content Pipeline", "Repurpose Engine")
def autonomous_content_pipeline(channel_id: str, core_idea: str) -> dict:
    """Tool 21: Autonomous Content Pipeline - end-to-end transformation of 1 idea into a full publishing kit."""
    context = get_channel_context(channel_id, query=core_idea)
    system = """You are the Autonomous Pipeline Architect in CreatorOS.
Take 1 core concept and execute the entire multi-stage content pipeline autonomously:
Phase 1: Research summary & contrarian hook
Phase 2: Full YouTube 3-5 minute script outline
Phase 3: 3 distinct Reel/Short concepts with hooks
Phase 4: LinkedIn post & X thread
Phase 5: Publishing schedule across Monday-Sunday

Output as JSON:
{
  "core_idea": string,
  "phase_1_research": {
    "key_stat_or_premise": string,
    "unique_angle": string
  },
  "phase_2_youtube_outline": {
    "title": string,
    "hook": string,
    "sections": [string, string, string],
    "outro_cta": string
  },
  "phase_3_reels": [
    {"reel_number": 1, "hook": string, "core_point": string},
    {"reel_number": 2, "hook": string, "core_point": string},
    {"reel_number": 3, "hook": string, "core_point": string}
  ],
  "phase_4_social": {
    "linkedin_post": string,
    "x_thread_tweets": [string, string, string]
  },
  "phase_5_publishing_calendar": [
    {"day": "Day 1", "platform": "YouTube", "item": string},
    {"day": "Day 2", "platform": "LinkedIn & X", "item": string},
    {"day": "Day 3", "platform": "Reel 1", "item": string},
    {"day": "Day 5", "platform": "Reel 2", "item": string}
  ]
}"""
    user = f"Core Idea: {core_idea}\n\n{context}"
    return chat_json(system=system, user=user)
