"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Users, BarChart3, MessageCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "comments" | "analytics";

export default function AudienceIntelPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [rawComments, setRawComments] = useState("");
  const [analyticsData, setAnalyticsData] = useState("");

  // Results
  const [commentResult, setCommentResult] = useState<any>(null);
  const [analyticsResult, setAnalyticsResult] = useState<any>(null);

  const runComments = async () => {
    if (!rawComments.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/audience/comments`, {
        prompt: rawComments,
      });
      setCommentResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze comments");
    } finally {
      setLoading(false);
    }
  };

  const runAnalytics = async () => {
    if (!analyticsData.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/audience/analytics`, {
        prompt: analyticsData,
      });
      setAnalyticsResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze metrics");
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
            <Users className="size-6 text-cyan-500" /> Audience Intelligence
          </h1>
          <p className="text-sm text-muted">
            Comment sentiment categorization, audience confusion mining, and AI analytics copilot.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab("comments")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "comments" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <MessageCircle className="size-3.5" /> Comment Sentiment & Themes
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "analytics" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <BarChart3 className="size-3.5" /> Analytics Copilot
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab: Comment Analyzer */}
      {activeTab === "comments" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <MessageCircle className="size-4 text-accent" /> Analyze Raw Comments
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Paste 10-50 Comments</label>
                <textarea
                  rows={6}
                  value={rawComments}
                  onChange={(e) => setRawComments(e.target.value)}
                  placeholder="Paste comments from YouTube, Instagram, or Discord..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runComments} loading={loading} className="w-full">
                Run Intelligence Analysis
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Synthesizing sentiment, recurring questions, and complaints..." />}
            {commentResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="good">Sentiment: {commentResult.overall_sentiment}</Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-ink block">Top Recurring Themes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {commentResult.key_themes?.map((th: string, i: number) => (
                      <Badge key={i} tone="neutral">{th}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-surface-2 rounded-lg border border-line space-y-1">
                    <span className="font-bold text-accent block">Top Questions Asked:</span>
                    <ul className="list-disc list-inside space-y-1 text-ink">
                      {commentResult.top_questions_asked?.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                    <span className="font-bold text-warn block flex items-center gap-1">
                      <AlertTriangle className="size-3.5" /> Audience Objections:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-ink">
                      {commentResult.audience_objections?.map((obj: string, i: number) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-accent-soft border border-violet-500/20 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-violet-700 block">Immediate Action Recommendation:</span>
                  <p className="text-ink">{commentResult.immediate_action_recommendation}</p>
                </div>
              </Card>
            )}
            {!loading && !commentResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Paste comments to generate audience sentiment & questions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Analytics Copilot */}
      {activeTab === "analytics" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <BarChart3 className="size-4 text-cyan-500" /> Analytics Copilot
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Metrics / Video Performance Data</label>
                <textarea
                  rows={6}
                  value={analyticsData}
                  onChange={(e) => setAnalyticsData(e.target.value)}
                  placeholder="e.g. Video 1: 45k views, 52% retention at 30s, 7.2% CTR. Video 2: 8k views, 28% retention at 30s..."
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runAnalytics} loading={loading} className="w-full">
                Diagnose Performance
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Diagnosing retention curves, CTR, and algorithm fit..." />}
            {analyticsResult && (
              <Card className="p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted block">Performance Diagnosis:</span>
                  <p className="text-sm text-ink leading-relaxed font-medium">
                    {analyticsResult.performance_diagnosis}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                    <span className="font-bold text-good block">What to Double Down On:</span>
                    <ul className="list-disc list-inside space-y-1 text-ink">
                      {analyticsResult.what_to_double_down_on?.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1">
                    <span className="font-bold text-bad block">What to Stop Doing:</span>
                    <ul className="list-disc list-inside space-y-1 text-ink">
                      {analyticsResult.what_to_stop_doing?.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3.5 bg-accent-soft border border-violet-500/20 rounded-lg space-y-1 text-xs">
                  <span className="font-bold text-violet-700 block">Next Recommended Video:</span>
                  <p className="text-sm font-bold text-ink">{analyticsResult.next_recommended_video_concept?.title}</p>
                  <p className="text-muted">{analyticsResult.next_recommended_video_concept?.why_high_probability}</p>
                </div>
              </Card>
            )}
            {!loading && !analyticsResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Paste analytics metrics to receive a performance diagnosis and actionable fixes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
