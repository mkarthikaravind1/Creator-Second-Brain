"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Lightbulb, TrendingUp, Search, MessageSquare, Sparkles, Copy, Check } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "ideas" | "trend" | "research" | "comments";

export default function IdeaLabPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("ideas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form states
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("General Tech / Creators");
  const [trend, setTrend] = useState("");
  const [researchTopic, setResearchTopic] = useState("");
  const [commentsText, setCommentsText] = useState("");

  // Results
  const [ideasResult, setIdeasResult] = useState<any>(null);
  const [trendResult, setTrendResult] = useState<any>(null);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [commentsResult, setCommentsResult] = useState<any>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const runGenerateIdeas = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/idealab/ideas`, { topic, audience });
      setIdeasResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  };

  const runTrendToContent = async () => {
    if (!trend.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/idealab/trend`, { trend, format: "Reel / Short" });
      setTrendResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to adapt trend");
    } finally {
      setLoading(false);
    }
  };

  const runResearch = async () => {
    if (!researchTopic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/idealab/research`, { prompt: researchTopic });
      setResearchResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to conduct research");
    } finally {
      setLoading(false);
    }
  };

  const runCommentsToContent = async () => {
    if (!commentsText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/idealab/comments-to-content`, { prompt: commentsText });
      setCommentsResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to extract comment ideas");
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
            <Lightbulb className="size-6 text-amber-500" /> IdeaLab
          </h1>
          <p className="text-sm text-muted">
            Ideation, research, trend-jacking, and audience comment extraction — grounded in your Creator Brain.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab("ideas")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "ideas" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Sparkles className="size-3.5" /> 10 Ideas
          </button>
          <button
            onClick={() => setActiveTab("trend")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "trend" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <TrendingUp className="size-3.5" /> Trend Angle
          </button>
          <button
            onClick={() => setActiveTab("research")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "research" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Search className="size-3.5" /> Research
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "comments" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <MessageSquare className="size-3.5" /> Comments → Content
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab 1: 10 Content Ideas */}
      {activeTab === "ideas" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Sparkles className="size-4 text-accent" /> Generate 10 Content Ideas
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Core Topic / Keyword</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Next.js 16 Server Actions, Building SaaS"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Target Audience Profile</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Junior devs, Solo founders, Beginners"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runGenerateIdeas} loading={loading} className="w-full">
                Generate 10 Fresh Ideas
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Consulting Creator Brain and drafting 10 angles..." />}
            {ideasResult?.ideas?.map((item: any, idx: number) => (
              <Card key={idx} className="p-4 space-y-2 hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="accent">{item.format}</Badge>
                      <h3 className="font-semibold text-base text-ink">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted italic">"{item.hook_angle}"</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`${item.title}\n\nHook: ${item.hook_angle}`, idx)}
                  >
                    {copiedIndex === idx ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
                <div className="pt-2 border-t border-line/60 grid sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted">Why it works: </span>
                    <span className="text-ink">{item.why_it_works}</span>
                  </div>
                  <div>
                    <span className="text-muted">Brain Connection: </span>
                    <span className="text-ink">{item.connection_to_past}</span>
                  </div>
                </div>
              </Card>
            ))}
            {!loading && !ideasResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter a topic on the left to generate 10 personalized ideas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Trend-to-Content */}
      {activeTab === "trend" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" /> Trend-to-Content Engine
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Viral Trend / News Topic</label>
                <textarea
                  rows={3}
                  value={trend}
                  onChange={(e) => setTrend(e.target.value)}
                  placeholder="e.g. New OpenAI model release, GitHub Copilot workspace preview"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runTrendToContent} loading={loading} className="w-full">
                Extract Creator Angle
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Synthesizing trend with your niche..." />}
            {trendResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="good">Viral Angle Found</Badge>
                  <span className="text-xs text-muted">Format: {trendResult.content_format}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-ink">{trendResult.creator_angle}</h3>
                  <p className="text-sm text-muted">{trendResult.why_relevant}</p>
                </div>
                <div className="p-3 bg-accent-soft border border-violet-500/20 rounded-lg">
                  <span className="text-xs font-semibold text-violet-700 block mb-1">Suggested Hook:</span>
                  <p className="text-sm text-ink font-medium">"{trendResult.suggested_hook}"</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted">Outline Beats:</span>
                  <ul className="list-disc list-inside space-y-1 text-sm text-ink">
                    {trendResult.outline_points?.map((pt: string, i: number) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-3 border-t border-line text-xs">
                  <span className="text-muted">CTA: </span>
                  <span className="text-ink font-medium">{trendResult.call_to_action}</span>
                </div>
              </Card>
            )}
            {!loading && !trendResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter a viral trend to identify how your channel can uniquely cover it.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Research Assistant */}
      {activeTab === "research" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Search className="size-4 text-blue-500" /> Deep Topic Research
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Topic to Research</label>
                <input
                  type="text"
                  value={researchTopic}
                  onChange={(e) => setResearchTopic(e.target.value)}
                  placeholder="e.g. History of Relational Databases vs Vector DBs"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runResearch} loading={loading} className="w-full">
                Run Research
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Gathering key facts, contrarian angles, and narrative arc..." />}
            {researchResult && (
              <Card className="p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">{researchResult.topic}</h3>
                  <p className="text-sm text-muted mt-1">{researchResult.core_premise}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink block">Key Facts & Context:</span>
                  <div className="grid gap-2">
                    {researchResult.key_facts?.map((f: any, i: number) => (
                      <div key={i} className="p-2.5 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                        <p className="font-medium text-ink">{f.fact}</p>
                        <p className="text-muted">{f.source_context}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-bad block">Contrarian Angles:</span>
                    <ul className="list-disc list-inside space-y-1 text-ink">
                      {researchResult.contrarian_angles?.map((ca: string, i: number) => (
                        <li key={i}>{ca}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-good block">Story Arc:</span>
                    <p className="text-ink">{researchResult.recommended_story_arc}</p>
                  </div>
                </div>
              </Card>
            )}
            {!loading && !researchResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter any topic to get structured research, misconceptions, and narrative arcs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Comments-to-Content */}
      {activeTab === "comments" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <MessageSquare className="size-4 text-purple-500" /> Comments-to-Content
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Paste Viewer Comments</label>
                <textarea
                  rows={6}
                  value={commentsText}
                  onChange={(e) => setCommentsText(e.target.value)}
                  placeholder="Paste raw viewer comments from YouTube or Instagram..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runCommentsToContent} loading={loading} className="w-full">
                Extract Ideas
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Analyzing viewer questions and extracting video ideas..." />}
            {commentsResult?.content_opportunities?.map((opp: any, idx: number) => (
              <Card key={idx} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{opp.format}</Badge>
                  <span className="text-xs text-muted italic">"{opp.inspiration_comment}"</span>
                </div>
                <h3 className="font-bold text-base text-ink">{opp.proposed_title}</h3>
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink">Hook: </span>"{opp.hook}"
                </p>
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink">Takeaway: </span>{opp.key_takeaway}
                </p>
              </Card>
            ))}
            {!loading && !commentsResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Paste comments to mine questions and objections into your next viral videos.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
