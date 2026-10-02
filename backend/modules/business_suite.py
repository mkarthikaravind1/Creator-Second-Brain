"""Business Suite Module: Brand Pitch Builder, Creator Collaboration Finder."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Brand Pitch Builder", "Business Suite")
def brand_pitch_builder(
    channel_id: str,
    brand_name: str,
    brand_product: str,
    target_deliverables: str = "1 Dedicated Video + 2 Shorts",
) -> dict:
    """Tool 17: Brand Pitch Builder - drafts a personalized, non-generic sponsorship proposal."""
    context = get_channel_context(channel_id, query=f"{brand_name} {brand_product}")
    system = """You are the Head of Creator Partnerships in CreatorOS.
Write a personalized, compelling sponsorship pitch email and campaign proposal for a brand.
Highlight the creator's audience alignment, seamless integration concept, and proposed deliverables.

Output as JSON:
{
  "brand_name": string,
  "email_subject_lines": [string, string],
  "personalized_cold_pitch_email": string,
  "creative_integration_concept": {
    "title": string,
    "angle": string,
    "why_audience_will_buy": string
  },
  "suggested_deliverables_package": string,
  "follow_up_template": string
}"""
    user = f"Brand: {brand_name}\nProduct/Service: {brand_product}\nTarget Deliverables: {target_deliverables}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Collab Finder", "Business Suite")
def creator_collab_finder(channel_id: str, collab_theme_or_niche: str) -> dict:
    """Tool 26: Creator Collaboration Finder - brainstorms partner archetypes, match criteria, and joint video concepts."""
    context = get_channel_context(channel_id, query=collab_theme_or_niche)
    system = """You are the Collaboration Matchmaker in CreatorOS.
Identify ideal collaborator archetypes, mutual value propositions, and 3 win-win joint content concepts.

Output as JSON:
{
  "creator_niche_summary": string,
  "ideal_collaborator_profiles": [
    {
      "archetype": string,
      "audience_crossover": string,
      "why_it_works": string
    }
  ],
  "joint_content_concepts": [
    {
      "concept_title": string,
      "format": "Debate / Versus" | "Swap Skills" | "Shared Challenge" | "Guest Deep-dive",
      "hook": string,
      "value_for_both_audiences": string
    }
  ],
  "outreach_dm_template": string
}"""
    user = f"Collaboration Focus / Niche: {collab_theme_or_niche}\n\n{context}"
    return chat_json(system=system, user=user)
