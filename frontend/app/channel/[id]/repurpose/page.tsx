"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Repeat, RotateCw, PlaySquare, Layers, Copy, Check } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "repurpose" | "recycle" | "pipeline";

export default function RepurposeEnginePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("repurpose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form states
  const [sourceContent, setSourceContent] = useState("");
  const [pipelineIdea, setPipelineIdea] = useState("");

  // Results
  const [repurposeResult, setRepurposeResult] = useState<any>(null);
  const [recycleResult, setRecycleResult] = useState<any>(null);
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const runRepurpose = async () => {
    if (!sourceContent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/repurpose/transform`, {
        prompt: sourceContent,
      });
      setRepurposeResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to repurpose content");
    } finally {
      setLoading(false);
    }
  };

  const runRecycle = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/repurpose/recycle`);
      setRecycleResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to scan catalog for recyclable content");
    } finally {
      setLoading(false);
    }
  };

  const runPipeline = async () => {
    if (!pipelineIdea.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/repurpose/pipeline`, {
        prompt: pipelineIdea,
      });
      setPipelineResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to run autonomous pipeline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Repeat className="size-6 text-emerald-500" /> Repurpose Engine
          </h1>
          <p className="text-sm text-muted">
            Multiply 1 input across all platforms, recycle top evergreen catalog videos, and run autonomous pipelines.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab("repurpose")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "repurpose" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Repeat className="size-3.5" /> 1-to-All Repurposer
          </button>
          <button
            onClick={() => setActiveTab("recycle")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "recycle" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <RotateCw className="size-3.5" /> Catalog Recycler
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "pipeline" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Layers className="size-3.5" /> Autonomous Pipeline
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab: 1-to-All Repurposer */}
      {activeTab === "repurpose" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Repeat className="size-4 text-emerald-500" /> Input Source Content
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Video Script, Notes, or Article</label>
                <textarea
                  rows={6}
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  placeholder="Paste your source script or transcript excerpt..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runRepurpose} loading={loading} className="w-full">
                Repurpose Everywhere
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Distilling into LinkedIn, X Thread, Carousel slides, and YouTube post..." />}
            {repurposeResult && (
              <div className="space-y-4">
                {/* LinkedIn */}
                <Card className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge tone="accent">LinkedIn Post</Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(repurposeResult.linkedin_post, 1)}>
                      {copiedIndex === 1 ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                  <div className="p-3 bg-surface-2 rounded border border-line text-xs whitespace-pre-wrap leading-relaxed text-ink">
                    {repurposeResult.linkedin_post}
                  </div>
                </Card>

                {/* X Thread */}
                <Card className="p-4 space-y-2">
                  <Badge tone="accent">X / Twitter Thread</Badge>
                  <div className="space-y-2">
                    {repurposeResult.x_thread?.map((tweet: string, i: number) => (
                      <div key={i} className="p-2.5 bg-surface-2 rounded border border-line text-xs flex gap-2 text-ink">
                        <span className="font-mono text-muted">{i + 1}/</span>
                        <span>{tweet}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Instagram Carousel */}
                <Card className="p-4 space-y-2">
                  <Badge tone="good">Instagram Carousel Slides</Badge>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {repurposeResult.instagram_carousel_slides?.map((slide: any, i: number) => (
                      <div key={i} className="p-2.5 bg-surface-2 rounded border border-line space-y-1">
                        <span className="font-bold text-accent">Slide {slide.slide_number}</span>
                        <p className="text-ink">{slide.slide_text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
            {!loading && !repurposeResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Paste any source content on the left to transform it for all social platforms.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Catalog Recycler */}
      {activeTab === "recycle" && (
        <div className="space-y-4">
          <Card className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-base text-ink">Scan Catalog For Evergreen Reposts</h2>
              <p className="text-xs text-muted">
                Creator Brain inspects your historical videos to find evergreen topics worth updating for 2026.
              </p>
            </div>
            <Button onClick={runRecycle} loading={loading}>
              Scan Channel Catalog
            </Button>
          </Card>

          {loading && <Spinner label="Analyzing past videos against current trends..." />}
          <div className="grid sm:grid-cols-3 gap-4">
            {recycleResult?.recommendations?.map((rec: any, i: number) => (
              <Card key={i} className="p-4 space-y-3">
                <Badge tone="good">{rec.new_format_recommendation}</Badge>
                <h3 className="font-bold text-base text-ink">{rec.original_angle_or_title}</h3>
                <p className="text-xs text-muted"><span className="font-semibold text-ink">Why now: </span>{rec.why_recycle_now}</p>
                <div className="p-2.5 bg-accent-soft border border-violet-500/20 rounded text-xs text-ink">
                  <span className="font-bold text-violet-700 block mb-0.5">2026 Angle:</span>
                  {rec.fresh_angle_2026}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Autonomous Content Pipeline */}
      {activeTab === "pipeline" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Layers className="size-4 text-purple-500" /> Autonomous Pipeline
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">One Core Idea</label>
                <textarea
                  rows={4}
                  value={pipelineIdea}
                  onChange={(e) => setPipelineIdea(e.target.value)}
                  placeholder="e.g. Why local-first software is replacing cloud apps"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runPipeline} loading={loading} className="w-full">
                Run 5-Stage Pipeline
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Executing Idea → Research → YouTube → 3 Reels → Socials → Calendar..." />}
            {pipelineResult && (
              <Card className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-ink">{pipelineResult.core_idea}</h3>
                  <Badge tone="accent">5-Stage Pipeline Executed</Badge>
                </div>

                {/* Stage 1 & 2 */}
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-surface-2 rounded-lg border border-line space-y-1">
                    <span className="font-bold text-ink">Phase 1: Research</span>
                    <p className="text-muted">{pipelineResult.phase_1_research?.key_stat_or_premise}</p>
                    <p className="text-ink font-medium">Angle: {pipelineResult.phase_1_research?.unique_angle}</p>
                  </div>
                  <div className="p-3 bg-surface-2 rounded-lg border border-line space-y-1">
                    <span className="font-bold text-ink">Phase 2: YouTube Longform</span>
                    <p className="font-semibold text-accent">{pipelineResult.phase_2_youtube_outline?.title}</p>
                    <p className="text-muted italic">"{pipelineResult.phase_2_youtube_outline?.hook}"</p>
                  </div>
                </div>

                {/* Stage 3: 3 Reels */}
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-ink block">Phase 3: 3 Derivative Reels</span>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {pipelineResult.phase_3_reels?.map((r: any, i: number) => (
                      <div key={i} className="p-2.5 bg-surface-2 rounded border border-line space-y-1">
                        <span className="font-semibold text-rose-500">Reel {r.reel_number}</span>
                        <p className="text-ink font-medium">"{r.hook}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stage 5: Calendar */}
                <div className="pt-2 border-t border-line space-y-1 text-xs">
                  <span className="font-bold text-ink block">Phase 5: Publishing Schedule</span>
                  <div className="grid sm:grid-cols-4 gap-2">
                    {pipelineResult.phase_5_publishing_calendar?.map((c: any, i: number) => (
                      <div key={i} className="p-2 bg-surface-2 rounded border border-line">
                        <span className="font-bold text-accent block">{c.day} · {c.platform}</span>
                        <span className="text-muted">{c.item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            {!loading && !pipelineResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter an idea to trigger the entire autonomous production pipeline.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
