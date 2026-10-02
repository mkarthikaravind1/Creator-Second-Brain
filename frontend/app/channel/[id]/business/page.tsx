"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Briefcase, Handshake, Mail, Users2, Copy, Check } from "lucide-react";
import { Button, Card, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

type Tab = "pitch" | "collabs";

export default function BusinessSuitePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("pitch");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form states
  const [brandName, setBrandName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [collabTheme, setCollabTheme] = useState("");

  // Results
  const [pitchResult, setPitchResult] = useState<any>(null);
  const [collabResult, setCollabResult] = useState<any>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const runPitch = async () => {
    if (!brandName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/business/pitch`, {
        brand_name: brandName,
        product_description: productDesc,
        deliverables: "1 Dedicated Video + 2 Shorts",
      });
      setPitchResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate brand pitch");
    } finally {
      setLoading(false);
    }
  };

  const runCollabs = async () => {
    if (!collabTheme.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/creatoros/${id}/business/collabs`, {
        theme_or_niche: collabTheme,
      });
      setCollabResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to find collaboration matches");
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
            <Briefcase className="size-6 text-amber-600" /> Business Suite
          </h1>
          <p className="text-sm text-muted">
            Monetization, tailored brand sponsorship proposals, and creator collaboration matchmaking.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab("pitch")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "pitch" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Mail className="size-3.5" /> Brand Pitch Builder
          </button>
          <button
            onClick={() => setActiveTab("collabs")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "collabs" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Users2 className="size-3.5" /> Collab Matchmaker
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {/* Tab: Brand Pitch Builder */}
      {activeTab === "pitch" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Mail className="size-4 text-accent" /> Draft Sponsorship Pitch
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Target Brand Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Supabase, Notion, Raycast"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Product or Campaign Focus</label>
                <input
                  type="text"
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  placeholder="e.g. Launch of their new vector database feature"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runPitch} loading={loading} className="w-full">
                Generate Custom Pitch
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Crafting seamless integration concept and pitch email..." />}
            {pitchResult && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="good">{pitchResult.brand_name} Sponsorship Proposal</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(pitchResult.personalized_cold_pitch_email, 1)}
                  >
                    {copiedIndex === 1 ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />} Copy Email
                  </Button>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted block">Subject Line Options:</span>
                  {pitchResult.email_subject_lines?.map((subj: string, i: number) => (
                    <p key={i} className="text-xs font-mono text-accent">👉 {subj}</p>
                  ))}
                </div>

                <div className="p-4 bg-surface-2 rounded-lg border border-line text-xs whitespace-pre-wrap leading-relaxed text-ink">
                  {pitchResult.personalized_cold_pitch_email}
                </div>

                <div className="p-3 bg-accent-soft border border-violet-500/20 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-violet-700 block">Organic Integration Concept:</span>
                  <p className="font-semibold text-ink">{pitchResult.creative_integration_concept?.title}</p>
                  <p className="text-muted">{pitchResult.creative_integration_concept?.angle}</p>
                  <p className="text-ink font-medium">Why audience buys: {pitchResult.creative_integration_concept?.why_audience_will_buy}</p>
                </div>
              </Card>
            )}
            {!loading && !pitchResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter a brand name to generate a high-converting sponsorship pitch.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Collaboration Matchmaker */}
      {activeTab === "collabs" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1 h-fit space-y-4">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Users2 className="size-4 text-amber-500" /> Find Collab Opportunities
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Collaboration Topic / Vision</label>
                <input
                  type="text"
                  value={collabTheme}
                  onChange={(e) => setCollabTheme(e.target.value)}
                  placeholder="e.g. AI full-stack live build, Debate on frameworks"
                  className="w-full text-sm bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <Button onClick={runCollabs} loading={loading} className="w-full">
                Brainstorm Collab Angles
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {loading && <Spinner label="Finding partner archetypes and joint video concepts..." />}
            {collabResult && (
              <Card className="p-5 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink block">Ideal Partner Archetypes:</span>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {collabResult.ideal_collaborator_profiles?.map((p: any, i: number) => (
                      <div key={i} className="p-2.5 bg-surface-2 rounded border border-line space-y-0.5">
                        <span className="font-bold text-accent">{p.archetype}</span>
                        <p className="text-muted">{p.audience_crossover}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-line">
                  <span className="text-xs font-semibold text-ink block">Joint Content Concepts:</span>
                  {collabResult.joint_content_concepts?.map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-surface-2 rounded-lg border border-line text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-ink">{c.concept_title}</span>
                        <Badge tone="accent">{c.format}</Badge>
                      </div>
                      <p className="text-muted italic">"{c.hook}"</p>
                      <p className="text-ink"><span className="text-muted">Mutual Value: </span>{c.value_for_both_audiences}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-accent-soft border border-violet-500/20 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-violet-700 block">Outreach DM Template:</span>
                  <p className="text-ink leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                    {collabResult.outreach_dm_template}
                  </p>
                </div>
              </Card>
            )}
            {!loading && !collabResult && (
              <div className="text-center py-16 text-muted text-sm border border-dashed border-line rounded-xl">
                Enter a collaboration topic to generate joint formats and outreach messages.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
