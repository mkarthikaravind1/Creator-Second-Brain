"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Clapperboard, Image as ImageIcon, Camera, Mic, Copy, Check } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "reel" | "thumbnail" | "preprod" | "podcast";

export default function ProductionStudioPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("reel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form states
  const [reelIdea, setReelIdea] = useState("");
  const [reelSeconds, setReelSeconds] = useState(45);
  const [videoTitle, setVideoTitle] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [podcastText, setPodcastText] = useState("");

  // Results
  const [reelResult, setReelResult] = useState<any>(null);
  const [thumbResult, setThumbResult] = useState<any>(null);
  const [preprodResult, setPreprodResult] = useState<any>(null);
  const [podcastResult, setPodcastResult] = useState<any>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const runReel = async () => {
    if (!reelIdea.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/production/reel-script`, {
        idea: reelIdea,
        target_seconds: reelSeconds,
      });
      setReelResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate reel script");
    } finally {
      setLoading(false);
    }
  };

  const runThumbnails = async () => {
    if (!videoTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/production/thumbnail`, {
        video_title: videoTitle,
      });
      setThumbResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate thumbnail concepts");
    } finally {
      setLoading(false);
    }
  };

  const runPreproduction = async () => {
    if (!scriptText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/production/preproduction`, {
        prompt: scriptText,
      });
      setPreprodResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to build pre-production package");
    } finally {
      setLoading(false);
    }
  };

  const runPodcast = async () => {
    if (!podcastText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/production/podcast`, {
        prompt: podcastText,
      });
      setPodcastResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to process podcast notes");
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
            <Clapperboard className="size-6 text-rose-500" /> Production Studio
          </h1>
          <p className="text-sm text-muted">
            From raw idea to shoot-ready: 45s Reel scripts, shot lists, thumbnail concepts, and podcast notes.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line flex-wrap">
          <button
            onClick={() => setActiveTab("reel")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "reel" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Clapperboard className="size-3.5" /> Reel Script
          </button>
          <button
            onClick={() => setActiveTab("thumbnail")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "thumbnail" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <ImageIcon className="size-3.5" /> Thumbnails
          </button>
          <button
            onClick={() => setActiveTab("preprod")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "preprod" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Camera className="size-3.5" /> Shoot Plan / B-Roll
          </button>
          <button
            onClick={() => setActiveTab("podcast")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "podcast" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Mic className="size-3.5" /> Podcast Assistant
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab: Reel Script Builder */}
      {activeTab === "reel" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Clapperboard className="size-4 text-rose-500" /> 30-60s Reel Builder
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Core Reel Concept</label>
                <textarea
                  rows={3}
                  value={reelIdea}
                  onChange={(e) => setReelIdea(e.target.value)}
                  placeholder="e.g. 3 VS Code shortcuts that save 2 hours every week"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Duration</label>
                <select
                  value={reelSeconds}
                  onChange={(e) => setReelSeconds(Number(e.target.value))}
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                >
                  <option value={30}>30 Seconds (Fast Punchy)</option>
                  <option value={45}>45 Seconds (Standard Reel)</option>
                  <option value={60}>60 Seconds (Full Breakdown)</option>
                </select>
              </div>
              <Button onClick={runReel} loading={loading} className="w-full">
                Build Reel Script
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Structuring hook, body beats, and CTA..." />}
            {reelResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-ink">{reelResult.title}</h3>
                  <Badge tone="accent">{reelResult.target_duration_seconds}s Reel</Badge>
                </div>

                {/* Hook */}
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-1">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                    HOOK (0-5s)
                  </span>
                  <p className="text-sm font-semibold text-ink">"{reelResult.hook?.spoken_line}"</p>
                  <p className="text-xs text-muted">
                    <span className="text-ink font-medium">Text on screen: </span>{reelResult.hook?.on_screen_text}
                  </p>
                  <p className="text-xs text-muted">
                    <span className="text-ink font-medium">Visual cue: </span>{reelResult.hook?.visual_direction}
                  </p>
                </div>

                {/* Body beats */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted block">BODY BEATS:</span>
                  {reelResult.body_beats?.map((b: any, i: number) => (
                    <div key={i} className="p-3 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                      <div className="flex justify-between items-center text-muted">
                        <span className="font-mono font-medium text-accent">{b.timestamp_range}</span>
                        <span>B-Roll: {b.b_roll_visual}</span>
                      </div>
                      <p className="text-sm text-ink font-medium">"{b.spoken_line}"</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="p-3 bg-accent-soft border border-violet-500/20 rounded-lg space-y-1 text-xs">
                  <span className="font-bold text-violet-700 uppercase tracking-wider block">CALL TO ACTION</span>
                  <p className="text-sm font-semibold text-ink">"{reelResult.call_to_action?.spoken_line}"</p>
                  <p className="text-muted">Overlay: {reelResult.call_to_action?.overlay_text}</p>
                </div>
              </Card>
            )}
            {!loading && !reelResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter an idea to build a structured vertical video script.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Thumbnail Ideator */}
      {activeTab === "thumbnail" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <ImageIcon className="size-4 text-accent" /> High-CTR Thumbnail Ideator
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">YouTube Video Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. I Automated My Whole SaaS In 48 Hours"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runThumbnails} loading={loading} className="w-full">
                Generate 4 Concepts
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            {loading && <Spinner label="Brainstorming high-CTR curiosity triggers and visuals..." />}
            {thumbResult?.thumbnail_concepts?.map((c: any, idx: number) => (
              <Card key={idx} className="p-4 space-y-2 hover:border-accent/40 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-ink">{c.concept_name}</h3>
                  <Badge tone="accent">Overlay: "{c.text_overlay}"</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                  <p><span className="text-muted">Foreground: </span><span className="text-ink">{c.foreground_element}</span></p>
                  <p><span className="text-muted">Background: </span><span className="text-ink">{c.background_setting}</span></p>
                  <p><span className="text-muted">Expression: </span><span className="text-ink">{c.facial_expression}</span></p>
                  <p><span className="text-muted">Curiosity Trigger: </span><span className="text-ink">{c.curiosity_trigger}</span></p>
                </div>
              </Card>
            ))}
            {!loading && !thumbResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter your video title to generate 4 distinct visual concepts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Pre-Production Studio */}
      {activeTab === "preprod" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Camera className="size-4 text-emerald-500" /> Shoot Plan & Shot List
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Paste Your Video Script</label>
                <textarea
                  rows={6}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste script to convert into camera cues and props..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runPreproduction} loading={loading} className="w-full">
                Build Production Plan
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Directing shot list and lighting requirements..." />}
            {preprodResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="good">Estimated Shoot Time: {preprodResult.estimated_shoot_time}</Badge>
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-ink">Required Props & Gear:</span>
                  <p className="text-muted">{preprodResult.required_props_gear?.join(", ")}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink block">Scene Breakdown & Shot List:</span>
                  <div className="space-y-2">
                    {preprodResult.scene_breakdown?.map((s: any, i: number) => (
                      <div key={i} className="p-3 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-ink">Scene {s.scene_number}: {s.shot_type}</span>
                          <span className="text-accent">{s.camera_movement}</span>
                        </div>
                        <p className="text-muted italic">"{s.script_excerpt}"</p>
                        <p className="text-ink"><span className="text-muted">B-Roll needed: </span>{s.b_roll_requirement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            {!loading && !preprodResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Paste a script to generate a complete director's shot list.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Podcast Assistant */}
      {activeTab === "podcast" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Mic className="size-4 text-purple-500" /> Podcast Publishing Kit
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Episode Notes / Transcript</label>
                <textarea
                  rows={6}
                  value={podcastText}
                  onChange={(e) => setPodcastText(e.target.value)}
                  placeholder="Paste episode conversation or summary..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runPodcast} loading={loading} className="w-full">
                Generate Notes & Chapters
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Generating chapters and viral highlights..." />}
            {podcastResult && (
              <Card className="p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted">Title Options:</span>
                  <ul className="list-disc list-inside text-sm font-semibold text-ink">
                    {podcastResult.title_options?.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                  <span className="font-semibold text-ink">Show Summary:</span>
                  <p className="text-muted leading-relaxed">{podcastResult.summary_paragraph}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-ink block">Chapters:</span>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {podcastResult.chapters?.map((ch: any, i: number) => (
                      <div key={i} className="p-2 bg-surface-2 rounded border border-line flex items-center gap-2">
                        <span className="font-mono text-accent font-bold">{ch.timestamp}</span>
                        <span className="text-ink">{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            {!loading && !podcastResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Paste podcast audio notes or transcript to generate titles, chapters, and summary.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
