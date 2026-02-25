import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSearch,
  Building2,
  TrendingUp,
  Users,
  Target,
  Shield,
  DollarSign,
  Globe,
  Linkedin,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Briefcase,
  Award,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Info,
} from "lucide-react";

const morfoData = {
  company: {
    name: "Morfo",
    tagline: "Reforestation à grande échelle par drone et biotechnologie",
    website: "https://www.morfo.rest",
    linkedinUrl: "https://www.linkedin.com/company/morfo-rest",
    founded: "2020",
    headquarters: "Paris, France",
    sector: "CleanTech / Biotech",
    stage: "Série A",
    employeeCount: "50-100",
  },
  executiveSummary: {
    overview:
      "Morfo développe une technologie de reforestation utilisant des drones et des gélules de semences biotechnologiques pour planter des arbres à grande échelle dans des zones difficiles d'accès. L'entreprise vise à restaurer 1 milliard d'arbres d'ici 2030.",
    keyHighlights: [
      "Technologie brevetée de gélules de semences pour survie en conditions difficiles",
      "Capacité de plantation de 100 000 arbres/jour par drone",
      "Contrats avec gouvernements et entreprises Fortune 500 pour compensation carbone",
      "Levée de fonds Série A de €15M en 2023",
      "Présence opérationnelle en France, Brésil, Maroc",
    ],
    keyRisks: [
      "Dépendance aux contrats gouvernementaux et réglementations environnementales",
      "Taux de survie des semences variable selon les conditions climatiques",
      "Marché du carbone en cours de standardisation",
      "Concurrence des acteurs établis de reforestation traditionnelle",
    ],
    recommendation: "INVEST",
    confidenceLevel: "Élevé",
  },
  product: {
    description:
      "Système intégré drone + gélules de semences biotechnologiques permettant la reforestation à grande échelle. Les gélules brevetées contiennent des semences enrobées de nutriments et de protection contre les prédateurs.",
    valueProposition:
      "Réduire le coût et augmenter le taux de survie de la reforestation par rapport aux méthodes traditionnelles (plantation manuelle).",
    technology:
      "Drones autonomes avec IA de cartographie du terrain + gélules biodégradables à base de biopolymères",
    patents: "3 brevets déposés (FR, PCT)",
    keyFeatures: [
      "Plantation 10x plus rapide que méthodes traditionnelles",
      "Taux de survie 3x supérieur grâce aux gélules nutritives",
      "Cartographie IA du terrain pour optimisation de la densité",
      "Suivi satellitaire de la croissance des arbres",
      "Certification carbone intégrée",
    ],
  },
  market: {
    tam: "€50B",
    sam: "€8B",
    som: "€500M",
    cagr: "22%",
    trends: [
      "Accélération des engagements Net Zero des entreprises",
      "Marchés volontaires du carbone en forte croissance (+45%/an)",
      "Réglementations européennes sur la restauration des écosystèmes (EU Nature Restoration Law)",
      "Demande croissante de solutions technologiques de reforestation",
    ],
    analysis:
      "Le marché de la restauration forestière est en pleine expansion, porté par les engagements climatiques mondiaux. La demande de crédits carbone de haute qualité dépasse l'offre actuelle.",
  },
  competition: {
    landscape:
      "Marché fragmenté entre acteurs traditionnels (ONG, gouvernements) et nouvelles startups tech.",
    competitors: [
      {
        name: "DroneSeed",
        description: "Pioneer américain de la reforestation par drone",
        funding: "$36M",
        strengths: ["First mover", "Présence US"],
        weaknesses: ["Zones géographiques limitées", "Coût élevé"],
      },
      {
        name: "Terraformation",
        description: "Plateforme de reforestation tropicale",
        funding: "$30M",
        strengths: ["Focus Pacifique", "Partenariats solides"],
        weaknesses: ["Pas de technologie drone propriétaire"],
      },
    ],
    competitiveAdvantage:
      "Gélules de semences brevetées + intégration verticale drone/biotech + présence Europe/Afrique/Amérique du Sud",
    moat: "Brevets technologiques, données terrain propriétaires, contrats à long terme gouvernementaux",
  },
  financials: {
    fundingHistory: [
      {
        round: "Amorçage",
        amount: "€2M",
        date: "2020",
        investors: ["Bpifrance", "Entrepreneurs & VC"],
        valuation: "€8M",
      },
      {
        round: "Série A",
        amount: "€15M",
        date: "2023",
        investors: ["Eurazeo", "BNP Paribas Développement", "Bpifrance"],
        valuation: "€60M",
      },
    ],
    totalFunding: "€17M",
    latestValuation: "€60M",
    metrics: {
      ARR: "€3M",
      "Croissance YoY": "+180%",
      "Arbres plantés": "2M+",
    },
  },
  team: {
    overview:
      "Équipe fondatrice solide avec expertise complémentaire en biotechnologie, robotique et finance.",
    founders: [
      {
        name: "Thomas Douce",
        role: "CEO & Co-fondateur",
        background:
          "Ingénieur AgroParisTech, ex-McKinsey. Expertise en agriculture et durabilité.",
      },
      {
        name: "Médéric Veissier",
        role: "CTO & Co-fondateur",
        background:
          "Docteur en robotique (INRIA). Expert en drones autonomes et perception.",
      },
    ],
    teamSize: "60",
    hiringTrends:
      "Recrutement actif en ingénierie (drones, biotech) et business development international",
  },
  traction: {
    overview:
      "Morfo a démontré une traction commerciale significative avec des contrats gouvernementaux et corporate en expansion.",
    keyMilestones: [
      { date: "2020", milestone: "Création de l'entreprise et premier prototype drone" },
      { date: "2021", milestone: "Premier contrat gouvernemental (Maroc, 500 000 arbres)" },
      { date: "2022", milestone: "Déploiement au Brésil, 500 000 arbres plantés" },
      { date: "2023", milestone: "Levée Série A €15M, passage à 2M+ arbres plantés" },
    ],
    partnerships: [
      "Partenariat compensation carbone avec groupe CAC 40 (confidentiel)",
      "Accord de distribution avec ONG internationale de reforestation",
    ],
  },
  risks: {
    marketRisks: [
      "Volatilité du prix des crédits carbone",
      "Dépendance aux politiques climatiques gouvernementales",
    ],
    executionRisks: [
      "Scalabilité opérationnelle à l'international",
      "Recrutement de pilotes de drones certifiés",
    ],
    financialRisks: ["Burn rate élevé en phase de croissance", "Délais de paiement des contrats gouvernementaux"],
    competitiveRisks: ["Entrée de grandes entreprises forestières dans la tech"],
    overallRiskLevel: "medium",
  },
  investmentRecommendation: {
    recommendation: "INVEST",
    rationale:
      "Morfo combine une technologie brevetée différenciante avec un marché en forte croissance portée par les réglementations climatiques. L'exécution opérationnelle prouvée (2M+ arbres) et la traction commerciale (€3M ARR, +180% YoY) justifient une conviction forte.",
    strengths: [
      "Technologie propriétaire brevetée avec avantage concurrentiel défendable",
      "Marché en croissance forte (22% CAGR) et réglementairement soutenu",
      "Équipe fondatrice expérimentée et complémentaire",
      "Traction commerciale démontrée avec clients gouvernementaux et corporate",
    ],
    weaknesses: [
      "Dépendance aux crédits carbone dont la standardisation est encore en cours",
      "Exposition aux risques géopolitiques (opérations dans plusieurs pays)",
    ],
    keyQuestions: [
      "Quel est le coût par arbre planté vs. survie à 5 ans ?",
      "Quelles sont les conditions contractuelles des deals gouvernementaux ?",
      "Pipeline de contrats H2 2024 ?",
    ],
    suggestedNextSteps: [
      "Due diligence technique sur les brevets et taux de survie",
      "Rencontres avec clients gouvernementaux de référence",
      "Audit financier détaillé et projection de trésorerie",
    ],
  },
};

function getRecommendationBadge(rec?: string) {
  switch (rec?.toUpperCase()) {
    case "INVEST":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" /> INVESTIR
        </Badge>
      );
    case "WATCH":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <AlertTriangle className="w-3 h-3 mr-1" /> SURVEILLER
        </Badge>
      );
    case "PASS":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          PASSER
        </Badge>
      );
    default:
      return <Badge variant="outline">{rec || "N/A"}</Badge>;
  }
}

export default function ExempleMorfo() {
  const data = morfoData;

  return (
    <AppLayout
      user={null}
      trialRemaining={0}
      hasTrialRemaining={false}
      onLogin={() => {}}
      onSignOut={() => {}}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-full overflow-x-hidden px-4 md:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="lg:col-span-12 flex items-center gap-2 text-sm text-foreground/80 mb-2 min-w-0 overflow-x-auto py-1">
          <Link to="/" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Accueil</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <span className="text-foreground font-medium truncate min-w-0">Exemple — Morfo</span>
        </nav>

        {/* Example banner */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">📊 Exemple de rapport — Données illustratives pour Morfo</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Ce rendu vous montre exactement ce que génère l'outil. Les données sont illustratives et basées sur des informations publiques.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            <Link to="/due-diligence">
              Analyser ma startup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:col-start-1 lg:row-start-3 order-2 lg:order-1">
          <Card className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground">{data.company.name}</h3>
            <div className="flex flex-wrap gap-2">
              {getRecommendationBadge(data.executiveSummary.recommendation)}
              <Badge variant="outline" className="text-xs font-normal">{data.company.sector}</Badge>
              <Badge variant="secondary" className="text-xs">{data.company.stage}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50 text-xs">
                <a href={data.company.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-3 h-3 mr-1" /> Site
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50 text-xs">
                <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-3 h-3 mr-1" /> LinkedIn
                </a>
              </Button>
            </div>
          </Card>

          {/* Company info card */}
          <Card className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm p-5 space-y-3 shadow-lg">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Fondée</span>
                <span className="text-foreground font-medium">{data.company.founded}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Siège</span>
                <span className="text-foreground font-medium">{data.company.headquarters}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Effectifs</span>
                <span className="text-foreground font-medium">{data.company.employeeCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Total levé</span>
                <span className="text-green-400 font-bold">{data.financials.totalFunding}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Valorisation</span>
                <span className="text-amber-400 font-bold">{data.financials.latestValuation}</span>
              </div>
            </div>
          </Card>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-8 xl:col-span-9 lg:row-start-3 min-w-0 max-w-full overflow-x-hidden space-y-8 order-1 lg:order-2">
          <h1 className="text-2xl md:text-3xl font-bold break-words bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Due Diligence — {data.company.name}
          </h1>

          {/* Header card */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{data.company.name}</h2>
                {getRecommendationBadge(data.executiveSummary.recommendation)}
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">{data.company.tagline}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <Badge variant="outline" className="font-normal">{data.company.sector}</Badge>
                <Badge variant="secondary">{data.company.stage}</Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {data.company.headquarters}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50">
                <a href={data.company.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-2" /> Site web
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50">
                <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
                </a>
              </Button>
            </div>
          </div>

          {/* Executive Summary */}
          <Card className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-b border-amber-500/20">
              <CardTitle className="flex items-center gap-2 text-amber-400 text-lg">
                <FileSearch className="w-5 h-5" />
                Résumé Exécutif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <p className="text-foreground/90 leading-relaxed">{data.executiveSummary.overview}</p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Points Forts
                  </h4>
                  <ul className="space-y-2">
                    {data.executiveSummary.keyHighlights.map((h, i) => (
                      <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risques Clés
                  </h4>
                  <ul className="space-y-2">
                    {data.executiveSummary.keyRisks.map((r, i) => (
                      <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-1 text-red-500 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="financials" className="w-full">
            <TabsList className="w-full flex flex-wrap justify-start gap-1.5 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-1.5 h-auto shadow-lg">
              <TabsTrigger value="financials" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Financements
              </TabsTrigger>
              <TabsTrigger value="product" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Produit
              </TabsTrigger>
              <TabsTrigger value="market" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                Marché
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Équipe
              </TabsTrigger>
              <TabsTrigger value="competition" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Concurrence
              </TabsTrigger>
              <TabsTrigger value="traction" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                Traction
              </TabsTrigger>
              <TabsTrigger value="recommendation" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                Recommandation
              </TabsTrigger>
            </TabsList>

            {/* Financements */}
            <TabsContent value="financials" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Financements & Métriques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Total Levé</p>
                      <p className="text-xl font-bold text-green-400">{data.financials.totalFunding}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Valorisation</p>
                      <p className="text-xl font-bold text-amber-400">{data.financials.latestValuation}</p>
                    </div>
                    {Object.entries(data.financials.metrics).map(([key, val]) => (
                      <div key={key} className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">{key}</p>
                        <p className="text-xl font-bold text-foreground">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Historique des levées
                    </h4>
                    <div className="space-y-3">
                      {data.financials.fundingHistory.map((r, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-gray-800/40 border border-gray-700/30">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-primary">{r.amount}</p>
                            <p className="text-xs text-muted-foreground">{r.date}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{r.round}</Badge>
                              {r.valuation && <span className="text-xs text-muted-foreground">Valuation : {r.valuation}</span>}
                            </div>
                            {r.investors && r.investors.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Investisseurs : {r.investors.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Produit */}
            <TabsContent value="product" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Produit & Technologie
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.product.description}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-primary mb-2">Proposition de valeur</h4>
                      <p className="text-sm text-foreground/80">{data.product.valueProposition}</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-primary mb-2">Technologie</h4>
                      <p className="text-sm text-foreground/80">{data.product.technology}</p>
                    </div>
                  </div>
                  {data.product.patents && (
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                      <Award className="w-4 h-4" />
                      <span>{data.product.patents}</span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Fonctionnalités clés</h4>
                    <ul className="space-y-2">
                      {data.product.keyFeatures.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Marché */}
            <TabsContent value="market" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Analyse de Marché
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "TAM", value: data.market.tam, color: "text-green-400" },
                      { label: "SAM", value: data.market.sam, color: "text-primary" },
                      { label: "SOM", value: data.market.som, color: "text-amber-400" },
                      { label: "CAGR", value: data.market.cagr, color: "text-blue-400" },
                    ].map((item) => (
                      <div key={item.label} className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30 text-center">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{item.label}</p>
                        <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{data.market.analysis}</p>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Tendances du marché</h4>
                    <ul className="space-y-2">
                      {data.market.trends.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                          <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Équipe */}
            <TabsContent value="team" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    Équipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.team.overview}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.team.founders.map((f, i) => (
                      <div key={i} className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{f.name}</p>
                            <p className="text-xs text-primary">{f.role}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{f.background}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Effectifs :</strong> {data.team.teamSize} personnes
                    </span>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-primary mb-1">Recrutement</h4>
                    <p className="text-sm text-foreground/80">{data.team.hiringTrends}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Concurrence */}
            <TabsContent value="competition" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-primary" />
                    Analyse Concurrentielle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.competition.landscape}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.competition.competitors.map((c, i) => (
                      <div key={i} className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{c.name}</h4>
                          {c.funding && <Badge variant="outline" className="text-xs">{c.funding}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {c.strengths && (
                            <div>
                              <p className="text-xs text-green-400 font-medium mb-1">Forces</p>
                              {c.strengths.map((s, j) => (
                                <p key={j} className="text-xs text-foreground/70">• {s}</p>
                              ))}
                            </div>
                          )}
                          {c.weaknesses && (
                            <div>
                              <p className="text-xs text-red-400 font-medium mb-1">Faiblesses</p>
                              {c.weaknesses.map((w, j) => (
                                <p key={j} className="text-xs text-foreground/70">• {w}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Avantage concurrentiel</h4>
                      <p className="text-sm text-foreground/80">{data.competition.competitiveAdvantage}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Moat</h4>
                      <p className="text-sm text-foreground/80">{data.competition.moat}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Traction */}
            <TabsContent value="traction" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Traction & Jalons
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.traction.overview}</p>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Jalons clés</h4>
                    <div className="space-y-3">
                      {data.traction.keyMilestones.map((m, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs shrink-0">{m.date}</Badge>
                          <p className="text-sm text-foreground/90">{m.milestone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Partenariats</h4>
                    <ul className="space-y-2">
                      {data.traction.partnerships.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommandation */}
            <TabsContent value="recommendation" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Recommandation d'investissement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-green-400 text-lg">INVESTIR</p>
                      <p className="text-xs text-muted-foreground">Niveau de confiance : {data.executiveSummary.confidenceLevel}</p>
                    </div>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{data.investmentRecommendation.rationale}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-green-400 mb-2">Points forts</h4>
                      <ul className="space-y-2">
                        {data.investmentRecommendation.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-red-400 mb-2">Points faibles</h4>
                      <ul className="space-y-2">
                        {data.investmentRecommendation.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-red-500 flex-shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-amber-400 mb-2">Questions clés à approfondir</h4>
                    <ul className="space-y-1">
                      {data.investmentRecommendation.keyQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-foreground/90">• {q}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-primary mb-2">Prochaines étapes</h4>
                    <ul className="space-y-1">
                      {data.investmentRecommendation.suggestedNextSteps.map((s, i) => (
                        <li key={i} className="text-sm text-foreground/90">• {s}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/10 px-6 py-5">
            <div>
              <p className="font-semibold text-foreground">Prêt à analyser votre startup ?</p>
              <p className="text-sm text-muted-foreground mt-0.5">Obtenez un rapport complet en ~5 minutes avec 100+ requêtes web et un agent IA.</p>
            </div>
            <Button asChild className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
              <Link to="/due-diligence">
                Lancer une analyse
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
