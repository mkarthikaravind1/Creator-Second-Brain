"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/navigation";
import { Calendar, Compass, Handshake, GitCompareArrows, CheckCircle2 } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "daily" | "roadmap";

export default function StrategyHubPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [niche, setNiche] = useState("AI, Web Dev & Creator Tools");
  const [dailyGoal, setDailyGoal] = useState("Rapid Audience Growth & Engagement");
  const [producerGoal, setProducerGoal] = useState("Launch our first digital product to 10k email subscribers");

  // Results
  const [dailyResult, setDailyResult] = useState<any>(null);
  const [roadmapResult, setRoadmapResult] = useState<any>(null);

  const runDailyPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/strategy/daily-plan`, {
        niche,
        goal: dailyGoal,
      });
      setDailyResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate daily plan");
    } finally {
      setLoading(false);
    }
  };

  const runRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/strategy/producer`, {
        goal: producerGoal,
        audience_notes: niche,
      });
      setRoadmapResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate roadmap");
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
            <Compass className="size-6 text-indigo-500" /> Strategy Hub
          </h1>
          <p className="text-sm text-muted">
            High-level direction: daily posting blueprints, 30-day content pillars, and promise tracking.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "daily" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Calendar className="size-3.5" /> Today's Action Plan
          </button>
          <button
            onClick={() => setActiveTab("roadmap")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "roadmap" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Compass className="size-3.5" /> 30-Day Producer
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab: Daily Content Planner */}
      {activeTab === "daily" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Calendar className="size-4 text-accent" /> Plan Today's Content
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Channel Niche</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Today's Focus Goal</label>
                <input
                  type="text"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runDailyPlan} loading={loading} className="w-full">
                Generate Today's Plan
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Synthesizing today's schedule and priorities..." />}
            {dailyResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{dailyResult.date_focus}</Badge>
                  <span className="text-sm font-semibold text-ink">Theme: {dailyResult.daily_theme}</span>
                </div>

                <div className="p-4 bg-accent-soft border border-violet-500/20 rounded-lg space-y-2">
                  <span className="text-xs font-bold text-violet-700 uppercase tracking-wider block">
                    PRIMARY ACTION ITEM ({dailyResult.primary_action_item?.estimated_time_minutes} min)
                  </span>
                  <p className="text-base font-bold text-ink">{dailyResult.primary_action_item?.topic}</p>
                  <p className="text-sm text-ink">
                    <span className="text-muted">Suggested Hook: </span>"{dailyResult.primary_action_item?.suggested_hook}"
                  </p>
                </div>

                <div className="p-3 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                  <span className="font-semibold text-ink">Secondary Micro Action:</span>
                  <p className="text-muted">
                    {dailyResult.secondary_micro_action?.action} on {dailyResult.secondary_micro_action?.platform}
                  </p>
                  <p className="text-ink italic">"{dailyResult.secondary_micro_action?.prompt}"</p>
                </div>

                <div className="text-xs text-muted">
                  <span className="font-semibold text-ink">Community Prompt: </span>
                  {dailyResult.community_prompt_for_today}
                </div>
              </Card>
            )}
            {!loading && !dailyResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Click generate to get your actionable daily creation checklist.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: 30-Day Producer Roadmap */}
      {activeTab === "roadmap" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Compass className="size-4 text-indigo-500" /> AI Creative Producer
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Overarching 30-Day Goal</label>
                <textarea
                  rows={4}
                  value={producerGoal}
                  onChange={(e) => setProducerGoal(e.target.value)}
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runRoadmap} loading={loading} className="w-full">
                Produce 30-Day Strategy
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Formulating pillars and 4-week milestones..." />}
            {roadmapResult && (
              <Card className="p-5 space-y-5">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-ink">Target Audience Insight</h3>
                  <p className="text-xs text-muted">
                    <span className="font-medium text-ink">Core Craving: </span>
                    {roadmapResult.audience_profile?.what_they_crave}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink block">Content Pillars:</span>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {roadmapResult.content_pillars?.map((p: any, i: number) => (
                      <div key={i} className="p-3 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                        <span className="font-bold text-accent">{p.pillar_name}</span>
                        <p className="text-muted">{p.purpose}</p>
                        <p className="text-ink italic">e.g. {p.example_topics?.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-line">
                  <span className="text-xs font-semibold text-ink block">4-Week Milestones:</span>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {roadmapResult.four_week_milestones?.map((m: any, i: number) => (
                      <div key={i} className="p-2.5 bg-surface-2 rounded border border-line space-y-0.5">
                        <span className="font-bold text-ink">Week {m.week}: {m.focus}</span>
                        <p className="text-muted">{m.key_deliverable}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            {!loading && !roadmapResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Define your 30-day goal to build a strategic production roadmap.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
