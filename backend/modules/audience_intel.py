"""Audience Intelligence Module: Comment Analyzer (themes, questions, complaints), Analytics Copilot."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Comment Analyzer", "Audience Intel")
def analyze_comments(channel_id: str, raw_comments: str) -> dict:
    """Tool 10: Comment Analyzer - categorizes comments into recurring themes, questions, confusion points, and opportunities."""
    context = get_channel_context(channel_id, query=raw_comments[:200])
    system = """You are the Audience Intelligence Analyst in CreatorOS.
Thoroughly analyze viewer comments and synthesize audience mindset.
Categorize findings into:
1. Recurring praise & what resonated
2. Top questions / confusion points (potential future videos)
3. Constructive complaints / objections
4. Untapped creator opportunities

Output as JSON:
{
  "total_comments_analyzed_approx": int,
  "overall_sentiment": "Overwhelmingly Positive" | "Mixed / Debating" | "Constructive",
  "key_themes": [string],
  "top_questions_asked": [string],
  "audience_objections": [string],
  "immediate_action_recommendation": string
}"""
    user = f"Comments to Analyze:\n{raw_comments}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Analytics Copilot", "Audience Intel")
def analytics_copilot(channel_id: str, metrics_summary: str) -> dict:
    """Tool 24: Creator Analytics Copilot - turns numbers/retention data into explanations and strategic decisions."""
    context = get_channel_context(channel_id, query=metrics_summary[:200])
    system = """You are the Creator Analytics Copilot in CreatorOS.
Analyze performance metrics (views, retention spikes/dips, CTR, watch time, shares).
Explain WHY certain content worked or underperformed, and deliver 3 high-probability next moves.

Output as JSON:
{
  "performance_diagnosis": string,
  "retention_or_ctr_insights": string,
  "what_to_double_down_on": [string],
  "what_to_stop_doing": [string],
  "next_recommended_video_concept": {
    "title": string,
    "why_high_probability": string
  }
}"""
    user = f"Analytics Data & Metrics:\n{metrics_summary}\n\n{context}"
    return chat_json(system=system, user=user)
