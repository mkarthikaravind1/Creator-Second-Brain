"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PenTool, Anchor, FileText, Megaphone, Mic, Film, Copy, Check } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "hooks" | "caption" | "ctas" | "voice" | "screenplay";

export default function WriteStudioPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("hooks");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form states
  const [hookTopic, setHookTopic] = useState("");
  const [hookStyle, setHookStyle] = useState("High Curiosity");
  const [captionSummary, setCaptionSummary] = useState("");
  const [captionPlatform, setCaptionPlatform] = useState("Instagram");
  const [ctaGoal, setCtaGoal] = useState("Drive Newsletter Signups");
  const [voiceTopic, setVoiceTopic] = useState("");
  const [screenplayPrompt, setScreenplayPrompt] = useState("");

  // Results
  const [hooksResult, setHooksResult] = useState<any>(null);
  const [captionResult, setCaptionResult] = useState<any>(null);
  const [ctaResult, setCtaResult] = useState<any>(null);
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [screenplayResult, setScreenplayResult] = useState<any>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const runHooks = async () => {
    if (!hookTopic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/write/hooks`, { topic: hookTopic, style: hookStyle });
      setHooksResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate hooks");
    } finally {
      setLoading(false);
    }
  };

  const runCaption = async () => {
    if (!captionSummary.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/write/caption`, {
        content_summary: captionSummary,
        platform: captionPlatform,
      });
      setCaptionResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate caption");
    } finally {
      setLoading(false);
    }
  };

  const runCTAs = async () => {
    if (!ctaGoal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/write/ctas`, {
        goal: ctaGoal,
        platform: "YouTube",
      });
      setCtaResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate CTAs");
    } finally {
      setLoading(false);
    }
  };

  const runVoiceReplicator = async () => {
    if (!voiceTopic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/write/voice-draft`, { prompt: voiceTopic });
      setVoiceResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to replicate voice draft");
    } finally {
      setLoading(false);
    }
  };

  const runScreenplay = async () => {
    if (!screenplayPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/write/screenplay`, {
        scene_prompt: screenplayPrompt,
        character_notes: "",
      });
      setScreenplayResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate screenplay beat");
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
            <PenTool className="size-6 text-accent" /> Write Studio
          </h1>
          <p className="text-sm text-muted">
            Hooks, captions, CTAs, cinematic dialogue, and drafts strictly trained on your creator voice.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line flex-wrap">
          <button
            onClick={() => setActiveTab("hooks")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "hooks" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Anchor className="size-3.5" /> Hook Gen
          </button>
          <button
            onClick={() => setActiveTab("caption")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "caption" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <FileText className="size-3.5" /> Caption
          </button>
          <button
            onClick={() => setActiveTab("ctas")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "ctas" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Megaphone className="size-3.5" /> CTAs
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "voice" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Mic className="size-3.5" /> Voice Replicator
          </button>
          <button
            onClick={() => setActiveTab("screenplay")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "screenplay" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Film className="size-3.5" /> Screenplay
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab: Hook Generator */}
      {activeTab === "hooks" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Anchor className="size-4 text-accent" /> 10 High-CTR Hooks
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Topic or Premise</label>
                <input
                  type="text"
                  value={hookTopic}
                  onChange={(e) => setHookTopic(e.target.value)}
                  placeholder="e.g. Why most creators quit after 90 days"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Psychological Style Focus</label>
                <select
                  value={hookStyle}
                  onChange={(e) => setHookStyle(e.target.value)}
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                >
                  <option value="High Curiosity">High Curiosity Gap</option>
                  <option value="Contrarian / Shock">Contrarian / Myth-Busting</option>
                  <option value="Story & Stakes">Personal Story & High Stakes</option>
                  <option value="Direct Callout">Direct Callout to Target Viewer</option>
                </select>
              </div>
              <Button onClick={runHooks} loading={loading} className="w-full">
                Generate 10 Hooks
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            {loading && <Spinner label="Writing 10 scroll-stopping hooks with visual directions..." />}
            {hooksResult?.hooks?.map((h: any, idx: number) => (
              <Card key={idx} className="p-4 space-y-2 hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="accent">{h.style}</Badge>
                    <p className="text-base font-semibold text-ink mt-1.5">"{h.hook_text}"</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(h.hook_text, idx)}>
                    {copiedIndex === idx ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
                <div className="pt-2 border-t border-line text-xs grid sm:grid-cols-2 gap-2 text-muted">
                  <p><span className="text-ink font-medium">Why it works: </span>{h.why_it_works}</p>
                  <p><span className="text-ink font-medium">Visual cue: </span>{h.visual_action_recommendation}</p>
                </div>
              </Card>
            ))}
            {!loading && !hooksResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter a topic to generate 10 hooks tailored to your tone.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Caption Assistant */}
      {activeTab === "caption" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <FileText className="size-4 text-emerald-500" /> Platform-Ready Caption
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Content Summary / Key Points</label>
                <textarea
                  rows={4}
                  value={captionSummary}
                  onChange={(e) => setCaptionSummary(e.target.value)}
                  placeholder="Paste what the video is about..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Platform</label>
                <select
                  value={captionPlatform}
                  onChange={(e) => setCaptionPlatform(e.target.value)}
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                >
                  <option value="Instagram">Instagram (Carousel / Reel)</option>
                  <option value="LinkedIn">LinkedIn (Professional Insight)</option>
                  <option value="YouTube">YouTube Description</option>
                  <option value="TikTok">TikTok (Short & Punchy)</option>
                </select>
              </div>
              <Button onClick={runCaption} loading={loading} className="w-full">
                Generate Caption
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2">
            {loading && <Spinner label="Drafting engaging caption..." />}
            {captionResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="good">{captionResult.platform}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(`${captionResult.caption_body}\n\n${captionResult.hashtags?.join(" ")}`, 100)
                    }
                  >
                    {copiedIndex === 100 ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />} Copy
                  </Button>
                </div>
                <h3 className="text-base font-bold text-ink">{captionResult.headline}</h3>
                <div className="p-4 bg-surface-2 rounded-lg border border-line text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {captionResult.caption_body}
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted block">Hashtags:</span>
                  <p className="text-xs text-accent font-medium">{captionResult.hashtags?.join(" ")}</p>
                </div>
              </Card>
            )}
            {!loading && !captionResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Summarize your video to get a ready-to-publish caption.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: CTA Generator */}
      {activeTab === "ctas" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Megaphone className="size-4 text-purple-500" /> High-Conversion CTAs
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Your Creator Goal</label>
                <input
                  type="text"
                  value={ctaGoal}
                  onChange={(e) => setCtaGoal(e.target.value)}
                  placeholder="e.g. Get comments, Join Discord, Buy my course"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runCTAs} loading={loading} className="w-full">
                Generate 5 CTAs
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            {loading && <Spinner label="Crafting non-repetitive conversion CTAs..." />}
            {ctaResult?.ctas?.map((c: any, idx: number) => (
              <Card key={idx} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{c.type}</Badge>
                  <span className="text-xs text-muted">Placement: {c.placement_timing}</span>
                </div>
                <p className="text-base font-semibold text-ink">"{c.script_line}"</p>
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink">On-screen graphic: </span>{c.on_screen_graphic}
                </p>
              </Card>
            ))}
            {!loading && !ctaResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Define your goal to get 5 contextual CTAs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Voice Replicator */}
      {activeTab === "voice" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Mic className="size-4 text-rose-500" /> Voice Replicator
            </h2>
            <p className="text-xs text-muted">
              Reads your channel's past transcripts to replicate your exact humor, pacing, and vocabulary.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Topic to Draft</label>
                <input
                  type="text"
                  value={voiceTopic}
                  onChange={(e) => setVoiceTopic(e.target.value)}
                  placeholder="e.g. Why I stopped using microservices"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runVoiceReplicator} loading={loading} className="w-full">
                Draft in My Voice
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2">
            {loading && <Spinner label="Analyzing speech patterns and drafting..." />}
            {voiceResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge tone="accent">Pacing: {voiceResult.analyzed_voice_traits?.pacing}</Badge>
                  <Badge tone="neutral">Tone: {voiceResult.analyzed_voice_traits?.tone}</Badge>
                </div>
                <div className="p-4 bg-surface-2 rounded-lg border border-line text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {voiceResult.replicated_draft}
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-ink block">Delivery Advice:</span>
                  <ul className="list-disc list-inside text-muted space-y-0.5">
                    {voiceResult.delivery_tips_for_creator?.map((tip: string, i: number) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}
            {!loading && !voiceResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter a topic to generate a full draft adhering to your authentic speaking style.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Screenplay Workspace */}
      {activeTab === "screenplay" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Film className="size-4 text-cyan-500" /> AI Screenplay Workspace
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Scene Description / Conflict</label>
                <textarea
                  rows={4}
                  value={screenplayPrompt}
                  onChange={(e) => setScreenplayPrompt(e.target.value)}
                  placeholder="e.g. INT. COFFEE SHOP - DAY. Founder confronts co-founder about quitting."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runScreenplay} loading={loading} className="w-full">
                Generate Scene Dialogue
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2">
            {loading && <Spinner label="Structuring screenplay scene and dialogue..." />}
            {screenplayResult && (
              <Card className="p-5 space-y-4 font-mono text-xs">
                <div className="font-bold text-sm tracking-wider uppercase border-b border-line pb-2">
                  {screenplayResult.scene_heading}
                </div>
                <p className="text-muted italic">{screenplayResult.setting_description}</p>
                <div className="space-y-3 my-4">
                  {screenplayResult.script_lines?.map((line: any, i: number) => (
                    <div key={i} className="space-y-0.5">
                      <div className="font-bold uppercase tracking-wide text-ink">{line.speaker}</div>
                      {line.parenthetical && <div className="text-muted italic">({line.parenthetical})</div>}
                      <div className="text-sm pl-4 text-ink font-sans">{line.dialogue}</div>
                    </div>
                  ))}
                </div>
                <div className="text-muted italic border-t border-line pt-2">
                  [ACTION: {screenplayResult.action_beat}]
                </div>
              </Card>
            )}
            {!loading && !screenplayResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Describe a scene to build screenplay beats and dialogue.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
