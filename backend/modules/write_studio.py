"""Write Studio Module: Hook Generator, Caption Assistant, CTA Generator, Voice Replicator, Screenplay Workspace."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Hook Generator", "Write Studio")
def generate_hooks(channel_id: str, topic: str, style_preference: str = "High Curiosity") -> dict:
    """Tool 3: Hook Generator - generates 10 powerful hooks across diverse psychological styles."""
    context = get_channel_context(channel_id, query=topic)
    system = """You are the Hook Specialist for CreatorOS.
Generate 10 distinct, scroll-stopping hooks for the video/post topic.
Cover various proven creator archetypes:
1. Negative Contradiction ("Stop doing X...")
2. The Secret / Curiosity Gap ("The 1 thing nobody told you...")
3. Bold Claim ("I spent 30 days testing...")
4. Story Starter ("Last week, everything broke...")
5. Direct Callout ("If you are an engineer trying to...")
6. Comparison / Analogy
7. Question with high stakes
8. Contrarian Truth
9. Quick Stat Shock
10. The Transformation / Roadmap

Output as JSON:
{
  "topic": string,
  "hooks": [
    {
      "style": string,
      "hook_text": string,
      "why_it_works": string,
      "visual_action_recommendation": string
    }
  ]
}"""
    user = f"Topic: {topic}\nPreferred Focus: {style_preference}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Caption Assistant", "Write Studio")
def generate_caption(channel_id: str, content_summary: str, platform: str = "Instagram") -> dict:
    """Tool 8: Caption Assistant - turns video/post ideas into platform-ready captions with formatting & tags."""
    context = get_channel_context(channel_id, query=content_summary)
    system = f"""You are the Caption Assistant in CreatorOS.
Write a platform-optimized caption for {platform} matching the creator's voice and formatting conventions.
Include a sticky opening line, easy-to-read line breaks, key bullet points/takeaways, a soft CTA, and targeted hashtags.

Output as JSON:
{{
  "platform": "{platform}",
  "headline": string,
  "caption_body": string,
  "call_to_action": string,
  "hashtags": [string]
}}"""
    user = f"Content Summary:\n{content_summary}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("CTA Generator", "Write Studio")
def generate_ctas(channel_id: str, goal: str, platform: str = "YouTube") -> dict:
    """Tool 9: CTA Generator - creates natural, non-repetitive calls to action based on creator goals."""
    context = get_channel_context(channel_id, query=goal)
    system = f"""You are the CTA (Call To Action) Architect in CreatorOS.
Create 5 non-cringe, high-conversion CTAs tailored for {platform} and the creator's specific goal (e.g. newsletter signups, comments, community join, product sales, saves/shares).

Output as JSON:
{{
  "goal": string,
  "platform": string,
  "ctas": [
    {{
      "type": "Casual / Friendly" | "Direct Value Exchange" | "Curiosity / Next Step" | "Community-Centric" | "Urgent / Direct",
      "script_line": string,
      "on_screen_graphic": string,
      "placement_timing": "Mid-roll" | "Climax" | "Outro"
    }}
  ]
}}"""
    user = f"Creator Goal: {goal}\nPlatform: {platform}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Voice Replicator", "Write Studio")
def voice_replicator(channel_id: str, new_topic: str, output_format: str = "Script Draft") -> dict:
    """Tool 13: Voice Replicator - mimics the creator's vocabulary, pacing, tone, and rhetorical habits."""
    context = get_channel_context(channel_id, query=new_topic, max_chunks=8)
    system = """You are the Voice Replicator in CreatorOS.
Analyze the creator's transcript excerpts (vocabulary, pacing, humor, filler habits, transitions) and author a new original draft strictly adhering to their authentic voice.

Output as JSON:
{
  "analyzed_voice_traits": {
    "tone": string,
    "pacing": string,
    "signature_habits": [string]
  },
  "replicated_draft": string,
  "delivery_tips_for_creator": [string]
}"""
    user = f"Topic: {new_topic}\nRequested Format: {output_format}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Screenplay Workspace", "Write Studio")
def screenplay_workspace(channel_id: str, scene_prompt: str, character_notes: str = "") -> dict:
    """Tool 20: AI Screenplay Workspace - continuity-aware narrative, scene progression, and dialogue builder."""
    context = get_channel_context(channel_id, query=scene_prompt)
    system = """You are the Screenplay Workspace Agent in CreatorOS.
Assist in writing cinematic scene dialogue and action progression while maintaining scene pacing, character beats, and spatial directions.

Output as JSON:
{
  "scene_heading": string,
  "setting_description": string,
  "characters_present": [string],
  "script_lines": [
    {
      "speaker": string,
      "parenthetical": string,
      "dialogue": string
    }
  ],
  "action_beat": string,
  "scene_transition": string
}"""
    user = f"Scene Prompt: {scene_prompt}\nCharacter/Cast Context: {character_notes}\n\n{context}"
    return chat_json(system=system, user=user)
