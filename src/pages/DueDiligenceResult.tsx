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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  FileSearch, 
  Building2, 
  TrendingUp, 
  Users, 
  Target, 
  Shield, 
  DollarSign, 
  Globe,
  Linkedin,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCcw,
  Download,
  ChevronRight,
  Briefcase,
  Award,
  AlertCircle,
  Lightbulb,
  BarChart3,
  Link as LinkIcon
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
    patents?: string;
    keyFeatures?: string[];
    sources?: { name: string; url: string }[];
  };
  market?: {
    tam?: string;
    sam?: string;
    som?: string;
    cagr?: string;
    trends?: string[];
    analysis?: string;
    sources?: { name: string; url: string }[];
  };
  competition?: {
    landscape?: string;
    competitors?: {
      name: string;
      description?: string;
      funding?: string;
      strengths?: string[];
      weaknesses?: string[];
    }[];
    competitiveAdvantage?: string;
    moat?: string;
    sources?: { name: string; url: string }[];
  };
  financials?: {
    fundingHistory?: {
      round?: string;
      amount?: string;
      date?: string;
      investors?: string[];
      valuation?: string;
      source?: string;
    }[];
    totalFunding?: string;
    latestValuation?: string;
    metrics?: Record<string, string>;
    sources?: { name: string; url: string }[];
  };
  team?: {
    overview?: string;
    founders?: {
      name?: string;
      role?: string;
      linkedin?: string;
      background?: string;
      source?: string;
    }[];
    keyExecutives?: {
      name?: string;
      role?: string;
      background?: string;
    }[];
    teamSize?: string;
    culture?: string;
    hiringTrends?: string;
    sources?: { name: string; url: string }[];
  };
  traction?: {
    overview?: string;
    keyMilestones?: {
      date?: string;
      milestone?: string;
      source?: string;
    }[];
    customers?: {
      count?: string;
      notable?: string[];
      segments?: string;
    };
    partnerships?: string[];
    awards?: string[];
    sources?: { name: string; url: string }[];
  };
  risks?: {
    marketRisks?: string[];
    executionRisks?: string[];
    financialRisks?: string[];
    competitiveRisks?: string[];
    regulatoryRisks?: string[];
    mitigations?: string[];
    overallRiskLevel?: string;
    sources?: { name: string; url: string }[];
  };
  opportunities?: {
    growthOpportunities?: string[];
    marketExpansion?: string;
    productExpansion?: string;
    strategicValue?: string;
    sources?: { name: string; url: string }[];
  };
  investmentRecommendation?: {
    recommendation?: string;
    rationale?: string;
    strengths?: string[];
    weaknesses?: string[];
    keyQuestions?: string[];
    suggestedNextSteps?: string[];
    targetReturn?: string;
    investmentHorizon?: string;
    suggestedTicket?: string;
  };
  allSources?: {
    name: string;
    url: string;
    type?: string;
    relevance?: string;
  }[];
  dataQuality?: {
    overallScore?: string;
    dataAvailability?: Record<string, string>;
    limitations?: string[];
    sourcesCount?: string;
  };
  metadata?: {
    companyName?: string;
    generatedAt?: string;
    searchResultsCount?: number;
  };
}

export default function DueDiligenceResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining, decrementTrial } = useTrial();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DueDiligenceData | null>(null);
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
    setLoading(true);
    setError(null);
    setProgress(0);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const increment = Math.random() * 8 + 2;
        const newProgress = Math.min(prev + increment, 90);
        
        // Update status message based on progress
        if (newProgress < 20) setStatusMessage("Recherche d'informations...");
        else if (newProgress < 40) setStatusMessage("Analyse des financements...");
        else if (newProgress < 60) setStatusMessage("Analyse de l'équipe...");
        else if (newProgress < 80) setStatusMessage("Évaluation du marché...");
        else setStatusMessage("Génération du rapport...");
        
        return newProgress;
      });
    }, 800);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/due-diligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            companyName: requestPayload.companyName,
            companyWebsite: requestPayload.companyWebsite,
            additionalContext: requestPayload.additionalContext,
          }),
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setProgress(100);
      setStatusMessage("Rapport terminé !");
      
      // Decrement trial
      decrementTrial();

    } catch (err) {
      clearInterval(progressInterval);
      console.error("Due Diligence error:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationBadge = (rec?: string) => {
    switch (rec?.toUpperCase()) {
      case "INVEST":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> INVEST</Badge>;
      case "WATCH":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> WATCH</Badge>;
      case "PASS":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> PASS</Badge>;
      default:
        return <Badge variant="outline">{rec || "N/A"}</Badge>;
    }
  };

  const getRiskBadge = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "low":
        return <Badge className="bg-green-500/20 text-green-400">Risque Faible</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/20 text-amber-400">Risque Modéré</Badge>;
      case "high":
        return <Badge className="bg-red-500/20 text-red-400">Risque Élevé</Badge>;
      default:
        return null;
    }
  };

  const SourceLink = ({ url, name }: { url?: string; name?: string }) => {
    if (!url) return null;
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline"
      >
        <ExternalLink className="w-3 h-3" />
        {name || "Source"}
      </a>
    );
  };

  if (authLoading) return null;

  return (
    <AppLayout
      user={user}
      trialRemaining={trialRemaining}
      hasTrialRemaining={hasTrialRemaining}
      onLogin={() => {}}
      onSignOut={signOut}
      onUpgrade={() => {}}
    >
      <div className="max-w-6xl mx-auto">
        <Link
          to="/due-diligence"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Nouvelle analyse
        </Link>

        {/* Loading State */}
        {loading && (
          <Card className="bg-card/80 border-amber-500/30">
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-amber-400 animate-spin" />
                  <FileSearch className="w-8 h-8 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">
                    Analyse de {requestPayload?.companyName}
                  </h2>
                  <p className="text-muted-foreground mb-4">{statusMessage}</p>
                </div>
                <div className="w-full max-w-md">
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card className="bg-card/80 border-red-500/30">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <h2 className="text-xl font-semibold">Erreur d'analyse</h2>
                <p className="text-muted-foreground max-w-md">{error}</p>
                <Button onClick={fetchDueDiligence} variant="outline" className="mt-4">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {data.company?.name || requestPayload?.companyName}
                  </h1>
                  {getRecommendationBadge(data.executiveSummary?.recommendation)}
                </div>
                {data.company?.tagline && (
                  <p className="text-muted-foreground">{data.company.tagline}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {data.company?.sector && (
                    <Badge variant="outline">{data.company.sector}</Badge>
                  )}
                  {data.company?.stage && (
                    <Badge variant="secondary">{data.company.stage}</Badge>
                  )}
                  {data.company?.headquarters && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {data.company.headquarters}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {data.company?.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.company.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Site web
                    </a>
                  </Button>
                )}
                {data.company?.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Executive Summary Card */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
                  <FileSearch className="w-5 h-5" />
                  Résumé Exécutif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  {data.executiveSummary?.overview}
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  {/* Key Highlights */}
                  {data.executiveSummary?.keyHighlights && data.executiveSummary.keyHighlights.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Points Forts
                      </h4>
                      <ul className="space-y-1">
                        {data.executiveSummary.keyHighlights.map((h, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Key Risks */}
                  {data.executiveSummary?.keyRisks && data.executiveSummary.keyRisks.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Risques Clés
                      </h4>
                      <ul className="space-y-1">
                        {data.executiveSummary.keyRisks.map((r, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-red-500 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs for detailed sections */}
            <Tabs defaultValue="financials" className="w-full">
              <TabsList className="w-full flex flex-wrap justify-start gap-1 bg-card/50 p-1 h-auto">
                <TabsTrigger value="financials" className="text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Financements
                </TabsTrigger>
                <TabsTrigger value="product" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Produit
                </TabsTrigger>
                <TabsTrigger value="market" className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Marché
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Équipe
                </TabsTrigger>
                <TabsTrigger value="competition" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Concurrence
                </TabsTrigger>
                <TabsTrigger value="traction" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Traction
                </TabsTrigger>
                <TabsTrigger value="risks" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Risques
                </TabsTrigger>
                <TabsTrigger value="recommendation" className="text-xs">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Recommandation
                </TabsTrigger>
                <TabsTrigger value="sources" className="text-xs">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  Sources
                </TabsTrigger>
              </TabsList>

              {/* Financials Tab */}
              <TabsContent value="financials" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Financements & Métriques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Summary metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Levé</p>
                        <p className="text-lg font-semibold text-green-400">
                          {data.financials?.totalFunding || "N/A"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Valorisation</p>
                        <p className="text-lg font-semibold text-amber-400">
                          {data.financials?.latestValuation || "N/A"}
                        </p>
                      </div>
                      {data.financials?.metrics?.arr && (
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">ARR</p>
                          <p className="text-lg font-semibold">{data.financials.metrics.arr}</p>
                        </div>
                      )}
                      {data.financials?.metrics?.customers && (
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Clients</p>
                          <p className="text-lg font-semibold">{data.financials.metrics.customers}</p>
                        </div>
                      )}
                    </div>

                    {/* Funding History */}
                    {data.financials?.fundingHistory && data.financials.fundingHistory.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Historique des Levées</h4>
                        <div className="space-y-3">
                          {data.financials.fundingHistory.map((round, i) => (
                            <div key={i} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <Badge variant="outline" className="mr-2">{round.round}</Badge>
                                  <span className="text-lg font-semibold text-green-400">{round.amount}</span>
                                </div>
                                {round.date && <span className="text-sm text-muted-foreground">{round.date}</span>}
                              </div>
                              {round.valuation && (
                                <p className="text-sm text-amber-400 mb-1">Valorisation: {round.valuation}</p>
                              )}
                              {round.investors && round.investors.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Investisseurs: {round.investors.join(", ")}
                                </p>
                              )}
                              {round.source && <SourceLink url={round.source} name="Voir source" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other metrics */}
                    {data.financials?.metrics && (
                      <div>
                        <h4 className="font-semibold mb-3">Métriques Détaillées</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(data.financials.metrics).map(([key, value]) => (
                            <div key={key} className="bg-gray-800/30 rounded-lg p-3">
                              <p className="text-xs text-muted-foreground capitalize mb-1">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-sm">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources */}
                    {data.financials?.sources && data.financials.sources.length > 0 && (
                      <div className="pt-4 border-t border-gray-700/50">
                        <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {data.financials.sources.map((s, i) => (
                            <SourceLink key={i} url={s.url} name={s.name} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Product Tab */}
              <TabsContent value="product" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Produit & Technologie
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.product?.description && (
                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-gray-300 leading-relaxed">{data.product.description}</p>
                      </div>
                    )}
                    {data.product?.valueProposition && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-400 mb-2">Proposition de Valeur</h4>
                        <p className="text-gray-300">{data.product.valueProposition}</p>
                      </div>
                    )}
                    {data.product?.technology && (
                      <div>
                        <h4 className="font-semibold mb-2">Technologie</h4>
                        <p className="text-gray-300">{data.product.technology}</p>
                      </div>
                    )}
                    {data.product?.keyFeatures && data.product.keyFeatures.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Fonctionnalités Clés</h4>
                        <div className="flex flex-wrap gap-2">
                          {data.product.keyFeatures.map((f, i) => (
                            <Badge key={i} variant="secondary">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Market Tab */}
              <TabsContent value="market" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      Analyse du Marché
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* TAM/SAM/SOM */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">TAM</p>
                        <p className="text-lg font-semibold text-purple-400">{data.market?.tam || "N/A"}</p>
                      </div>
                      <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">SAM</p>
                        <p className="text-lg font-semibold text-purple-400">{data.market?.sam || "N/A"}</p>
                      </div>
                      <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">SOM</p>
                        <p className="text-lg font-semibold text-purple-400">{data.market?.som || "N/A"}</p>
                      </div>
                    </div>
                    
                    {data.market?.cagr && (
                      <p className="text-sm"><strong>CAGR:</strong> {data.market.cagr}</p>
                    )}
                    
                    {data.market?.analysis && (
                      <div>
                        <h4 className="font-semibold mb-2">Analyse</h4>
                        <p className="text-gray-300 leading-relaxed">{data.market.analysis}</p>
                      </div>
                    )}
                    
                    {data.market?.trends && data.market.trends.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Tendances</h4>
                        <ul className="space-y-1">
                          {data.market.trends.map((t, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <TrendingUp className="w-3 h-3 mt-1 text-purple-400 flex-shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      Équipe & Fondateurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.team?.overview && (
                      <p className="text-gray-300 leading-relaxed">{data.team.overview}</p>
                    )}
                    
                    {data.team?.teamSize && (
                      <div className="bg-cyan-500/10 rounded-lg p-3 inline-block">
                        <p className="text-sm"><strong>Taille de l'équipe:</strong> {data.team.teamSize}</p>
                      </div>
                    )}
                    
                    {data.team?.founders && data.team.founders.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Fondateurs</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {data.team.founders.map((f, i) => (
                            <div key={i} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold">{f.name}</p>
                                  <p className="text-sm text-cyan-400">{f.role}</p>
                                </div>
                                {f.linkedin && (
                                  <a href={f.linkedin} target="_blank" rel="noopener noreferrer">
                                    <Linkedin className="w-4 h-4 text-muted-foreground hover:text-cyan-400" />
                                  </a>
                                )}
                              </div>
                              {f.background && <p className="text-sm text-gray-400">{f.background}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.team?.keyExecutives && data.team.keyExecutives.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Équipe Dirigeante</h4>
                        <div className="space-y-2">
                          {data.team.keyExecutives.map((e, i) => (
                            <div key={i} className="bg-gray-800/20 rounded-lg p-3">
                              <p className="font-medium">{e.name} <span className="text-sm text-muted-foreground">- {e.role}</span></p>
                              {e.background && <p className="text-sm text-gray-400 mt-1">{e.background}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Competition Tab */}
              <TabsContent value="competition" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-orange-400" />
                      Analyse Concurrentielle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.competition?.landscape && (
                      <p className="text-gray-300 leading-relaxed">{data.competition.landscape}</p>
                    )}
                    
                    {data.competition?.competitiveAdvantage && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-400 mb-2">Avantage Concurrentiel</h4>
                        <p className="text-gray-300">{data.competition.competitiveAdvantage}</p>
                      </div>
                    )}
                    
                    {data.competition?.moat && (
                      <div>
                        <h4 className="font-semibold mb-2">Moat</h4>
                        <p className="text-gray-300">{data.competition.moat}</p>
                      </div>
                    )}
                    
                    {data.competition?.competitors && data.competition.competitors.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Concurrents Principaux</h4>
                        <div className="space-y-3">
                          {data.competition.competitors.map((c, i) => (
                            <div key={i} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-semibold">{c.name}</p>
                                {c.funding && <Badge variant="outline">{c.funding}</Badge>}
                              </div>
                              {c.description && <p className="text-sm text-gray-400 mb-2">{c.description}</p>}
                              <div className="grid md:grid-cols-2 gap-2 text-xs">
                                {c.strengths && c.strengths.length > 0 && (
                                  <div>
                                    <p className="text-green-400 font-medium mb-1">Forces:</p>
                                    <ul className="text-gray-400">
                                      {c.strengths.map((s, j) => <li key={j}>• {s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {c.weaknesses && c.weaknesses.length > 0 && (
                                  <div>
                                    <p className="text-red-400 font-medium mb-1">Faiblesses:</p>
                                    <ul className="text-gray-400">
                                      {c.weaknesses.map((w, j) => <li key={j}>• {w}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Traction Tab */}
              <TabsContent value="traction" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Traction & Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.traction?.overview && (
                      <p className="text-gray-300 leading-relaxed">{data.traction.overview}</p>
                    )}
                    
                    {data.traction?.customers && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {data.traction.customers.count && (
                          <div className="bg-green-500/10 rounded-lg p-4">
                            <p className="text-xs text-muted-foreground mb-1">Clients</p>
                            <p className="text-xl font-semibold text-green-400">{data.traction.customers.count}</p>
                          </div>
                        )}
                        {data.traction.customers.notable && data.traction.customers.notable.length > 0 && (
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <p className="text-xs text-muted-foreground mb-2">Clients Notables</p>
                            <div className="flex flex-wrap gap-2">
                              {data.traction.customers.notable.map((c, i) => (
                                <Badge key={i} variant="secondary">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {data.traction?.keyMilestones && data.traction.keyMilestones.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Milestones Clés</h4>
                        <div className="space-y-2">
                          {data.traction.keyMilestones.map((m, i) => (
                            <div key={i} className="flex items-start gap-3 bg-gray-800/20 rounded-lg p-3">
                              <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                              <div className="flex-1">
                                <p className="text-sm">{m.milestone}</p>
                                {m.date && <p className="text-xs text-muted-foreground mt-1">{m.date}</p>}
                              </div>
                              {m.source && <SourceLink url={m.source} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {data.traction?.partnerships && data.traction.partnerships.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Partenariats</h4>
                        <div className="flex flex-wrap gap-2">
                          {data.traction.partnerships.map((p, i) => (
                            <Badge key={i} variant="outline">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {data.traction?.awards && data.traction.awards.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          Récompenses
                        </h4>
                        <ul className="space-y-1">
                          {data.traction.awards.map((a, i) => (
                            <li key={i} className="text-sm text-gray-300">• {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Risks Tab */}
              <TabsContent value="risks" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Analyse des Risques
                      </span>
                      {getRiskBadge(data.risks?.overallRiskLevel)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {data.risks?.marketRisks && data.risks.marketRisks.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-red-400 mb-2">Risques Marché</h4>
                          <ul className="space-y-1 text-sm">
                            {data.risks.marketRisks.map((r, i) => (
                              <li key={i} className="text-gray-300">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {data.risks?.executionRisks && data.risks.executionRisks.length > 0 && (
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-orange-400 mb-2">Risques Exécution</h4>
                          <ul className="space-y-1 text-sm">
                            {data.risks.executionRisks.map((r, i) => (
                              <li key={i} className="text-gray-300">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {data.risks?.financialRisks && data.risks.financialRisks.length > 0 && (
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-400 mb-2">Risques Financiers</h4>
                          <ul className="space-y-1 text-sm">
                            {data.risks.financialRisks.map((r, i) => (
                              <li key={i} className="text-gray-300">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {data.risks?.competitiveRisks && data.risks.competitiveRisks.length > 0 && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-purple-400 mb-2">Risques Concurrentiels</h4>
                          <ul className="space-y-1 text-sm">
                            {data.risks.competitiveRisks.map((r, i) => (
                              <li key={i} className="text-gray-300">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {data.risks?.mitigations && data.risks.mitigations.length > 0 && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-green-400 mb-2">Facteurs Atténuants</h4>
                        <ul className="space-y-1 text-sm">
                          {data.risks.mitigations.map((m, i) => (
                            <li key={i} className="text-gray-300 flex items-start gap-2">
                              <CheckCircle2 className="w-3 h-3 mt-1 text-green-400 flex-shrink-0" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recommendation Tab */}
              <TabsContent value="recommendation" className="mt-4">
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        Recommandation d'Investissement
                      </span>
                      {getRecommendationBadge(data.investmentRecommendation?.recommendation)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.investmentRecommendation?.rationale && (
                      <div>
                        <h4 className="font-semibold mb-2">Justification</h4>
                        <p className="text-gray-300 leading-relaxed">{data.investmentRecommendation.rationale}</p>
                      </div>
                    )}
                    
                    <div className="grid md:grid-cols-3 gap-4 my-4">
                      {data.investmentRecommendation?.targetReturn && (
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Multiple Cible</p>
                          <p className="text-lg font-semibold text-amber-400">{data.investmentRecommendation.targetReturn}</p>
                        </div>
                      )}
                      {data.investmentRecommendation?.investmentHorizon && (
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Horizon</p>
                          <p className="text-lg font-semibold">{data.investmentRecommendation.investmentHorizon}</p>
                        </div>
                      )}
                      {data.investmentRecommendation?.suggestedTicket && (
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Ticket Suggéré</p>
                          <p className="text-lg font-semibold text-green-400">{data.investmentRecommendation.suggestedTicket}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {data.investmentRecommendation?.strengths && data.investmentRecommendation.strengths.length > 0 && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-green-400 mb-2">Forces</h4>
                          <ul className="space-y-1 text-sm">
                            {data.investmentRecommendation.strengths.map((s, i) => (
                              <li key={i} className="text-gray-300">• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {data.investmentRecommendation?.weaknesses && data.investmentRecommendation.weaknesses.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-red-400 mb-2">Faiblesses</h4>
                          <ul className="space-y-1 text-sm">
                            {data.investmentRecommendation.weaknesses.map((w, i) => (
                              <li key={i} className="text-gray-300">• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {data.investmentRecommendation?.keyQuestions && data.investmentRecommendation.keyQuestions.length > 0 && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-400 mb-2">Questions à Creuser</h4>
                        <ul className="space-y-1 text-sm">
                          {data.investmentRecommendation.keyQuestions.map((q, i) => (
                            <li key={i} className="text-gray-300">• {q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {data.investmentRecommendation?.suggestedNextSteps && data.investmentRecommendation.suggestedNextSteps.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Prochaines Étapes Suggérées</h4>
                        <ol className="space-y-2">
                          {data.investmentRecommendation.suggestedNextSteps.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {i + 1}
                              </span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sources Tab */}
              <TabsContent value="sources" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-gray-400" />
                        Toutes les Sources
                      </span>
                      <Badge variant="outline">{data.allSources?.length || 0} sources</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.dataQuality && (
                      <div className="mb-4 p-4 bg-gray-800/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Qualité des Données</span>
                          <Badge variant={
                            data.dataQuality.overallScore === "excellent" ? "default" :
                            data.dataQuality.overallScore === "good" ? "secondary" : "outline"
                          }>
                            {data.dataQuality.overallScore}
                          </Badge>
                        </div>
                        {data.dataQuality.limitations && data.dataQuality.limitations.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <p className="font-medium mb-1">Limitations:</p>
                            <ul>
                              {data.dataQuality.limitations.map((l, i) => (
                                <li key={i}>• {l}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {data.allSources?.map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{source.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                                {source.relevance && (
                                  <p className="text-xs text-gray-400 mt-1">{source.relevance}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {source.type && (
                                  <Badge variant="outline" className="text-xs">{source.type}</Badge>
                                )}
                                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Footer metadata */}
            {data.metadata && (
              <div className="text-center text-xs text-muted-foreground pt-6 border-t border-gray-700/50">
                <p>
                  Rapport généré le {new Date(data.metadata.generatedAt || "").toLocaleString("fr-FR")}
                  {data.metadata.searchResultsCount && ` • ${data.metadata.searchResultsCount} résultats de recherche analysés`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
