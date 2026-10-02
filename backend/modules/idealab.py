"""IdeaLab Module: Content Idea Generator, Trend-to-Content, Research Assistant, Comment-to-Content."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Content Idea Generator", "IdeaLab")
def generate_content_ideas(channel_id: str, topic: str, target_audience: str = "General") -> dict:
    """Tool 1: Content Idea Generator - generates 10 tailored content ideas based on topic, audience, and creator history."""
    context = get_channel_context(channel_id, query=topic)
    system = f"""You are the IdeaLab Agent for CreatorOS.
Generate exactly 10 high-impact, engaging content ideas for the given topic and target audience.
Use the Creator's Brain context to suggest fresh angles that complement what they have previously produced without directly duplicating past work.

Format output as a JSON object:
{{
  "topic": string,
  "audience": string,
  "ideas": [
    {{
      "title": string,
      "format": "YouTube Longform" | "Short / Reel" | "Carousel" | "Deep-dive",
      "hook_angle": string,
      "why_it_works": string,
      "connection_to_past": string
    }}
  ]
}}"""
    user = f"Topic: {topic}\nTarget Audience: {target_audience}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Trend-to-Content", "IdeaLab")
def trend_to_content(channel_id: str, trend_topic: str, preferred_format: str = "Reel / Short") -> dict:
    """Tool 23: Trend-to-Content Engine - takes a current trend or viral topic and adapts it to creator niche."""
    context = get_channel_context(channel_id, query=trend_topic)
    system = f"""You are the Trend-to-Content Specialist in CreatorOS.
Analyze a viral trend or emerging topic, identify a creator-specific unique angle grounded in their niche/voice, and construct a complete production starter.

Output as JSON:
{{
  "trend": string,
  "creator_angle": string,
  "why_relevant": string,
  "suggested_hook": string,
  "outline_points": [string, string, string],
  "content_format": string,
  "call_to_action": string
}}"""
    user = f"Trend / Topic: {trend_topic}\nPreferred Format: {preferred_format}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Research Assistant", "IdeaLab")
def research_topic(channel_id: str, topic: str) -> dict:
    """Tool 12: Creator Research Assistant - provides key facts, counter-intuitive angles, and verified perspectives."""
    context = get_channel_context(channel_id, query=topic)
    system = """You are the Creator Research Assistant in CreatorOS.
Conduct comprehensive research on the requested topic for an educational or storytelling video/post.
Provide facts, statistics, historical/case-study context, common myths to debunk, and unique framing angles.

Output as JSON:
{{
  "topic": string,
  "core_premise": string,
  "key_facts": [
    {{"fact": string, "source_context": string}}
  ],
  "contrarian_angles": [string],
  "common_misconceptions": [string],
  "recommended_story_arc": string
}}"""
    user = f"Topic: {topic}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Comment-to-Content", "IdeaLab")
def comment_to_content(channel_id: str, comments_text: str) -> dict:
    """Tool 11: Comment-to-Content - converts audience questions, feedback, and comments into future content ideas."""
    context = get_channel_context(channel_id, query=comments_text[:300])
    system = """You are the Comment-to-Content Agent in CreatorOS.
Analyze the provided viewer/audience comments and identify actionable content ideas, addressing unserved audience questions or objections.

Output as JSON:
{{
  "analyzed_comment_count": int,
  "extracted_themes": [string],
  "content_opportunities": [
    {{
      "inspiration_comment": string,
      "proposed_title": string,
      "format": "Short / Reel" | "Full Video" | "Community Post",
      "hook": string,
      "key_takeaway": string
    }}
  ]
}}"""
    user = f"Viewer Comments:\n{comments_text}\n\n{context}"
    return chat_json(system=system, user=user)
