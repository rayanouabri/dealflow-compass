import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { useTrial } from "@/hooks/useTrial";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Building2, TrendingUp, Users, Target, Shield, DollarSign,
  Globe, Linkedin, ExternalLink, CheckCircle2, AlertTriangle, XCircle,
  Loader2, RefreshCcw, Download
} from "lucide-react";

interface DueDiligenceData {
  company?: {
    name?: string;
    tagline?: string;
    website?: string;
    linkedinUrl?: string;
    crunchbaseUrl?: string;
    founded?: string;
    headquarters?: string;
    sector?: string;
    stage?: string;
    employeeCount?: string;
  };
  executiveSummary?: {
    overview?: string;
    keyHighlights?: string[];
    keyRisks?: string[];
    recommendation?: string;
    confidenceLevel?: string;
  };
  product?: {
    description?: string;
    valueProposition?: string;
    technology?: string;
    keyFeatures?: string[];
  };
  market?: {
    tam?: string;
    sam?: string;
    som?: string;
    cagr?: string;
    trends?: string[];
    analysis?: string;
  };
  competition?: {
    landscape?: string;
    competitors?: Array<{
      name: string;
      description?: string;
      funding?: string;
      strengths?: string[];
      weaknesses?: string[];
    }>;
    competitiveAdvantage?: string;
    moat?: string;
  };
  financials?: {
    fundingHistory?: Array<{
      round?: string;
      amount?: string;
      date?: string;
      investors?: string[];
      valuation?: string;
    }>;
    metrics?: {
      arr?: string;
      mrr?: string;
      customers?: string;
      burnRate?: string;
      runway?: string;
      nrr?: string;
      cac?: string;
      ltv?: string;
    };
  };
  team?: {
    founders?: Array<{
      name?: string;
      title?: string;
      background?: string;
      linkedin?: string;
    }>;
    advisors?: Array<{
      name?: string;
      title?: string;
      linkedin?: string;
    }>;
    size?: string;
  };
  investmentRecommendation?: {
    recommendation?: "INVEST" | "WATCH" | "PASS";
    targetReturn?: string;
    riskLevel?: "low" | "medium" | "high";
    suggestedTicket?: string;
    rationale?: string;
  };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function DueDiligenceResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining } = useTrial();

  const [data, setData] = useState<DueDiligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initialisation...");

  const requestPayload = location.state || (() => {
    try {
      const stored = sessionStorage.getItem("due-diligence-request");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!requestPayload?.companyName) {
      navigate("/due-diligence", { replace: true });
      return;
    }
    fetchDueDiligence();
  }, []);

  const fetchDueDiligence = async () => {
    if (requestPayload?.preloadedResult) {
      setData(requestPayload.preloadedResult as DueDiligenceData);
      setProgress(100);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return Math.min(prev + Math.random() * 6 + 2, 90);
      });
    }, 600);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configuration Supabase manquante.");
      }

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || supabaseKey}`,
        "apikey": supabaseKey,
      };

      setStatusMessage("Recherche d'informations…");
      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 160_000);

      const resSearch = await fetch(`${supabaseUrl}/functions/v1/due-diligence`, {
        method: "POST",
        signal: controller1.signal,
        headers,
        body: JSON.stringify({
          phase: "search",
          companyName: requestPayload.companyName,
          companyWebsite: requestPayload.companyWebsite,
          additionalContext: requestPayload.additionalContext,
        }),
      });

      clearTimeout(timeout1);
      const searchData = await resSearch.json();

      if (!resSearch.ok) {
        throw new Error(searchData.error || `Erreur ${resSearch.status}`);
      }

      const jobId = searchData.jobId;
      if (!jobId) {
        throw new Error("Réponse recherche invalide.");
      }

      setProgress(50);
      setStatusMessage("Analyse IA en cours…");

      let resAnalyze: Response;
      let analyzeAttempt = 0;

      while (analyzeAttempt < 2) {
        analyzeAttempt++;
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 200_000);

        resAnalyze = await fetch(`${supabaseUrl}/functions/v1/due-diligence`, {
          method: "POST",
          signal: controller2.signal,
          headers,
          body: JSON.stringify({ phase: "analyze", jobId }),
        });

        clearTimeout(timeout2);

        if (resAnalyze.status === 503 && analyzeAttempt < 2) {
          setStatusMessage("Modèle IA surchargé — nouvelle tentative…");
          await sleep(20_000);
          continue;
        }
        break;
      }

      clearInterval(progressInterval);

      const text = await resAnalyze.text();
      let result: DueDiligenceData | null = null;

      try {
        const parsed = text ? JSON.parse(text) : null;
        if (resAnalyze.ok) {
          result = parsed;
        }
      } catch {
        if (!resAnalyze.ok) {
          throw new Error(`Erreur ${resAnalyze.status}`);
        }
      }

      if (!result) {
        throw new Error("Réponse serveur invalide.");
      }

      setData(result);
      setProgress(100);
      setLoading(false);

    } catch (err) {
      clearInterval(progressInterval);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setLoading(false);
      toast({
        title: "Erreur d'analyse",
        description: errMsg.split('\n')[0],
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  const getRecommendationBadge = (rec?: string) => {
    const colors = {
      INVEST: "border-success/40 text-success bg-success/5",
      WATCH: "border-primary/40 text-primary bg-primary/5",
      PASS: "border-destructive/40 text-destructive bg-destructive/5",
    };
    const icons = { INVEST: CheckCircle2, WATCH: AlertTriangle, PASS: XCircle };
    const key = rec?.toUpperCase() as keyof typeof colors;
    const IconComp = icons[key];

    return (
      <Badge variant="outline" className={`font-medium ${colors[key] || "border-border"}`}>
        {IconComp && <IconComp className="w-3 h-3 mr-1.5" />}
        {rec || "N/A"}
      </Badge>
    );
  };

  const getRiskBadge = (level?: string) => {
    const colors = {
      low: "border-success/40 text-success bg-success/5",
      medium: "border-primary/40 text-primary bg-primary/5",
      high: "border-destructive/40 text-destructive bg-destructive/5",
    };
    const key = level?.toLowerCase() as keyof typeof colors;
    return (
      <Badge variant="outline" className={colors[key] || "border-border"}>
        {level || "N/A"}
      </Badge>
    );
  };

  const toArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    if (typeof value === 'string' && value.trim()) return [value];
    return [];
  };

  if (authLoading) return null;

  if (!requestPayload?.companyName) {
    return (
      <AppLayout user={user} trialRemaining={trialRemaining} hasTrialRemaining={hasTrialRemaining} onLogin={() => {}} onSignOut={signOut}>
        <div className="text-center py-8">Paramètres manquants.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} trialRemaining={trialRemaining} hasTrialRemaining={hasTrialRemaining} onLogin={() => {}} onSignOut={signOut}>
      <div className="mb-4">
        <Link to="/due-diligence" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
      </div>

      {loading && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{statusMessage}</p>
                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={fetchDueDiligence}>
              <RefreshCcw className="w-3.5 h-3.5 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar — Essentials */}
          <div className="lg:col-span-1">
            <div className="space-y-5 sticky top-20">
              {/* Company Header */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground leading-tight">
                      {data.company?.name}
                    </h2>
                    {data.company?.tagline && (
                      <p className="text-xs text-muted-foreground mt-1">{data.company.tagline}</p>
                    )}
                  </div>

                  {/* Quick Facts */}
                  <div className="space-y-2 text-xs">
                    {data.company?.sector && (
                      <div><span className="text-muted-foreground">Secteur:</span> {data.company.sector}</div>
                    )}
                    {data.company?.stage && (
                      <div><span className="text-muted-foreground">Stade:</span> {data.company.stage}</div>
                    )}
                    {data.company?.founded && (
                      <div><span className="text-muted-foreground">Fondée:</span> {data.company.founded}</div>
                    )}
                    {data.company?.headquarters && (
                      <div><span className="text-muted-foreground">Siège:</span> {data.company.headquarters}</div>
                    )}
                    {data.company?.employeeCount && (
                      <div><span className="text-muted-foreground">Équipe:</span> {data.company.employeeCount}</div>
                    )}
                  </div>

                  {/* Links */}
                  <div className="flex gap-2 flex-wrap">
                    {data.company?.website && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                        <a href={data.company.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-3 h-3" />
                          <span className="hidden sm:inline">Site</span>
                        </a>
                      </Button>
                    )}
                    {data.company?.linkedinUrl && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                        <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-3 h-3" />
                          <span className="hidden sm:inline">LinkedIn</span>
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Recommendation */}
                  {data.investmentRecommendation && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="text-xs text-muted-foreground">Recommandation</div>
                      {getRecommendationBadge(data.investmentRecommendation.recommendation)}
                      {data.investmentRecommendation.riskLevel && (
                        <div className="pt-1">
                          <div className="text-xs text-muted-foreground mb-1">Risque</div>
                          {getRiskBadge(data.investmentRecommendation.riskLevel)}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Export */}
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Download className="w-3.5 h-3.5" />
                Exporter
              </Button>
            </div>
          </div>

          {/* Right Content — Tabs */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="executive" className="w-full">
              <TabsList className="w-full grid grid-cols-3 lg:grid-cols-5 h-auto">
                <TabsTrigger value="executive" className="text-xs">Résumé</TabsTrigger>
                <TabsTrigger value="product" className="text-xs">Produit</TabsTrigger>
                <TabsTrigger value="market" className="text-xs">Marché</TabsTrigger>
                <TabsTrigger value="financials" className="text-xs">Finances</TabsTrigger>
                <TabsTrigger value="team" className="text-xs">Équipe</TabsTrigger>
              </TabsList>

              {/* Executive Summary */}
              <TabsContent value="executive" className="space-y-4 mt-4">
                {data.executiveSummary?.overview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Vue d'ensemble</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{data.executiveSummary.overview}</p>
                    </CardContent>
                  </Card>
                )}

                {toArray(data.executiveSummary?.keyHighlights).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Points clés</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {toArray(data.executiveSummary?.keyHighlights).map((h, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {toArray(data.executiveSummary?.keyRisks).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Risques</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {toArray(data.executiveSummary?.keyRisks).map((r, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Product */}
              <TabsContent value="product" className="space-y-4 mt-4">
                {data.product?.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{data.product.description}</p>
                    </CardContent>
                  </Card>
                )}

                {data.product?.valueProposition && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Proposition de valeur</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{data.product.valueProposition}</p>
                    </CardContent>
                  </Card>
                )}

                {toArray(data.product?.keyFeatures).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Fonctionnalités clés</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {toArray(data.product?.keyFeatures).map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Market */}
              <TabsContent value="market" className="space-y-4 mt-4">
                {(data.market?.tam || data.market?.sam || data.market?.som) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Taille de marché</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {data.market?.tam && <div><span className="text-muted-foreground">TAM:</span> {data.market.tam}</div>}
                      {data.market?.sam && <div><span className="text-muted-foreground">SAM:</span> {data.market.sam}</div>}
                      {data.market?.som && <div><span className="text-muted-foreground">SOM:</span> {data.market.som}</div>}
                    </CardContent>
                  </Card>
                )}

                {data.market?.analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Analyse</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{data.market.analysis}</p>
                    </CardContent>
                  </Card>
                )}

                {toArray(data.market?.trends).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Tendances</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {toArray(data.market?.trends).map((t, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">→</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Financials */}
              <TabsContent value="financials" className="space-y-4 mt-4">
                {data.financials?.metrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Métriques clés</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {Object.entries(data.financials.metrics).map(([key, val]) =>
                        val ? <div key={key}><span className="text-muted-foreground capitalize">{key}:</span> {val}</div> : null
                      )}
                    </CardContent>
                  </Card>
                )}

                {toArray(data.financials?.fundingHistory).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Historique de financement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {toArray(data.financials?.fundingHistory).map((round, i) => (
                        <div key={i} className="pb-3 border-b border-border last:border-0 last:pb-0">
                          <div className="font-medium text-sm">{round.round}</div>
                          {round.amount && <div className="text-xs text-muted-foreground">{round.amount}</div>}
                          {round.date && <div className="text-xs text-muted-foreground">{round.date}</div>}
                          {round.investors && <div className="text-xs text-muted-foreground">{toArray(round.investors).join(", ")}</div>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Team */}
              <TabsContent value="team" className="space-y-4 mt-4">
                {toArray(data.team?.founders).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Fondateurs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {toArray(data.team?.founders).map((f, i) => (
                        <div key={i} className="pb-3 border-b border-border last:border-0 last:pb-0">
                          <div className="font-medium text-sm">{f.name}</div>
                          {f.title && <div className="text-xs text-muted-foreground">{f.title}</div>}
                          {f.background && <div className="text-xs text-foreground mt-1">{f.background}</div>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {data.team?.size && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Taille d'équipe</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{data.team.size}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
