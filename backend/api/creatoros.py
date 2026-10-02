"""CreatorOS API Router: Unified endpoints across all 8 modules."""

import inspect

from fastapi import APIRouter, HTTPException
from langsmith import traceable
from pydantic import BaseModel, Field

from config import settings

from modules import (
    idealab,
    write_studio,
    production_studio,
    strategy_hub,
    repurpose_engine,
    audience_intel,
    business_suite,
)

router = APIRouter(prefix="/api/creatoros", tags=["CreatorOS"])


# the trace shows the tool id and its named inputs, not the function object
@traceable(name="CreatorOS Request", run_type="chain", process_inputs=lambda i: {"tool_id": i["tool_id"], **i["inputs"]})
def _request(tool_id: str, inputs: dict, tool) -> dict:
    return tool(**inputs)


def _run(tool, *args) -> dict:
    """One LangSmith trace per CreatorOS call: the tool, its grounding search and the Gemini call nest inside,
    and every run in the trace carries which tool and model produced it."""
    tool_id = tool.__name__.replace("_", "-")
    inputs = dict(inspect.signature(tool).bind(*args).arguments)  # named inputs in the trace
    metadata = {
        "tool_id": tool_id,
        "tool_name": tool.tool_name,
        "module": tool.module_label,
        "channel_id": inputs.get("channel_id"),
        "model": settings.llm_model,
        "provider": "gemini",
    }
    return _request(
        tool_id,
        inputs,
        tool,
        langsmith_extra={"metadata": metadata, "tags": ["creatoros", tool.module_label]},
    )


# --- Schemas ---
class TopicAudienceReq(BaseModel):
    topic: str
    audience: str = "General"


class TrendReq(BaseModel):
    trend: str
    format: str = "Reel / Short"


class TextPromptReq(BaseModel):
    prompt: str


class HookReq(BaseModel):
    topic: str
    style: str = "High Curiosity"


class CaptionReq(BaseModel):
    content_summary: str
    platform: str = "Instagram"


class CTAReq(BaseModel):
    goal: str
    platform: str = "YouTube"


class ScreenplayReq(BaseModel):
    scene_prompt: str
    character_notes: str = ""


class ReelScriptReq(BaseModel):
    idea: str
    target_seconds: int = 45


class ThumbnailReq(BaseModel):
    video_title: str


class DailyPlanReq(BaseModel):
    niche: str
    goal: str = "Audience Growth"


class ProducerReq(BaseModel):
    goal: str
    audience_notes: str = ""


class PitchReq(BaseModel):
    brand_name: str
    product_description: str
    deliverables: str = "1 Dedicated Video + 2 Shorts"


class CollabReq(BaseModel):
    theme_or_niche: str


# --- IdeaLab Endpoints ---
@router.post("/{channel_id}/idealab/ideas")
def get_ideas(channel_id: str, req: TopicAudienceReq):
    return _run(idealab.generate_content_ideas, channel_id, req.topic, req.audience)


@router.post("/{channel_id}/idealab/trend")
def get_trend_angle(channel_id: str, req: TrendReq):
    return _run(idealab.trend_to_content, channel_id, req.trend, req.format)


@router.post("/{channel_id}/idealab/research")
def get_research(channel_id: str, req: TextPromptReq):
    return _run(idealab.research_topic, channel_id, req.prompt)


@router.post("/{channel_id}/idealab/comments-to-content")
def get_comment_ideas(channel_id: str, req: TextPromptReq):
    return _run(idealab.comment_to_content, channel_id, req.prompt)


# --- Write Studio Endpoints ---
@router.post("/{channel_id}/write/hooks")
def get_hooks(channel_id: str, req: HookReq):
    return _run(write_studio.generate_hooks, channel_id, req.topic, req.style)


@router.post("/{channel_id}/write/caption")
def get_caption(channel_id: str, req: CaptionReq):
    return _run(write_studio.generate_caption, channel_id, req.content_summary, req.platform)


@router.post("/{channel_id}/write/ctas")
def get_ctas(channel_id: str, req: CTAReq):
    return _run(write_studio.generate_ctas, channel_id, req.goal, req.platform)


@router.post("/{channel_id}/write/voice-draft")
def get_voice_draft(channel_id: str, req: TextPromptReq):
    return _run(write_studio.voice_replicator, channel_id, req.prompt)


@router.post("/{channel_id}/write/screenplay")
def get_screenplay(channel_id: str, req: ScreenplayReq):
    return _run(write_studio.screenplay_workspace, channel_id, req.scene_prompt, req.character_notes)


# --- Production Studio Endpoints ---
@router.post("/{channel_id}/production/reel-script")
def get_reel_script(channel_id: str, req: ReelScriptReq):
    return _run(production_studio.reel_script_builder, channel_id, req.idea, req.target_seconds)


@router.post("/{channel_id}/production/thumbnail")
def get_thumbnails(channel_id: str, req: ThumbnailReq):
    return _run(production_studio.thumbnail_ideator, channel_id, req.video_title)


@router.post("/{channel_id}/production/podcast")
def get_podcast_notes(channel_id: str, req: TextPromptReq):
    return _run(production_studio.podcast_assistant, channel_id, req.prompt)


@router.post("/{channel_id}/production/preproduction")
def get_preproduction(channel_id: str, req: TextPromptReq):
    return _run(production_studio.video_preproduction_studio, channel_id, req.prompt)


# --- Strategy Hub Endpoints ---
@router.post("/{channel_id}/strategy/daily-plan")
def get_daily_plan(channel_id: str, req: DailyPlanReq):
    return _run(strategy_hub.daily_content_planner, channel_id, req.niche, req.goal)


@router.post("/{channel_id}/strategy/producer")
def get_creative_roadmap(channel_id: str, req: ProducerReq):
    return _run(strategy_hub.ai_creative_producer, channel_id, req.goal, req.audience_notes)


# --- Repurpose Engine Endpoints ---
@router.post("/{channel_id}/repurpose/transform")
def get_repurposed(channel_id: str, req: TextPromptReq):
    return _run(repurpose_engine.repurpose_content, channel_id, req.prompt)


@router.post("/{channel_id}/repurpose/recycle")
def get_recycled(channel_id: str):
    return _run(repurpose_engine.content_recycler, channel_id)


@router.post("/{channel_id}/repurpose/pipeline")
def get_pipeline(channel_id: str, req: TextPromptReq):
    return _run(repurpose_engine.autonomous_content_pipeline, channel_id, req.prompt)


# --- Audience Intelligence Endpoints ---
@router.post("/{channel_id}/audience/comments")
def get_comment_analysis(channel_id: str, req: TextPromptReq):
    return _run(audience_intel.analyze_comments, channel_id, req.prompt)


@router.post("/{channel_id}/audience/analytics")
def get_analytics_copilot(channel_id: str, req: TextPromptReq):
    return _run(audience_intel.analytics_copilot, channel_id, req.prompt)


# --- Business Suite Endpoints ---
@router.post("/{channel_id}/business/pitch")
def get_pitch(channel_id: str, req: PitchReq):
    return _run(
        business_suite.brand_pitch_builder,
        channel_id, req.brand_name, req.product_description, req.deliverables
    )


@router.post("/{channel_id}/business/collabs")
def get_collabs(channel_id: str, req: CollabReq):
    return _run(business_suite.creator_collab_finder, channel_id, req.theme_or_niche)
