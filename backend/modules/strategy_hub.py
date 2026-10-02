"""Strategy Hub Module: Daily Content Planner, AI Creative Producer (30-day strategy & pillars)."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Daily Content Planner", "Strategy Hub")
def daily_content_planner(channel_id: str, niche: str, primary_goal: str = "Audience Growth") -> dict:
    """Tool 4: Daily Content Planner - generates an actionable schedule of what to create and post today."""
    context = get_channel_context(channel_id, query=f"{niche} {primary_goal}")
    system = """You are the Daily Content Strategist in CreatorOS.
Generate today's complete, realistic creator action plan based on their niche, goal, and past output.
Specify exact tasks: 1 fast short-form post, 1 community engagement action, and 1 long-term asset draft.

Output as JSON:
{
  "date_focus": string,
  "daily_theme": string,
  "primary_action_item": {
    "format": string,
    "topic": string,
    "suggested_hook": string,
    "estimated_time_minutes": int
  },
  "secondary_micro_action": {
    "action": string,
    "platform": string,
    "prompt": string
  },
  "community_prompt_for_today": string
}"""
    user = f"Niche: {niche}\nPrimary Goal: {primary_goal}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("AI Creative Producer", "Strategy Hub")
def ai_creative_producer(channel_id: str, goal: str, target_audience: str = "") -> dict:
    """Tool 22: AI Creative Producer - builds comprehensive 30-day strategy, 3-4 content pillars, and schedule."""
    context = get_channel_context(channel_id, query=goal, max_chunks=8)
    system = """You are the Executive Creative Producer in CreatorOS.
Develop an overarching strategic roadmap for the creator.
Define 3-4 core content pillars, audience psychographics, weekly rhythms, and a 4-week calendar overview.

Output as JSON:
{
  "creator_goal": string,
  "audience_profile": {
    "primary_problem": string,
    "what_they_crave": string,
    "objections": [string]
  },
  "content_pillars": [
    {
      "pillar_name": string,
      "purpose": string,
      "example_topics": [string, string]
    }
  ],
  "weekly_cadence_recommendation": string,
  "four_week_milestones": [
    {"week": 1, "focus": string, "key_deliverable": string},
    {"week": 2, "focus": string, "key_deliverable": string},
    {"week": 3, "focus": string, "key_deliverable": string},
    {"week": 4, "focus": string, "key_deliverable": string}
  ]
}"""
    user = f"Goal: {goal}\nAudience Notes: {target_audience}\n\n{context}"
    return chat_json(system=system, user=user)
