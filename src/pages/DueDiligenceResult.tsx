import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { useTrial } from "@/hooks/useTrial";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
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
import { InvestmentMemo } from "@/components/InvestmentMemo";

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
    // Rapport déjà généré par le pipeline auto : affichage direct, aucun appel
    // API (la DD a déjà été payée pendant les étapes 4-5 du pipeline).
    if (requestPayload?.preloadedResult) {
      setData(requestPayload.preloadedResult as DueDiligenceData);
      setProgress(100);
      setLoading(false);
      return;
    }

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
      // Wrap the analyze fetch in a retry loop for Gemini transient 503 ("model overloaded").
      // Backend already retries 3x with backoff; this gives one more attempt after a longer wait.
      let resAnalyze: Response;
      let analyzeAttempt = 0;
      const MAX_ANALYZE_ATTEMPTS = 2;
      while (true) {
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
        // Retry on 503 (model overloaded) — Gemini spikes are usually short-lived
        if (resAnalyze.status === 503 && analyzeAttempt < MAX_ANALYZE_ATTEMPTS) {
          setStatusMessage(`Modèle IA surchargé — nouvelle tentative dans 20s (essai ${analyzeAttempt + 1}/${MAX_ANALYZE_ATTEMPTS})…`);
          await new Promise((r) => setTimeout(r, 20_000));
          continue;
        }
        break;
      }
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

  // Safely convert any value to an array (AI sometimes returns string instead of array)
  const toArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    if (typeof value === 'string' && value.trim()) return [value];
    return [];
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
    if (toArray(data.executiveSummary?.keyHighlights).length) { h3("Points forts"); toArray(data.executiveSummary?.keyHighlights).forEach(li); }
    if (toArray(data.executiveSummary?.keyRisks).length) { h3("Risques clés"); toArray(data.executiveSummary?.keyRisks).forEach(li); }
    lines.push("");

    h2("Financements");
    p(data.financials?.totalFunding ? `**Financement total :** ${stripInlineSources(data.financials.totalFunding)}` : undefined);
    if (data.financials?.latestValuation) lines.push(`**Dernière valorisation :** ${stripInlineSources(data.financials.latestValuation)}`);
    if (toArray(data.financials?.fundingHistory).length) {
      h3("Historique des levées");
      toArray(data.financials?.fundingHistory).forEach((r) => {
        const parts = [r.round, r.amount, r.date].filter(Boolean).map((x) => stripInlineSources(String(x)));
        if (toArray(r.investors).length) parts.push("Investisseurs : " + toArray(r.investors).map((inv) => stripInlineSources(toDisplayString(inv))).join(", "));
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
    if (toArray(data.product?.keyFeatures).length) { h3("Fonctionnalités clés"); toArray(data.product?.keyFeatures).forEach(li); }
    src(data.product?.sources);

    h2("Marché");
    if (data.market?.tam) lines.push(`- **TAM :** ${stripInlineSources(data.market.tam)}`);
    if (data.market?.sam) lines.push(`- **SAM :** ${stripInlineSources(data.market.sam)}`);
    if (data.market?.som) lines.push(`- **SOM :** ${stripInlineSources(data.market.som)}`);
    if (data.market?.cagr) lines.push(`- **CAGR :** ${stripInlineSources(data.market.cagr)}`);
    if (toArray(data.market?.trends).length) { h3("Tendances"); toArray(data.market?.trends).forEach(li); }
    p(data.market?.analysis);
    src(data.market?.sources);

    h2("Équipe");
    p(data.team?.overview);
    if (data.team?.teamSize) lines.push(`**Taille :** ${stripInlineSources(data.team.teamSize)}`);
    if (toArray(data.team?.founders).length) {
      h3("Fondateurs");
      toArray(data.team?.founders).forEach((f) => {
        lines.push(`- **${stripInlineSources(f.name || "")}** — ${stripInlineSources(f.role || "")}`);
        if (f.background) p(f.background);
        if (f.linkedin) lines.push(`  LinkedIn : ${f.linkedin}`);
      });
    }
    if (toArray(data.team?.keyExecutives).length) {
      h3("Dirigeants clés");
      toArray(data.team?.keyExecutives).forEach((e) => lines.push(`- **${stripInlineSources(e.name || "")}** — ${stripInlineSources(e.role || "")} — ${stripInlineSources(e.background || "")}`));
    }
    if (data.team?.culture) { h3("Culture"); p(data.team.culture); }
    if (data.team?.hiringTrends) { h3("Recrutement"); p(data.team.hiringTrends); }
    src(data.team?.sources);

    h2("Concurrence");
    p(data.competition?.landscape);
    if (data.competition?.competitiveAdvantage) { h3("Avantage concurrentiel"); p(data.competition.competitiveAdvantage); }
    if (data.competition?.moat) { h3("Moat"); p(data.competition.moat); }
    if (toArray(data.competition?.competitors).length) {
      h3("Concurrents");
      toArray(data.competition?.competitors).forEach((c) => {
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
      if (toArray(c.notable).length) lines.push(`- **Clients notables :** ${toArray(c.notable).map((n) => stripInlineSources(toDisplayString(n))).join(", ")}`);
      if (c.segments) lines.push(`- **Segments :** ${stripInlineSources(c.segments)}`);
    }
    if (toArray(data.traction?.keyMilestones).length) {
      h3("Jalons clés");
      toArray(data.traction?.keyMilestones).forEach((m) => lines.push(`- ${stripInlineSources(m.date || "")} — ${stripInlineSources(m.milestone || "")}`));
    }
    if (toArray(data.traction?.partnerships).length) { h3("Partenariats"); toArray(data.traction?.partnerships).forEach(li); }
    if (toArray(data.traction?.awards).length) { h3("Prix / Récompenses"); toArray(data.traction?.awards).forEach(li); }
    src(data.traction?.sources);

    h2("Risques");
    (["marketRisks", "executionRisks", "financialRisks", "competitiveRisks", "regulatoryRisks"] as const).forEach((key) => {
      const arr = data.risks?.[key];
      if (Array.isArray(arr) && arr.length) {
        h3(key.replace(/([A-Z])/g, " $1").trim());
        (arr as string[]).forEach(li);
      }
    });
    if (toArray(data.risks?.mitigations).length) { h3("Mitigations"); toArray(data.risks?.mitigations).forEach(li); }
    if (data.risks?.overallRiskLevel) lines.push(`**Niveau de risque global :** ${stripInlineSources(data.risks.overallRiskLevel)}`);
    src(data.risks?.sources);

    if (data.opportunities) {
      h2("Opportunités");
      if (toArray(data.opportunities?.growthOpportunities).length) { h3("Croissance"); toArray(data.opportunities?.growthOpportunities).forEach(li); }
      p(data.opportunities.marketExpansion ? "**Expansion marché :** " + stripInlineSources(data.opportunities.marketExpansion) : undefined);
      p(data.opportunities.productExpansion ? "**Expansion produit :** " + stripInlineSources(data.opportunities.productExpansion) : undefined);
      p(data.opportunities.strategicValue);
      src(data.opportunities.sources);
    }

    h2("Recommandation d'investissement");
    const rec = data.investmentRecommendation;
    if (rec?.recommendation) lines.push(`**Recommandation :** ${stripInlineSources(rec.recommendation)}`);
    if (rec?.rationale) p(rec.rationale);
    if (toArray(rec?.strengths).length) { h3("Points forts"); toArray(rec?.strengths).forEach(li); }
    if (toArray(rec?.weaknesses).length) { h3("Points faibles"); toArray(rec?.weaknesses).forEach(li); }
    if (toArray(rec?.keyQuestions).length) { h3("Questions clés"); toArray(rec?.keyQuestions).forEach(li); }
    if (toArray(rec?.suggestedNextSteps).length) { h3("Prochaines étapes"); toArray(rec?.suggestedNextSteps).forEach(li); }
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

  /** Exporte le rapport en PDF mis en forme (inclut le comité d'investissement). */
  const exportPdf = () => {
    if (!data) return;
    const companyName = data.company?.name || requestPayload?.companyName || "Rapport";
    const safeName = companyName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
    const date = new Date().toISOString().slice(0, 10);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const M = 48;
    const CW = PAGE_W - 2 * M;
    const INK: [number, number, number] = [17, 24, 39];
    const MUTED: [number, number, number] = [110, 116, 129];
    const ACCENT: [number, number, number] = [37, 99, 235];
    let y = M;
    let page = 1;

    // jsPDF (Helvetica/WinAnsi) ne rend pas les caractères hors Latin-1 (guillemets
    // courbes, fleches, symboles math, …) -> charabia/pavés. On les convertit en
    // ASCII puis on retire le reste hors Latin-1 (les accents é/è/à sont conservés).
    const pdfSafe = (s: string) => s
      .replace(/[‘’‚′‵]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/[–—−]/g, "-")
      .replace(/…/g, "...")
      .replace(/→/g, " -> ").replace(/←/g, " <- ").replace(/⇒/g, " => ")
      .replace(/≠/g, "!=").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≈/g, "~")
      .replace(/[•●▪‣]/g, "-")
      .replace(/[   ​]/g, " ")
      .replace(/œ/g, "oe").replace(/Œ/g, "OE")
      .replace(/[^ -ÿ]/g, "")
      .replace(/\s{2,}/g, " ");
    const clean = (t: unknown) => pdfSafe(stripInlineSources(String(t ?? "")).replace(/\s+/g, " ").trim());
    const addFooter = () => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(`${clean(companyName)} · Due Diligence`, M, PAGE_H - 24);
      doc.text(`p. ${page}`, PAGE_W - M, PAGE_H - 24, { align: "right" });
    };
    const newPage = () => { addFooter(); doc.addPage(); page++; y = M; };
    const ensure = (h: number) => { if (y + h > PAGE_H - 48) newPage(); };

    const heading = (t: string) => {
      ensure(46); y += 12;
      doc.setDrawColor(...ACCENT); doc.setLineWidth(2); doc.line(M, y, M + 28, y); y += 15;
      doc.setFont("helvetica", "bold"); doc.setFontSize(13.5); doc.setTextColor(...INK);
      doc.text(t.toUpperCase(), M, y); y += 10;
    };
    const sub = (t: string) => {
      ensure(24); y += 7;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...ACCENT);
      doc.text(t, M, y); y += 5;
    };
    const para = (t: unknown, o: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
      const txt = clean(t); if (!txt) return;
      const size = o.size ?? 10;
      doc.setFont("helvetica", o.bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...(o.color ?? INK));
      const lh = size * 1.42;
      for (const ln of doc.splitTextToSize(txt, CW)) { ensure(lh); doc.text(ln, M, y); y += lh; }
      y += 3;
    };
    const bullets = (items: unknown[]) => {
      const size = 10, lh = 10 * 1.42;
      doc.setFontSize(size);
      for (const it of items) {
        const txt = clean(it); if (!txt) continue;
        const lns = doc.splitTextToSize(txt, CW - 14);
        ensure(lh);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...ACCENT); doc.text("•", M, y);
        doc.setTextColor(...INK); doc.text(lns[0], M + 14, y); y += lh;
        for (let i = 1; i < lns.length; i++) { ensure(lh); doc.text(lns[i], M + 14, y); y += lh; }
      }
      y += 3;
    };
    const srcs = (arr?: { name?: string; url?: string }[]) => {
      const list = (arr || []).filter((s) => s?.url);
      if (!list.length) return;
      ensure(16); y += 2;
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text("Sources :", M, y); y += 11; doc.setFont("helvetica", "normal");
      for (const s of list) for (const l of doc.splitTextToSize(`•  ${clean(s.name || s.url)} — ${s.url}`, CW)) { ensure(10); doc.text(l, M, y); y += 10; }
      y += 4;
    };

    // Bandeau de couverture
    doc.setFillColor(...INK); doc.rect(0, 0, PAGE_W, 92, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(255, 255, 255);
    doc.text("Due Diligence", M, 44);
    doc.setFontSize(14); doc.text(clean(companyName), M, 68);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(205, 214, 235);
    doc.text(new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }), PAGE_W - M, 40, { align: "right" });
    const reco = clean(data.executiveSummary?.recommendation || data.investmentRecommendation?.recommendation);
    if (reco) { doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(reco, PAGE_W - M, 64, { align: "right" }); }
    y = 116;

    para(data.company?.tagline);
    const facts = [
      data.company?.founded && `Fondée : ${clean(data.company.founded)}`,
      data.company?.headquarters && `Siège : ${clean(data.company.headquarters)}`,
      data.company?.sector && `Secteur : ${clean(data.company.sector)}`,
      data.company?.stage && `Stage : ${clean(data.company.stage)}`,
      data.company?.employeeCount && `Effectifs : ${clean(data.company.employeeCount)}`,
    ].filter(Boolean) as string[];
    if (facts.length) para(facts.join("   ·   "), { size: 9, color: MUTED });

    heading("Résumé exécutif");
    para(data.executiveSummary?.overview);
    if (data.executiveSummary?.confidenceLevel) para(`Niveau de confiance : ${clean(data.executiveSummary.confidenceLevel)}`, { bold: true, size: 9 });
    if (toArray(data.executiveSummary?.keyHighlights).length) { sub("Points forts"); bullets(toArray(data.executiveSummary.keyHighlights)); }
    if (toArray(data.executiveSummary?.keyRisks).length) { sub("Risques clés"); bullets(toArray(data.executiveSummary.keyRisks)); }

    const ic = data.investmentCommittee;
    if (ic && Object.keys(ic).length) {
      heading("Comité d'investissement");
      if (ic.thesis) { sub("Thèse — le pari"); para(ic.thesis); }
      if (ic.verdict) { sub("Verdict"); para(ic.verdict); }
      if (ic.thesisFitAnalysis) { sub("Adéquation au mandat"); para(ic.thesisFitAnalysis); }
      if (ic.bullCase) { sub("Scénario haussier"); para(ic.bullCase); }
      if (ic.bearCase) { sub("Scénario baissier"); para(ic.bearCase); }
      if (ic.dealMechanics) { sub("Mécanique du deal"); para(ic.dealMechanics); }
      if (ic.returnModel) { sub("Modèle de retour & comparables"); para(ic.returnModel); }
      if (ic.valuationView) { sub("Vue valorisation / entrée"); para(ic.valuationView); }
      if (toArray(ic.keyDebates).length) { sub("Débats clés"); bullets(toArray(ic.keyDebates)); }
      if (toArray(ic.whatMustBeTrue).length) { sub("Ce qui doit être vrai"); bullets(toArray(ic.whatMustBeTrue)); }
      if (toArray(ic.killCriteria).length) { sub("Critères rédhibitoires"); bullets(toArray(ic.killCriteria)); }
      if (toArray(ic.diligencePriorities).length) { sub("Priorités de due diligence"); bullets(toArray(ic.diligencePriorities)); }
      if (ic.convictionLevel) para(`Conviction : ${clean(ic.convictionLevel)}`, { bold: true, size: 9 });
    }

    heading("Financements");
    if (data.financials?.totalFunding) para(`Financement total : ${clean(data.financials.totalFunding)}`, { bold: true });
    if (data.financials?.latestValuation) para(`Dernière valorisation : ${clean(data.financials.latestValuation)}`);
    if (toArray(data.financials?.fundingHistory).length) {
      sub("Historique des levées");
      bullets(toArray(data.financials.fundingHistory).map((r: any) => {
        const parts = [r.round, r.amount, r.date].filter(Boolean).map((x: any) => clean(x));
        if (toArray(r.investors).length) parts.push("Investisseurs : " + toArray(r.investors).map((x: any) => clean(toDisplayString(x))).join(", "));
        return parts.join(" — ");
      }));
    }
    if (data.financials?.metrics && Object.keys(data.financials.metrics).length) {
      sub("Métriques"); bullets(Object.entries(data.financials.metrics).map(([k, v]) => `${k} : ${clean(v)}`));
    }
    srcs(data.financials?.sources);

    heading("Produit");
    para(data.product?.description);
    if (data.product?.valueProposition) { sub("Proposition de valeur"); para(data.product.valueProposition); }
    if (data.product?.technology) { sub("Technologie"); para(data.product.technology); }
    if (data.product?.patents) { sub("Brevets / IP"); para(data.product.patents); }
    if (toArray(data.product?.keyFeatures).length) { sub("Fonctionnalités clés"); bullets(toArray(data.product.keyFeatures)); }
    srcs(data.product?.sources);

    heading("Marché");
    const mk = data.market || {};
    const mkf = [mk.tam && `TAM : ${clean(mk.tam)}`, mk.sam && `SAM : ${clean(mk.sam)}`, mk.som && `SOM : ${clean(mk.som)}`, mk.cagr && `CAGR : ${clean(mk.cagr)}`].filter(Boolean) as string[];
    if (mkf.length) bullets(mkf);
    if (toArray(mk.trends).length) { sub("Tendances"); bullets(toArray(mk.trends)); }
    para(mk.analysis);
    srcs(mk.sources);

    heading("Équipe");
    para(data.team?.overview);
    if (data.team?.teamSize) para(`Taille : ${clean(data.team.teamSize)}`, { bold: true, size: 9 });
    if (toArray(data.team?.founders).length) {
      sub("Fondateurs");
      toArray(data.team.founders).forEach((f: any) => {
        para(`${clean(f.name)} — ${clean(f.role)}`, { bold: true, size: 10 });
        if (f.background) para(f.background, { size: 9 });
        if (f.linkedin) para(f.linkedin, { size: 8, color: ACCENT });
      });
    }
    if (toArray(data.team?.keyExecutives).length) { sub("Dirigeants clés"); bullets(toArray(data.team.keyExecutives).map((e: any) => `${clean(e.name)} — ${clean(e.role)} — ${clean(e.background)}`)); }
    srcs(data.team?.sources);

    heading("Concurrence");
    para(data.competition?.landscape);
    if (data.competition?.competitiveAdvantage) { sub("Avantage concurrentiel"); para(data.competition.competitiveAdvantage); }
    if (data.competition?.moat) { sub("Moat"); para(data.competition.moat); }
    if (toArray(data.competition?.competitors).length) {
      sub("Concurrents");
      toArray(data.competition.competitors).forEach((c: any) => {
        para(`${clean(c.name)}${c.funding ? ` — ${clean(c.funding)}` : ""}`, { bold: true, size: 10 });
        if (c.description) para(c.description, { size: 9 });
        if (toArray(c.strengths).length) para("Forces : " + toArray(c.strengths).map(clean).join(" ; "), { size: 9, color: MUTED });
        if (toArray(c.weaknesses).length) para("Faiblesses : " + toArray(c.weaknesses).map(clean).join(" ; "), { size: 9, color: MUTED });
      });
    }
    srcs(data.competition?.sources);

    heading("Traction & Jalons");
    para(data.traction?.overview);
    const cu = data.traction?.customers;
    if (cu) {
      const cf = [cu.count && `Clients : ${clean(cu.count)}`, toArray(cu.notable).length && `Notables : ${toArray(cu.notable).map((n: any) => clean(toDisplayString(n))).join(", ")}`, cu.segments && `Segments : ${clean(cu.segments)}`].filter(Boolean) as string[];
      if (cf.length) bullets(cf);
    }
    if (toArray(data.traction?.keyMilestones).length) { sub("Jalons clés"); bullets(toArray(data.traction.keyMilestones).map((m: any) => `${clean(m.date)} — ${clean(m.milestone)}`)); }
    if (toArray(data.traction?.partnerships).length) { sub("Partenariats"); bullets(toArray(data.traction.partnerships)); }
    if (toArray(data.traction?.awards).length) { sub("Prix / Récompenses"); bullets(toArray(data.traction.awards)); }
    srcs(data.traction?.sources);

    heading("Risques");
    (["marketRisks", "executionRisks", "financialRisks", "competitiveRisks", "regulatoryRisks"] as const).forEach((k) => {
      const arr = data.risks?.[k];
      if (Array.isArray(arr) && arr.length) { sub(k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/ Risks/i, "")); bullets(arr); }
    });
    if (toArray(data.risks?.mitigations).length) { sub("Mitigations"); bullets(toArray(data.risks.mitigations)); }
    if (data.risks?.overallRiskLevel) para(`Niveau de risque global : ${clean(data.risks.overallRiskLevel)}`, { bold: true, size: 9 });
    srcs(data.risks?.sources);

    if (data.opportunities) {
      heading("Opportunités");
      if (toArray(data.opportunities.growthOpportunities).length) { sub("Croissance"); bullets(toArray(data.opportunities.growthOpportunities)); }
      if (data.opportunities.marketExpansion) para(`Expansion marché : ${clean(data.opportunities.marketExpansion)}`);
      if (data.opportunities.productExpansion) para(`Expansion produit : ${clean(data.opportunities.productExpansion)}`);
      para(data.opportunities.strategicValue);
      srcs(data.opportunities.sources);
    }

    heading("Recommandation d'investissement");
    const rec = data.investmentRecommendation || {};
    if (rec.recommendation) para(`Recommandation : ${clean(rec.recommendation)}`, { bold: true });
    if (rec.rationale) para(rec.rationale);
    if (toArray(rec.strengths).length) { sub("Points forts"); bullets(toArray(rec.strengths)); }
    if (toArray(rec.weaknesses).length) { sub("Points faibles"); bullets(toArray(rec.weaknesses)); }
    if (toArray(rec.keyQuestions).length) { sub("Questions clés"); bullets(toArray(rec.keyQuestions)); }
    if (toArray(rec.suggestedNextSteps).length) { sub("Prochaines étapes"); bullets(toArray(rec.suggestedNextSteps)); }
    const rf = [rec.targetReturn && `Rendement cible : ${clean(rec.targetReturn)}`, rec.investmentHorizon && `Horizon : ${clean(rec.investmentHorizon)}`, rec.suggestedTicket && `Ticket suggéré : ${clean(rec.suggestedTicket)}`].filter(Boolean) as string[];
    if (rf.length) bullets(rf);

    heading("Toutes les sources");
    const all = allSourcesAggregated.length > 0 ? allSourcesAggregated : (data.allSources || []);
    para(`${all.length} source(s) utilisée(s).`, { size: 9, color: MUTED });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    all.forEach((s: any, i: number) => { if (!s?.url) return; for (const l of doc.splitTextToSize(`${i + 1}.  ${clean(s.name || s.url)} — ${s.url}`, CW)) { ensure(10); doc.setTextColor(...MUTED); doc.text(l, M, y); y += 10; } });

    addFooter();
    doc.save(`Due-Diligence-${safeName}-${date}.pdf`);
    toast({ title: "Export PDF effectué", description: "Le rapport a été téléchargé en PDF." });
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
            <div className="max-w-xl mx-auto border border-border rounded-lg bg-card overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em]">
                  Due diligence en cours
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">{Math.round(progress)} %</span>
              </div>
              <div className="px-6 py-8">
                <h2 className="font-display text-2xl font-medium text-foreground mb-2">
                  {requestPayload?.companyName}
                </h2>
                <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  {statusMessage}
                </p>
                <Progress value={progress} className="h-1" />
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  Collecte des sources, vérification des informations puis rédaction du rapport.
                  Comptez 1 à 3 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="lg:col-span-12">
          <Card className="bg-card border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Erreur d'analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{error}</p>
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

        {/* Results — investment memo */}
        {!loading && !error && data && (
          <div className="lg:col-span-12 min-w-0">
            <InvestmentMemo
              data={data}
              companyName={data.company?.name || requestPayload?.companyName || ""}
              onExport={exportFullReport}
              onExportPdf={exportPdf}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
