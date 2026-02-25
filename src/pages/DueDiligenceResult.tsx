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
  Link as LinkIcon,
  MessageCircle
} from "lucide-react";
import { AIQAChat } from "@/components/AIQAChat";

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
  const { trialRemaining, hasTrialRemaining, useTrialCredit } = useTrial();
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

    // Progress simulation (phase 1 = 0–45%, phase 2 = 45–90%)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const increment = Math.random() * 6 + 2;
        return Math.min(prev + increment, 90);
      });
    }, 600);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configuration Supabase manquante. Vérifiez les variables d'environnement.");
      }

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || supabaseKey}`,
        "apikey": supabaseKey,
      };

      // ——— Phase 1 : recherche (reste sous 150s côté serveur) ———
      setStatusMessage("Recherche d'informations (sources, financements, équipe…)…");
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
      const textSearch = await resSearch.text();
      let searchData: { jobId?: string; error?: string; searchResultsCount?: number } = {};
      try {
        searchData = textSearch ? JSON.parse(textSearch) : {};
      } catch {
        if (!resSearch.ok) throw new Error(textSearch || `Erreur ${resSearch.status}`);
      }
      if (!resSearch.ok) {
        throw new Error(searchData.error || `Erreur ${resSearch.status}`);
      }
      const jobId = searchData.jobId;
      if (!jobId) {
        throw new Error("Réponse recherche invalide (jobId manquant).");
      }
      setProgress(50);
      setStatusMessage("Analyse IA en cours (génération du rapport)…");

      // ——— Phase 2 : analyse IA ———
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 200_000);
      const resAnalyze = await fetch(`${supabaseUrl}/functions/v1/due-diligence`, {
        method: "POST",
        signal: controller2.signal,
        headers,
        body: JSON.stringify({ phase: "analyze", jobId }),
      });
      clearTimeout(timeout2);
      clearInterval(progressInterval);

      const text = await resAnalyze.text();
      let result: DueDiligenceData | null = null;
      let errorData: any = {};
      try {
        const parsed = text ? JSON.parse(text) : null;
        if (resAnalyze.ok) {
          result = parsed;
        } else {
          errorData = parsed || {};
          const isLikelyReport =
            parsed &&
            !parsed.error &&
            (parsed.company != null || parsed.executiveSummary != null);
          if ((resAnalyze.status === 546 || resAnalyze.status === 500) && isLikelyReport) {
            result = parsed;
          }
        }
      } catch {
        if (!resAnalyze.ok) {
          if (resAnalyze.status >= 500) {
            throw new Error(`Erreur serveur (${resAnalyze.status}). Le service est temporairement indisponible.`);
          } else if (resAnalyze.status === 429) {
            throw new Error("Trop de requêtes. Veuillez patienter avant de réessayer.");
          } else if (resAnalyze.status === 401 || resAnalyze.status === 403) {
            throw new Error("Erreur d'authentification. Veuillez vous reconnecter.");
          }
          throw new Error(`Erreur ${resAnalyze.status}`);
        }
      }

      if (!resAnalyze.ok && result == null) {
        if (resAnalyze.status === 504) {
          throw new Error("Timeout (504) : l'analyse a pris trop de temps. Réessayez dans quelques minutes ou avec une entreprise plus simple.");
        }
        throw new Error(errorData.error || errorData.message || `Erreur ${resAnalyze.status}`);
      }

      if (result == null) {
        throw new Error("Réponse serveur invalide.");
      }
      setData(deepStripSourceInText(result));
      setProgress(100);
      setStatusMessage("Rapport terminé !");

      if (typeof useTrialCredit === "function") {
        useTrialCredit();
      }

    } catch (err) {
      clearInterval(progressInterval);
      console.error("Due Diligence error:", err);
      
      let errorMessage = "Une erreur est survenue";
      
      // Timeout côté client (AbortController)
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (isAbort) {
        errorMessage = "L'analyse a pris trop de temps (timeout côté client). Le serveur peut être surchargé ou l'entreprise est très complexe.\n\nRéessayez dans quelques minutes ou choisissez une entreprise plus simple à analyser.";
      } else if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        
        // Détecter les erreurs CORS, réseau ou timeout (504 souvent affiché comme "Failed to fetch")
        if (errMsg.includes("failed to fetch") || errMsg.includes("networkerror") || errMsg.includes("cors")) {
          errorMessage = "Impossible de joindre le serveur (Failed to fetch). Causes fréquentes :\n\n• Timeout (504) : l'analyse a pris trop de temps. Réessayez dans un moment ou avec une entreprise plus simple.\n• Réseau ou serveur temporairement indisponible.\n• Problème de configuration côté hébergeur.\n\nVeuillez réessayer dans quelques minutes.";
        } else if (errMsg.includes("timeout") || errMsg.includes("timed out")) {
          errorMessage = "La requête a expiré. L'analyse prend du temps, veuillez réessayer.";
        } else if (errMsg.includes("429") || errMsg.includes("too many requests")) {
          errorMessage = "Trop de requêtes simultanées. Veuillez patienter quelques instants avant de réessayer.";
        } else if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("unauthorized")) {
          errorMessage = "Erreur d'authentification. Veuillez vous reconnecter.";
        } else if (errMsg.includes("500") || errMsg.includes("502") || errMsg.includes("503") || errMsg.includes("504")) {
          errorMessage = `Erreur serveur (${err.message}). Le service rencontre des difficultés. Veuillez réessayer dans quelques instants.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Erreur d'analyse",
        description: errorMessage.split('\n')[0], // Afficher seulement la première ligne dans le toast
        variant: "destructive",
        duration: 10000,
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

  // Éviter [object Object] : extraire une chaîne affichable depuis n'importe quelle valeur (string, number, object)
  const toDisplayString = (value: unknown): string => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(toDisplayString).filter(Boolean).join(", ") || "";
    if (typeof value === "object") {
      const o = value as Record<string, unknown>;
      const s = o.milestone ?? o.name ?? o.title ?? o.description ?? o.text ?? o.label ?? o.value ?? o.amount ?? o.round;
      if (s != null && typeof s === "string") return s;
      if (s != null) return String(s);
      try { return JSON.stringify(value).slice(0, 150); } catch { return ""; }
    }
    return String(value);
  };

  // Retirer TOUS les "(Source: ...)" du texte (même URLs avec parenthèses) — utilisé à l'affichage
  const stripInlineSources = (text: string | undefined | null): string => {
    if (!text || typeof text !== "string") return "";
    let s = text;
    let prev = "";
    while (prev !== s) {
      prev = s;
      const idx = s.toLowerCase().indexOf("(source:");
      if (idx === -1) break;
      const end = s.indexOf(")", idx);
      if (end === -1) break;
      s = (s.slice(0, idx).trimEnd() + " " + s.slice(end + 1).trimStart()).replace(/\s{2,}/g, " ").trim();
    }
    return s.replace(/\s{2,}/g, " ").trim();
  };

  // Nettoyer tout l'objet rapport à la réception (au cas où le backend n'a pas tout strippé)
  function deepStripSourceInText(obj: any): any {
    if (obj == null) return obj;
    if (typeof obj === "string") {
      let s = obj;
      if (s.startsWith("http")) return s;
      let prev = "";
      while (prev !== s) {
        prev = s;
        const idx = s.toLowerCase().indexOf("(source:");
        if (idx === -1) break;
        const end = s.indexOf(")", idx);
        if (end === -1) break;
        s = (s.slice(0, idx).trimEnd() + " " + s.slice(end + 1).trimStart()).replace(/\s{2,}/g, " ").trim();
      }
      return s.replace(/\s{2,}/g, " ").trim();
    }
    if (Array.isArray(obj)) return obj.map(deepStripSourceInText);
    if (typeof obj === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) {
        if (k === "sources" || k === "allSources") {
          out[k] = obj[k];
          continue;
        }
        out[k] = deepStripSourceInText(obj[k]);
      }
      return out;
    }
    return obj;
  }

  // Agrégat de toutes les sources (allSources + sections) pour affichage en bas de page
  const allSourcesAggregated = (() => {
    if (!data) return [];
    const byUrl = new Map<string, { name: string; url: string; type?: string; relevance?: string }>();
    const add = (s: { name?: string; url?: string; type?: string; relevance?: string } | null) => {
      if (!s?.url) return;
      if (byUrl.has(s.url)) return;
      byUrl.set(s.url, {
        name: s.name || shortenUrl(s.url),
        url: s.url,
        type: s.type,
        relevance: s.relevance,
      });
    };
    (data.allSources || []).forEach(add);
    [data.product?.sources, data.market?.sources, data.financials?.sources, data.team?.sources, data.competition?.sources, data.traction?.sources, data.risks?.sources, data.opportunities?.sources].forEach(arr => {
      (arr || []).forEach((s: { name?: string; url?: string }) => add(s));
    });
    return Array.from(byUrl.values());
  })();

  // Fonction pour raccourcir les URLs
  const shortenUrl = (url: string, maxLength: number = 40): string => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      const full = domain + path;
      
      if (full.length <= maxLength) return full;
      
      // Si le chemin est trop long, garder juste le domaine
      if (domain.length <= maxLength) return domain;
      
      // Sinon, tronquer le domaine
      return domain.substring(0, maxLength - 3) + '...';
    } catch {
      // Si ce n'est pas une URL valide, tronquer directement
      return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
    }
  };

  const SourceLink = ({ url, name }: { url?: string; name?: string }) => {
    if (!url) return null;
    const displayName = name || shortenUrl(url);
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 transition-all"
        title={url}
      >
        <LinkIcon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[120px]">{displayName}</span>
        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
      </a>
    );
  };

  /** Exporte l'intégralité du rapport (analyse + sources) en fichier Markdown */
  const exportFullReport = () => {
    if (!data) return;
    const companyName = data.company?.name || requestPayload?.companyName || "Rapport";
    const safeName = companyName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
    const date = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];

    const h1 = (t: string) => lines.push("\n# " + t + "\n");
    const h2 = (t: string) => lines.push("\n## " + t + "\n");
    const h3 = (t: string) => lines.push("\n### " + t + "\n");
    const p = (t: string) => { if (t) lines.push(stripInlineSources(t) + "\n"); };
    const li = (t: string) => { if (t) lines.push("- " + stripInlineSources(t)); };
    const src = (sources?: { name: string; url: string }[]) => {
      if (!sources?.length) return;
      lines.push("\n*Sources :*");
      sources.forEach((s) => lines.push(`- [${s.name || s.url}](${s.url})`));
      lines.push("");
    };

    h1(`Due Diligence — ${companyName}`);
    lines.push(`*Exporté le ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}*\n`);

    h2("Entreprise");
    p(data.company?.tagline);
    if (data.company?.website) lines.push(`- **Site :** ${data.company.website}`);
    if (data.company?.linkedinUrl) lines.push(`- **LinkedIn :** ${data.company.linkedinUrl}`);
    if (data.company?.founded) lines.push(`- **Fondée :** ${stripInlineSources(data.company.founded)}`);
    if (data.company?.headquarters) lines.push(`- **Siège :** ${stripInlineSources(data.company.headquarters)}`);
    if (data.company?.sector) lines.push(`- **Secteur :** ${stripInlineSources(data.company.sector)}`);
    if (data.company?.stage) lines.push(`- **Stage :** ${stripInlineSources(data.company.stage)}`);
    if (data.company?.employeeCount) lines.push(`- **Effectifs :** ${stripInlineSources(data.company.employeeCount)}`);
    lines.push("");

    h2("Résumé exécutif");
    p(data.executiveSummary?.overview);
    if (data.executiveSummary?.recommendation) lines.push(`**Recommandation :** ${stripInlineSources(data.executiveSummary.recommendation)}`);
    if (data.executiveSummary?.confidenceLevel) lines.push(`**Niveau de confiance :** ${stripInlineSources(data.executiveSummary.confidenceLevel)}`);
    if (data.executiveSummary?.keyHighlights?.length) { h3("Points forts"); data.executiveSummary.keyHighlights.forEach(li); }
    if (data.executiveSummary?.keyRisks?.length) { h3("Risques clés"); data.executiveSummary.keyRisks.forEach(li); }
    lines.push("");

    h2("Financements");
    p(data.financials?.totalFunding ? `**Financement total :** ${stripInlineSources(data.financials.totalFunding)}` : undefined);
    if (data.financials?.latestValuation) lines.push(`**Dernière valorisation :** ${stripInlineSources(data.financials.latestValuation)}`);
    if (data.financials?.fundingHistory?.length) {
      h3("Historique des levées");
      data.financials.fundingHistory.forEach((r) => {
        const parts = [r.round, r.amount, r.date].filter(Boolean).map((x) => stripInlineSources(String(x)));
        if (r.investors?.length) parts.push("Investisseurs : " + r.investors.map(stripInlineSources).join(", "));
        lines.push("- " + parts.join(" — "));
      });
    }
    if (data.financials?.metrics && Object.keys(data.financials.metrics).length) {
      h3("Métriques");
      Object.entries(data.financials.metrics).forEach(([k, v]) => lines.push(`- **${k} :** ${stripInlineSources(v)}`));
    }
    src(data.financials?.sources);

    h2("Produit");
    p(data.product?.description);
    if (data.product?.valueProposition) { h3("Proposition de valeur"); p(data.product.valueProposition); }
    if (data.product?.technology) { h3("Technologie"); p(data.product.technology); }
    if (data.product?.patents) { h3("Brevets"); p(data.product.patents); }
    if (data.product?.keyFeatures?.length) { h3("Fonctionnalités clés"); data.product.keyFeatures.forEach(li); }
    src(data.product?.sources);

    h2("Marché");
    if (data.market?.tam) lines.push(`- **TAM :** ${stripInlineSources(data.market.tam)}`);
    if (data.market?.sam) lines.push(`- **SAM :** ${stripInlineSources(data.market.sam)}`);
    if (data.market?.som) lines.push(`- **SOM :** ${stripInlineSources(data.market.som)}`);
    if (data.market?.cagr) lines.push(`- **CAGR :** ${stripInlineSources(data.market.cagr)}`);
    if (data.market?.trends?.length) { h3("Tendances"); data.market.trends.forEach(li); }
    p(data.market?.analysis);
    src(data.market?.sources);

    h2("Équipe");
    p(data.team?.overview);
    if (data.team?.teamSize) lines.push(`**Taille :** ${stripInlineSources(data.team.teamSize)}`);
    if (data.team?.founders?.length) {
      h3("Fondateurs");
      data.team.founders.forEach((f) => {
        lines.push(`- **${stripInlineSources(f.name || "")}** — ${stripInlineSources(f.role || "")}`);
        if (f.background) p(f.background);
        if (f.linkedin) lines.push(`  LinkedIn : ${f.linkedin}`);
      });
    }
    if (data.team?.keyExecutives?.length) {
      h3("Dirigeants clés");
      data.team.keyExecutives.forEach((e) => lines.push(`- **${stripInlineSources(e.name || "")}** — ${stripInlineSources(e.role || "")} — ${stripInlineSources(e.background || "")}`));
    }
    if (data.team?.culture) { h3("Culture"); p(data.team.culture); }
    if (data.team?.hiringTrends) { h3("Recrutement"); p(data.team.hiringTrends); }
    src(data.team?.sources);

    h2("Concurrence");
    p(data.competition?.landscape);
    if (data.competition?.competitiveAdvantage) { h3("Avantage concurrentiel"); p(data.competition.competitiveAdvantage); }
    if (data.competition?.moat) { h3("Moat"); p(data.competition.moat); }
    if (data.competition?.competitors?.length) {
      h3("Concurrents");
      data.competition.competitors.forEach((c) => {
        lines.push(`- **${stripInlineSources(c.name)}**${c.funding ? ` — ${stripInlineSources(c.funding)}` : ""}`);
        if (c.description) p("  " + c.description);
      });
    }
    src(data.competition?.sources);

    h2("Traction & Jalons");
    p(data.traction?.overview);
    if (data.traction?.customers) {
      const c = data.traction.customers;
      if (c.count) lines.push(`- **Clients :** ${stripInlineSources(c.count)}`);
      if (c.notable?.length) lines.push(`- **Clients notables :** ${c.notable.map(stripInlineSources).join(", ")}`);
      if (c.segments) lines.push(`- **Segments :** ${stripInlineSources(c.segments)}`);
    }
    if (data.traction?.keyMilestones?.length) {
      h3("Jalons clés");
      data.traction.keyMilestones.forEach((m) => lines.push(`- ${stripInlineSources(m.date || "")} — ${stripInlineSources(m.milestone || "")}`));
    }
    if (data.traction?.partnerships?.length) { h3("Partenariats"); data.traction.partnerships.forEach(li); }
    if (data.traction?.awards?.length) { h3("Prix / Récompenses"); data.traction.awards.forEach(li); }
    src(data.traction?.sources);

    h2("Risques");
    (["marketRisks", "executionRisks", "financialRisks", "competitiveRisks", "regulatoryRisks"] as const).forEach((key) => {
      const arr = data.risks?.[key];
      if (Array.isArray(arr) && arr.length) {
        h3(key.replace(/([A-Z])/g, " $1").trim());
        (arr as string[]).forEach(li);
      }
    });
    if (data.risks?.mitigations?.length) { h3("Mitigations"); data.risks.mitigations.forEach(li); }
    if (data.risks?.overallRiskLevel) lines.push(`**Niveau de risque global :** ${stripInlineSources(data.risks.overallRiskLevel)}`);
    src(data.risks?.sources);

    if (data.opportunities) {
      h2("Opportunités");
      if (data.opportunities.growthOpportunities?.length) { h3("Croissance"); data.opportunities.growthOpportunities.forEach(li); }
      p(data.opportunities.marketExpansion ? "**Expansion marché :** " + stripInlineSources(data.opportunities.marketExpansion) : undefined);
      p(data.opportunities.productExpansion ? "**Expansion produit :** " + stripInlineSources(data.opportunities.productExpansion) : undefined);
      p(data.opportunities.strategicValue);
      src(data.opportunities.sources);
    }

    h2("Recommandation d'investissement");
    const rec = data.investmentRecommendation;
    if (rec?.recommendation) lines.push(`**Recommandation :** ${stripInlineSources(rec.recommendation)}`);
    if (rec?.rationale) p(rec.rationale);
    if (rec?.strengths?.length) { h3("Points forts"); rec.strengths.forEach(li); }
    if (rec?.weaknesses?.length) { h3("Points faibles"); rec.weaknesses.forEach(li); }
    if (rec?.keyQuestions?.length) { h3("Questions clés"); rec.keyQuestions.forEach(li); }
    if (rec?.suggestedNextSteps?.length) { h3("Prochaines étapes"); rec.suggestedNextSteps.forEach(li); }
    if (rec?.targetReturn) lines.push(`- **Rendement cible :** ${stripInlineSources(rec.targetReturn)}`);
    if (rec?.investmentHorizon) lines.push(`- **Horizon :** ${stripInlineSources(rec.investmentHorizon)}`);
    if (rec?.suggestedTicket) lines.push(`- **Ticket suggéré :** ${stripInlineSources(rec.suggestedTicket)}`);
    lines.push("");

    h2("Toutes les sources du rapport");
    lines.push(`*${allSourcesAggregated.length} source(s) utilisée(s) pour cette analyse.*\n`);
    (allSourcesAggregated.length > 0 ? allSourcesAggregated : (data.allSources || [])).forEach((s, i) => {
      if (s?.url) lines.push(`${i + 1}. [${s.name || s.url}](${s.url})`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Due-Diligence-${safeName}-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export effectué", description: "Le rapport complet a été téléchargé (Markdown).", variant: "default" });
  };

  // Composant pour afficher les sources en bas de section
  const SourcesFooter = ({ sources }: { sources?: { name: string; url: string }[] }) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="mt-6 pt-4 border-t border-gray-700/30">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sources</span>
          <span className="text-xs text-muted-foreground/60">({sources.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((s, i) => (
            <SourceLink key={i} url={s.url} name={s.name} />
          ))}
        </div>
      </div>
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
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-full overflow-x-hidden px-4 md:px-6" data-page="due-diligence-result">
        <nav aria-label="Fil d'Ariane" className="lg:col-span-12 flex items-center gap-2 text-sm text-foreground/80 mb-6 min-w-0 overflow-x-auto py-1">
          <Link to="/" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Accueil</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <Link to="/due-diligence" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Due Diligence</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <span className="text-foreground font-medium truncate min-w-0">
            {requestPayload?.companyName || "Résultat"}
          </span>
        </nav>

        {/* Loading State */}
        {loading && (
          <div className="lg:col-span-12">
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
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="lg:col-span-12">
          <Card className="bg-card/80 border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                Erreur d'analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{error}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Solutions possibles :</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Vérifiez votre connexion internet</li>
                  <li>Attendez quelques instants et réessayez</li>
                  <li>Vérifiez que les clés API sont correctement configurées</li>
                  <li>Contactez le support si le problème persiste</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={fetchDueDiligence} variant="default" className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Réessayer
                </Button>
                <Button onClick={() => navigate("/due-diligence")} variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Nouvelle analyse
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Results */}
        {!loading && !error && data && (
          <>
          {/* Sidebar — style Analyse */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:col-start-1 lg:row-start-2 order-2 lg:order-1">
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/due-diligence"
                className="inline-flex items-center justify-center gap-1.5 text-sm text-foreground/70 hover:text-primary transition-all duration-300 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-primary/40 backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Nouvelle analyse
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={exportFullReport}
                className="gap-1.5 border-gray-600 hover:border-primary/50 text-foreground/90"
              >
                <Download className="w-4 h-4" />
                Exporter le rapport
              </Button>
            </div>
            <Card className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm p-5 space-y-3 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground">{data.company?.name || requestPayload?.companyName}</h3>
              <div className="flex flex-wrap gap-2">
                {getRecommendationBadge(data.executiveSummary?.recommendation)}
                {data.company?.sector && <Badge variant="outline" className="text-xs font-normal">{stripInlineSources(data.company.sector)}</Badge>}
                {data.company?.stage && <Badge variant="secondary" className="text-xs">{stripInlineSources(data.company.stage)}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
                {data.company?.website && (
                  <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50 text-xs">
                    <a href={data.company.website} target="_blank" rel="noopener noreferrer"><Globe className="w-3 h-3 mr-1" /> Site</a>
                  </Button>
                )}
                {data.company?.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50 text-xs">
                    <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="w-3 h-3 mr-1" /> LinkedIn</a>
                  </Button>
                )}
              </div>
            </Card>
            {/* Sources du rapport — toujours visible dans la sidebar */}
            {allSourcesAggregated.length > 0 && (
              <Card className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
                <CardHeader className="pb-2 border-b border-gray-700/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    Sources du rapport
                    <Badge variant="outline" className="text-xs font-normal">{allSourcesAggregated.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-3">
                  <ScrollArea className="h-[280px] w-full pr-3">
                    <div className="flex flex-col gap-1.5">
                      {allSourcesAggregated.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/50 hover:bg-primary/20 border border-gray-700/50 hover:border-primary/40 text-foreground/90 hover:text-primary transition-all truncate"
                          title={source.url}
                        >
                          <LinkIcon className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1 min-w-0">{source.name}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                        </a>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </aside>

          <div className="lg:col-span-8 xl:col-span-9 lg:row-start-2 min-w-0 max-w-full overflow-x-hidden space-y-8 order-1 lg:order-2">
            <h1 className="text-2xl md:text-3xl font-bold break-words bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Due Diligence — {data.company?.name || requestPayload?.companyName}
            </h1>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    {data.company?.name || requestPayload?.companyName}
                  </h2>
                  {getRecommendationBadge(data.executiveSummary?.recommendation)}
                </div>
                {data.company?.tagline && (
                  <p className="text-muted-foreground leading-relaxed max-w-2xl">
                    {stripInlineSources(data.company.tagline)}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {data.company?.sector && (
                    <Badge variant="outline" className="font-normal">{stripInlineSources(data.company.sector)}</Badge>
                  )}
                  {data.company?.stage && (
                    <Badge variant="secondary">{stripInlineSources(data.company.stage)}</Badge>
                  )}
                  {data.company?.headquarters && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {stripInlineSources(data.company.headquarters)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={exportFullReport}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4" />
                  Exporter le rapport
                </Button>
                {data.company?.website && (
                  <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50">
                    <a href={data.company.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Site web
                    </a>
                  </Button>
                )}
                {data.company?.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50">
                    <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Executive Summary Card */}
            <Card className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-b border-amber-500/20">
                <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
                  <FileSearch className="w-5 h-5" />
                  Résumé Exécutif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <p className="text-foreground/90 leading-relaxed">
                  {stripInlineSources(data.executiveSummary?.overview)}
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  {/* Key Highlights */}
                  {data.executiveSummary?.keyHighlights && data.executiveSummary.keyHighlights.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Points Forts
                      </h4>
                      <ul className="space-y-2">
                        {data.executiveSummary.keyHighlights.map((h, i) => (
                          <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                            {stripInlineSources(h)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Key Risks */}
                  {data.executiveSummary?.keyRisks && data.executiveSummary.keyRisks.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Risques Clés
                      </h4>
                      <ul className="space-y-2">
                        {data.executiveSummary.keyRisks.map((r, i) => (
                          <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-red-500 flex-shrink-0" />
                            {stripInlineSources(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Export bar — toujours visible au-dessus des onglets */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
              <span className="text-sm font-medium text-foreground">Exporter l&apos;analyse complète (rapport + sources)</span>
              <Button
                variant="default"
                size="sm"
                onClick={exportFullReport}
                className="gap-2 bg-primary hover:bg-primary/90 shrink-0"
              >
                <Download className="w-4 h-4" />
                Exporter en texte (.md)
              </Button>
            </div>

            {/* Tabs for detailed sections — style aligné Analyse */}
            <Tabs defaultValue="financials" className="w-full">
              <TabsList className="w-full flex flex-wrap justify-start gap-1.5 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-1.5 h-auto shadow-lg">
                <TabsTrigger value="financials" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                  Financements
                </TabsTrigger>
                <TabsTrigger value="product" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <Target className="w-3.5 h-3.5 mr-1.5" />
                  Produit
                </TabsTrigger>
                <TabsTrigger value="market" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  Marché
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Équipe
                </TabsTrigger>
                <TabsTrigger value="competition" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  Concurrence
                </TabsTrigger>
                <TabsTrigger value="traction" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  Traction
                </TabsTrigger>
                <TabsTrigger value="risks" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Risques
                </TabsTrigger>
                <TabsTrigger value="recommendation" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                  Recommandation
                </TabsTrigger>
                <TabsTrigger value="sources" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                  Sources
                </TabsTrigger>
                <TabsTrigger value="assistant" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground">
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Assistant IA
                </TabsTrigger>
              </TabsList>

              {/* Financials Tab */}
              <TabsContent value="financials" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Financements & Métriques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    {/* Summary metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Total Levé</p>
                        <p className="text-xl font-bold text-green-400">
                          {data.financials?.totalFunding || "N/A"}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Valorisation</p>
                        <p className="text-xl font-bold text-amber-400">
                          {data.financials?.latestValuation || "N/A"}
                        </p>
                      </div>
                      {data.financials?.metrics?.arr && (
                        <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                          <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">ARR</p>
                          <p className="text-xl font-bold">{data.financials.metrics.arr}</p>
                        </div>
                      )}
                      {data.financials?.metrics?.customers && (
                        <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                          <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Clients</p>
                          <p className="text-xl font-bold">{data.financials.metrics.customers}</p>
                        </div>
                      )}
                    </div>

                    {/* Funding History */}
                    {data.financials?.fundingHistory && data.financials.fundingHistory.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-4 text-base">Historique des Levées</h4>
                        <div className="space-y-3">
                          {data.financials.fundingHistory.map((round, i) => (
                            <div key={i} className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-lg p-4 border border-gray-700/40 hover:border-green-500/30 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">{round.round}</Badge>
                                  <span className="text-lg font-bold text-green-400">{round.amount}</span>
                                </div>
                                {round.date && <span className="text-xs text-muted-foreground bg-gray-800/50 px-2 py-1 rounded">{round.date}</span>}
                              </div>
                              {round.valuation && (
                                <p className="text-sm text-amber-400 mb-2 font-medium">Valorisation: {round.valuation}</p>
                              )}
                              {round.investors && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-gray-300">Investisseurs:</span> {Array.isArray(round.investors) ? round.investors.join(", ") : (typeof round.investors === "string" ? round.investors : String(round.investors ?? ""))}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other metrics */}
                    {data.financials?.metrics && (
                      <div>
                        <h4 className="font-semibold mb-4 text-base">Métriques Détaillées</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(data.financials.metrics).map(([key, value]) => (
                            <div key={key} className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-lg p-3 border border-gray-700/30">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-sm font-semibold text-gray-200">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources */}
                    <SourcesFooter sources={data.financials?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Product Tab */}
              <TabsContent value="product" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-blue-400" />
                      Produit & Technologie
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
                    {data.product?.description && (
                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-foreground/90 leading-relaxed">{stripInlineSources(data.product.description)}</p>
                      </div>
                    )}
                    {data.product?.valueProposition && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-400 mb-2">Proposition de Valeur</h4>
                        <p className="text-foreground/90">{stripInlineSources(data.product.valueProposition)}</p>
                      </div>
                    )}
                    {data.product?.technology && (
                      <div>
                        <h4 className="font-semibold mb-2">Technologie</h4>
                        <p className="text-foreground/90">{stripInlineSources(data.product.technology)}</p>
                      </div>
                    )}
                    {data.product?.keyFeatures && data.product.keyFeatures.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Fonctionnalités Clés</h4>
                        <div className="flex flex-wrap gap-2">
                          {data.product.keyFeatures.map((f, i) => (
                            <Badge key={i} variant="secondary">{stripInlineSources(f)}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Sources */}
                    <SourcesFooter sources={data.product?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Market Tab */}
              <TabsContent value="market" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      Analyse du Marché
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
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
                        <p className="text-foreground/90 leading-relaxed">{stripInlineSources(data.market.analysis)}</p>
                      </div>
                    )}
                    
                    {data.market?.trends && data.market.trends.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Tendances</h4>
                        <ul className="space-y-1">
                          {data.market.trends.map((t, i) => (
                            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                              <TrendingUp className="w-3 h-3 mt-1 text-purple-400 flex-shrink-0" />
                              {stripInlineSources(t)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Sources */}
                    <SourcesFooter sources={data.market?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-cyan-400" />
                      Équipe & Fondateurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
                    {data.team?.overview && (
                      <p className="text-foreground/90 leading-relaxed">{stripInlineSources(data.team.overview)}</p>
                    )}
                    
                    {data.team?.teamSize && (
                      <div className="bg-cyan-500/10 rounded-lg p-3 inline-block">
                        <p className="text-sm"><strong>Taille de l'équipe:</strong> {stripInlineSources(data.team.teamSize)}</p>
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
                    {/* Sources */}
                    <SourcesFooter sources={data.team?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Competition Tab */}
              <TabsContent value="competition" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5 text-orange-400" />
                      Analyse Concurrentielle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
                    {data.competition?.landscape && (
                      <p className="text-foreground/90 leading-relaxed">{stripInlineSources(data.competition.landscape)}</p>
                    )}
                    
                    {data.competition?.competitiveAdvantage && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-400 mb-2">Avantage Concurrentiel</h4>
                        <p className="text-foreground/90">{stripInlineSources(data.competition.competitiveAdvantage)}</p>
                      </div>
                    )}
                    
                    {data.competition?.moat && (
                      <div>
                        <h4 className="font-semibold mb-2">Moat</h4>
                        <p className="text-foreground/90">{stripInlineSources(data.competition.moat)}</p>
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
                                {Array.isArray(c.strengths) && c.strengths.length > 0 && (
                                  <div>
                                    <p className="text-green-400 font-medium mb-1">Forces:</p>
                                    <ul className="text-gray-400">
                                      {c.strengths.map((s, j) => <li key={j}>• {s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(c.weaknesses) && c.weaknesses.length > 0 && (
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
                    {/* Sources */}
                    <SourcesFooter sources={data.competition?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Traction Tab */}
              <TabsContent value="traction" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Traction & Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
                    {data.traction?.overview && (
                      <p className="text-foreground/90 leading-relaxed">{stripInlineSources(data.traction.overview)}</p>
                    )}
                    
                    {data.traction?.customers && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {data.traction.customers.count && (
                          <div className="bg-green-500/10 rounded-lg p-4">
                            <p className="text-xs text-muted-foreground mb-1">Clients</p>
                            <p className="text-xl font-semibold text-green-400">{data.traction.customers.count}</p>
                          </div>
                        )}
                        {(() => {
                          const notable = data.traction?.customers?.notable;
                          const list = Array.isArray(notable) ? notable : (typeof notable === "string" ? [notable] : []);
                          if (list.length === 0) return null;
                          return (
                            <div className="bg-gray-800/30 rounded-lg p-4">
                              <p className="text-xs text-muted-foreground mb-2">Clients Notables</p>
                              <div className="flex flex-wrap gap-2">
                                {list.map((c, i) => (
                                  <Badge key={i} variant="secondary">{toDisplayString(c)}</Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {(() => {
                      const km = data.traction?.keyMilestones;
                      const list = Array.isArray(km) ? km : [];
                      if (list.length === 0) return null;
                      return (
                        <div>
                          <h4 className="font-semibold mb-3">Milestones Clés</h4>
                          <div className="space-y-2">
                            {list.map((m, i) => (
                              <div key={i} className="flex items-start gap-3 bg-gray-800/20 rounded-lg p-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-300">{stripInlineSources(toDisplayString(m?.milestone))}</p>
                                  {m?.date && <p className="text-xs text-muted-foreground mt-1">{m.date}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {(() => {
                      const p = data.traction?.partnerships;
                      const list = Array.isArray(p) ? p : (typeof p === "string" ? [p] : []);
                      if (list.length === 0) return null;
                      return (
                        <div>
                          <h4 className="font-semibold mb-2">Partenariats</h4>
                          <div className="flex flex-wrap gap-2">
                            {list.map((item, i) => (
                              <Badge key={i} variant="outline">{toDisplayString(item)}</Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {(() => {
                      const aw = data.traction?.awards;
                      const list = Array.isArray(aw) ? aw : (typeof aw === "string" ? [aw] : []);
                      if (list.length === 0) return null;
                      return (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            Récompenses
                          </h4>
                          <ul className="space-y-1">
                            {list.map((a, i) => (
                              <li key={i} className="text-sm text-gray-300">• {toDisplayString(a)}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                    {/* Sources */}
                    <SourcesFooter sources={data.traction?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Risks Tab */}
              <TabsContent value="risks" className="mt-4">
                <Card className="bg-card/80 border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Analyse des Risques
                      </span>
                      {getRiskBadge(data.risks?.overallRiskLevel)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
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
                    {/* Sources */}
                    <SourcesFooter sources={data.risks?.sources} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recommendation Tab */}
              <TabsContent value="recommendation" className="mt-4">
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        Recommandation d'Investissement
                      </span>
                      {getRecommendationBadge(data.investmentRecommendation?.recommendation)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
                    {data.investmentRecommendation?.rationale && (
                      <div>
                        <h4 className="font-semibold mb-2">Justification</h4>
                        <p className="text-foreground/90 leading-relaxed">{stripInlineSources(data.investmentRecommendation.rationale)}</p>
                      </div>
                    )}
                    
                    <div className="grid md:grid-cols-3 gap-4 my-4">
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Multiple Cible</p>
                        <p className="text-lg font-semibold text-amber-400">{toDisplayString(data.investmentRecommendation?.targetReturn) || "Non disponible"}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Horizon</p>
                        <p className="text-lg font-semibold">{toDisplayString(data.investmentRecommendation?.investmentHorizon) || "Non disponible"}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Ticket Suggéré</p>
                        <p className="text-lg font-semibold text-green-400">{toDisplayString(data.investmentRecommendation?.suggestedTicket) || "Non disponible"}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {Array.isArray(data.investmentRecommendation?.strengths) && data.investmentRecommendation.strengths.length > 0 && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-green-400 mb-2">Forces</h4>
                          <ul className="space-y-1 text-sm">
                            {data.investmentRecommendation.strengths.map((s, i) => (
                              <li key={i} className="text-gray-300">• {toDisplayString(s)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {Array.isArray(data.investmentRecommendation?.weaknesses) && data.investmentRecommendation.weaknesses.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                          <h4 className="font-semibold text-red-400 mb-2">Faiblesses</h4>
                          <ul className="space-y-1 text-sm">
                            {data.investmentRecommendation.weaknesses.map((w, i) => (
                              <li key={i} className="text-gray-300">• {toDisplayString(w)}</li>
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
                            <li key={i} className="text-gray-300">• {toDisplayString(q)}</li>
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
                              {toDisplayString(s)}
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
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-gray-400" />
                        Toutes les Sources
                      </span>
                      <Badge variant="outline" className="text-xs">{allSourcesAggregated.length || data.allSources?.length || 0} sources</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {data.dataQuality && (
                      <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-200">Qualité des Données</span>
                          <Badge variant={
                            data.dataQuality.overallScore === "excellent" ? "default" :
                            data.dataQuality.overallScore === "good" ? "secondary" : "outline"
                          } className="text-xs">
                            {data.dataQuality.overallScore}
                          </Badge>
                        </div>
                        {data.dataQuality.limitations && data.dataQuality.limitations.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-gray-700/30">
                            <p className="font-medium mb-2 text-gray-300">Limitations:</p>
                            <ul className="space-y-1">
                              {data.dataQuality.limitations.map((l, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground/60 mt-0.5">•</span>
                                  <span>{l}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-2">
                        {(allSourcesAggregated.length > 0 ? allSourcesAggregated : data.allSources || []).filter((s) => !!s?.url).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 border border-gray-700/30 hover:border-amber-500/30 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-gray-200 group-hover:text-amber-400 transition-colors truncate">
                                    {source.name}
                                  </p>
                                  {source.type && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                                      {source.type}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate" title={source.url}>
                                  {source.url ? shortenUrl(source.url, 60) : ""}
                                </p>
                                {source.relevance && (
                                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{source.relevance}</p>
                                )}
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors flex-shrink-0 mt-0.5" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Assistant IA — approfondir des points du rapport */}
              <TabsContent value="assistant" className="mt-4">
                <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm overflow-hidden w-full shadow-lg">
                  <div className="h-[580px] overflow-hidden w-full">
                    <AIQAChat
                      startupData={{
                        name: data.company?.name || requestPayload?.companyName || "",
                        sector: data.company?.sector,
                        stage: data.company?.stage,
                        location: data.company?.headquarters,
                        founded: data.company?.founded,
                        teamSize: data.company?.employeeCount,
                      }}
                      dueDiligenceData={data}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Bloc Sources en bas de page — liens cliquables, toujours visible */}
            <section id="sources-du-rapport" aria-label="Sources du rapport">
            {allSourcesAggregated.length > 0 ? (
              <Card className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
                <CardHeader className="pb-3 border-b border-gray-700/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    Sources du rapport
                    <Badge variant="outline" className="ml-2 text-xs font-normal">
                      {allSourcesAggregated.length} source{allSourcesAggregated.length > 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toutes les sources utilisées pour cette analyse, en un seul endroit.
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {allSourcesAggregated.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-800/50 hover:bg-primary/20 border border-gray-700/50 hover:border-primary/40 text-foreground/90 hover:text-primary transition-all"
                        title={source.url}
                      >
                        <LinkIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{source.name}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-xl border border-gray-700/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                    <LinkIcon className="w-4 h-4" />
                    Sources du rapport
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground">Aucune source listée pour ce rapport.</p>
                </CardContent>
              </Card>
            )}
            </section>

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
          </>
        )}
      </div>
    </AppLayout>
  );
}
