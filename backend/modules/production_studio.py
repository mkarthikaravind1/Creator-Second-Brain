"""Production Studio Module: Reel Script Builder, Thumbnail Ideator, Podcast Assistant, Pre-Production Studio."""

from ai.llm import chat_json
from modules.common import creator_tool, get_channel_context


@creator_tool("Reel Script Builder", "Production Studio")
def reel_script_builder(channel_id: str, idea_prompt: str, target_seconds: int = 45) -> dict:
    """Tool 5: Reel Script Builder - converts an idea into structured hook, body, and CTA for short-form video."""
    context = get_channel_context(channel_id, query=idea_prompt)
    system = f"""You are the Short-form Production Specialist in CreatorOS.
Transform the idea into a bulletproof {target_seconds}-second vertical video script (Reels/Shorts/TikTok).
Breakdown into 3 tight components:
1. Hook (0-5s): Visual cue, physical hook, first spoken sentence.
2. Body (5-35s): High-density value or story, fast-paced transitions.
3. CTA (35-45s): Conversational action prompt.

Output as JSON:
{{
  "target_duration_seconds": {target_seconds},
  "title": string,
  "hook": {{
    "spoken_line": string,
    "on_screen_text": string,
    "visual_direction": string
  }},
  "body_beats": [
    {{
      "timestamp_range": string,
      "spoken_line": string,
      "b_roll_visual": string
    }}
  ],
  "call_to_action": {{
    "spoken_line": string,
    "overlay_text": string
  }},
  "editing_notes": [string]
}}"""
    user = f"Idea / Topic: {idea_prompt}\nTarget Duration: {target_seconds}s\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Thumbnail Ideator", "Production Studio")
def thumbnail_ideator(channel_id: str, video_title: str) -> dict:
    """Tool 7: Thumbnail Ideator - turns a video title into high-CTR visual concepts and short text overlays."""
    context = get_channel_context(channel_id, query=video_title)
    system = """You are the Thumbnail Director in CreatorOS.
Generate 4 distinct, high-CTR YouTube thumbnail concepts for the video title.
Thumbnails should not repeat the title — they must create an irresistible curiosity gap when paired with the title.

Output as JSON:
{
  "video_title": string,
  "thumbnail_concepts": [
    {
      "concept_name": string,
      "foreground_element": string,
      "background_setting": string,
      "facial_expression": string,
      "text_overlay": string,
      "color_palette_contrast": string,
      "curiosity_trigger": string
    }
  ],
  "ab_test_recommendation": string
}"""
    user = f"Video Title: {video_title}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Podcast Assistant", "Production Studio")
def podcast_assistant(channel_id: str, transcript_or_topic: str) -> dict:
    """Tool 14: Podcast Assistant - generates episode title, description, timestamped chapters, and teaser quotes."""
    context = get_channel_context(channel_id, query=transcript_or_topic[:300])
    system = """You are the Podcast Production Assistant in CreatorOS.
Process the podcast episode content and output publishing metadata: 3 title options, rich show notes, key chapters/timestamps, and shareable highlights.

Output as JSON:
{
  "title_options": [string, string, string],
  "summary_paragraph": string,
  "chapters": [
    {"timestamp": string, "title": string}
  ],
  "viral_quotes": [string],
  "key_takeaways": [string]
}"""
    user = f"Episode Content / Transcript:\n{transcript_or_topic}\n\n{context}"
    return chat_json(system=system, user=user)


@creator_tool("Pre-production Studio", "Production Studio")
def video_preproduction_studio(channel_id: str, script_text: str) -> dict:
    """Tool 25: AI Video Pre-Production Studio - converts raw script into shot list, camera cues, props, and B-roll."""
    context = get_channel_context(channel_id, query=script_text[:300])
    system = """You are the Video Pre-Production Director in CreatorOS.
Convert the provided script into an executable, professional shoot plan with scenes, shot types, camera angles, props, audio cues, and B-roll checklist.

Output as JSON:
{
  "production_overview": string,
  "estimated_shoot_time": string,
  "required_props_gear": [string],
  "scene_breakdown": [
    {
      "scene_number": int,
      "script_excerpt": string,
      "shot_type": "Close-up (CU)" | "Medium (MS)" | "Wide (WS)" | "Overhead / Top-down" | "Screen Record",
      "camera_movement": "Static" | "Slow Push-in" | "Pan" | "Handheld Dynamic",
      "lighting_mood": string,
      "b_roll_requirement": string
    }
  ],
  "sound_effects_music": [string]
}"""
    user = f"Script:\n{script_text}\n\n{context}"
    return chat_json(system=system, user=user)
