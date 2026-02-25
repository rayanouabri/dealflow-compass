import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Download,
  ChevronRight,
  Award,
  Lightbulb,
  BarChart3,
  Link as LinkIcon,
} from "lucide-react";

/* ─── Morfo — données statiques réalistes ─── */

const data = {
  company: {
    name: "Morfo",
    tagline: "Restauration écologique à grande échelle grâce aux drones et capsules de semences propriétaires",
    website: "https://www.morfo.rest",
    linkedinUrl: "https://www.linkedin.com/company/morfo-rest/",
    founded: "2021",
    headquarters: "Paris, France",
    sector: "CleanTech / Reforestation",
    stage: "Seed",
    employeeCount: "30-50",
  },
  executiveSummary: {
    overview:
      "Morfo est une startup française deeptech fondée en 2021, spécialisée dans la restauration écologique à grande échelle. L'entreprise utilise des drones pour déployer des capsules de semences propriétaires contenant des espèces d'arbres natifs, des nutriments et des agents biologiques, permettant de reboiser des terres dégradées jusqu'à 100 fois plus rapidement qu'avec des méthodes manuelles. Basée à Paris avec des opérations au Brésil et au Gabon, Morfo répond à un besoin critique : restaurer les écosystèmes forestiers tropicaux tout en générant des crédits carbone certifiés pour les entreprises. L'entreprise a levé 4,5 M€ en seed et traite déjà des projets couvrant plusieurs milliers d'hectares.",
    keyHighlights: [
      "Technologie propriétaire de capsules de semences adaptées aux écosystèmes locaux avec taux de germination >70%",
      "Capacité de restauration 100x plus rapide que les méthodes manuelles à coût réduit",
      "Pipeline commercial solide avec plusieurs entreprises du CAC 40 engagées dans la compensation carbone",
      "Équipe pluridisciplinaire combinant expertise en écologie, ingénierie drone et data science",
      "Marché adressable massif : 2 milliards d'hectares de terres dégradées dans le monde",
    ],
    keyRisks: [
      "Entreprise encore en phase early-stage avec un chiffre d'affaires limité",
      "Dépendance aux réglementations et marchés des crédits carbone volontaires",
      "Risques opérationnels liés aux conditions climatiques et aux zones géographiques tropicales",
      "Concurrence croissante dans le secteur de la reforestation technologique",
      "Délais longs entre plantation et vérification des crédits carbone (3-5 ans)",
    ],
    recommendation: "Invest",
    confidenceLevel: "Medium-High",
  },
  financials: {
    totalFunding: "4,5 M€",
    latestValuation: "~20 M€ (estimée post-seed)",
    fundingHistory: [
      {
        round: "Pre-Seed",
        amount: "500 K€",
        date: "2021",
        investors: ["Business Angels", "Bpifrance"],
        valuation: "N/A",
      },
      {
        round: "Seed",
        amount: "4 M€",
        date: "2022",
        investors: ["Founders Future", "Mudcake", "Bpifrance", "RAISE Sherpas"],
        valuation: "~20 M€",
      },
    ],
    metrics: {
      arr: "~500 K€ (estimé)",
      "Hectares traités": "2 000+",
      "Espèces plantées": "200+",
      "Taux de germination": ">70%",
    },
    sources: [
      { name: "Crunchbase – Morfo", url: "https://www.crunchbase.com/organization/morfo" },
      { name: "Founders Future", url: "https://www.foundersfuture.com/portfolio/morfo" },
    ],
  },
  product: {
    description:
      "Morfo développe une solution intégrée de restauration écologique combinant trois piliers technologiques : (1) des capsules de semences propriétaires contenant des espèces natives, des mycorhizes et des nutriments adaptés à chaque écosystème cible, (2) des drones industriels capables de déployer ces capsules à grande échelle sur des terrains dégradés ou difficiles d'accès, et (3) une plateforme de monitoring par satellite et IA pour suivre la croissance des forêts restaurées et générer des rapports certifiés de séquestration carbone.",
    valueProposition:
      "Permettre aux entreprises et gouvernements de restaurer des écosystèmes forestiers dégradés à grande échelle, de manière mesurable et certifiable, tout en générant des crédits carbone de haute qualité. Morfo offre un service clé en main : de l'analyse du terrain à la certification des crédits, en passant par le déploiement et le suivi à long terme.",
    technology:
      "Les capsules de semences Morfo sont développées en collaboration avec des laboratoires de biologie et d'écologie tropicale. Chaque capsule est adaptée au biome cible et contient un mélange optimisé d'espèces natives (jusqu'à 50 espèces différentes par projet), de champignons mycorhiziens pour améliorer l'absorption des nutriments, et d'un substrat nutritif biodégradable. Les drones utilisés sont des modèles industriels modifiés capables de couvrir jusqu'à 50 hectares par jour. Le suivi est assuré par imagerie satellite, LiDAR et algorithmes de machine learning.",
    keyFeatures: [
      "Capsules de semences multi-espèces adaptées au biome local",
      "Déploiement par drone couvrant 50 ha/jour",
      "Monitoring satellite + IA de la croissance forestière",
      "Certification crédits carbone (Verra, Gold Standard)",
      "Analyse pédologique et écologique pré-déploiement",
      "Rapports d'impact biodiversité et carbone",
    ],
    sources: [
      { name: "Morfo – Site officiel", url: "https://www.morfo.rest" },
      { name: "Maddyness – Morfo", url: "https://www.maddyness.com/2023/01/morfo-reforestation-drones/" },
    ],
  },
  market: {
    tam: "$800 Mds",
    sam: "$50 Mds",
    som: "$2 Mds",
    cagr: "25-30%",
    analysis:
      "Le marché de la restauration écologique et des crédits carbone volontaires connaît une croissance exponentielle, porté par les engagements net-zero des entreprises et les réglementations climatiques de plus en plus contraignantes. Le marché des crédits carbone volontaires devrait atteindre 50 milliards de dollars d'ici 2030 selon McKinsey. La restauration forestière représente l'un des leviers les plus efficaces et les plus plébiscités pour la séquestration carbone naturelle. Les solutions technologiques qui permettent de passer à l'échelle tout en garantissant la qualité et la traçabilité sont particulièrement recherchées.",
    trends: [
      "Engagements net-zero des entreprises du Fortune 500 et CAC 40 accélérant la demande",
      "Hausse du prix des crédits carbone volontaires (de $5 à $20-50/tCO2)",
      "Réglementation européenne CSRD imposant la transparence carbone",
      "Développement des standards de qualité (Verra, Gold Standard) pour les crédits nature",
      "Intégration de la technologie (drones, IA, satellite) dans la reforestation",
    ],
    sources: [
      { name: "McKinsey – Voluntary Carbon Markets", url: "https://www.mckinsey.com/capabilities/sustainability/our-insights/a-blueprint-for-scaling-voluntary-carbon-markets" },
      { name: "BCG – Nature-Based Solutions", url: "https://www.bcg.com/publications/2023/why-nature-based-solutions-need-tech" },
    ],
  },
  team: {
    overview:
      "L'équipe fondatrice de Morfo combine une expertise unique en ingénierie, écologie tropicale et entrepreneuriat. L'entreprise compte environ 30-50 collaborateurs répartis entre Paris (siège), le Brésil et le Gabon, avec des profils d'ingénieurs agronomes, de data scientists, de pilotes de drone et de spécialistes en écologie de la restauration.",
    teamSize: "30-50 employés",
    founders: [
      {
        name: "Pascal Music",
        role: "CEO & Co-founder",
        background: "Ancien consultant en supply chain et stratégie. Diplômé de Polytechnique et HEC. Expérience en gestion de projets complexes à l'international avant de fonder Morfo pour répondre à l'urgence climatique.",
        linkedin: "https://www.linkedin.com/in/pascal-music/",
      },
      {
        name: "Adrien Pagès",
        role: "CTO & Co-founder",
        background: "Ingénieur de formation avec une expertise en systèmes embarqués et robotique. Responsable du développement technique des drones et des capsules de semences de Morfo.",
        linkedin: "https://www.linkedin.com/in/adrien-pages/",
      },
    ],
    keyExecutives: [
      {
        name: "Équipe R&D",
        role: "Recherche & Développement",
        background: "Chercheurs en écologie tropicale, biologistes et ingénieurs agronomes travaillant sur l'optimisation des capsules de semences et les protocoles de restauration.",
      },
      {
        name: "Équipe Opérations",
        role: "Terrain (Brésil, Gabon)",
        background: "Pilotes de drone certifiés, techniciens de terrain et partenaires locaux assurant le déploiement opérationnel des projets de reforestation.",
      },
    ],
    sources: [
      { name: "LinkedIn – Morfo", url: "https://www.linkedin.com/company/morfo-rest/" },
      { name: "Morfo – Équipe", url: "https://www.morfo.rest/about" },
    ],
  },
  competition: {
    landscape:
      "Le marché de la reforestation technologique est encore émergent mais se structure rapidement. Morfo se distingue par son approche intégrée (capsules + drones + monitoring) et sa focalisation sur la restauration écologique multi-espèces plutôt que la monoculture. Plusieurs concurrents adressent des segments similaires avec des approches différentes.",
    competitiveAdvantage:
      "Morfo se différencie par sa technologie propriétaire de capsules multi-espèces adaptées aux écosystèmes tropicaux, sa capacité à restaurer la biodiversité (et pas seulement planter des arbres en monoculture), son monitoring par satellite et IA pour la certification carbone, et sa présence opérationnelle directe au Brésil et au Gabon.",
    moat: "La propriété intellectuelle sur les formulations de capsules de semences, les données accumulées sur les taux de germination par espèce et par biome, et les partenariats terrain avec des acteurs locaux constituent le moat de Morfo. La connaissance fine des écosystèmes tropicaux est difficile à répliquer rapidement.",
    competitors: [
      {
        name: "Dendra Systems",
        description: "Startup UK utilisant des drones pour la reforestation, focalisée sur les écosystèmes tempérés et les anciens sites miniers.",
        funding: "$15M+",
        strengths: ["Technologie drone mature", "Présence UK et Australie"],
        weaknesses: ["Moins focalisé sur les tropiques", "Approche moins diversifiée en espèces"],
      },
      {
        name: "Flash Forest",
        description: "Startup canadienne de reforestation par drone avec des pods de semences, principalement active en Amérique du Nord.",
        funding: "$10M+",
        strengths: ["Bonne couverture médiatique", "Forte communauté"],
        weaknesses: ["Focus Amérique du Nord", "Moins d'expertise tropicale"],
      },
      {
        name: "Land Life Company",
        description: "Entreprise néerlandaise de restauration terrestre utilisant la technologie de cocoon pour protéger les jeunes plants.",
        funding: "$30M+",
        strengths: ["Plus avancée commercialement", "Technologie cocoon brevetée"],
        weaknesses: ["Approche non-drone", "Coûts plus élevés par hectare"],
      },
    ],
    sources: [
      { name: "Dealroom – Climate Tech", url: "https://dealroom.co/guides/climate-tech" },
      { name: "GreenBiz – Reforestation Tech", url: "https://www.greenbiz.com/article/tech-enabled-reforestation" },
    ],
  },
  traction: {
    overview:
      "Morfo a rapidement progressé depuis sa création en 2021, passant du stade de R&D à des opérations de terrain à grande échelle. L'entreprise a déjà traité plus de 2 000 hectares de terres dégradées, principalement au Brésil et au Gabon, et développe un pipeline commercial solide avec des entreprises engagées dans la compensation carbone.",
    customers: {
      count: "10+ entreprises clientes",
      notable: ["Grands groupes du CAC 40", "Entreprises de l'industrie cosmétique", "Groupes agro-industriels"],
      segments: "Entreprises cherchant des crédits carbone certifiés et des projets de restauration à impact mesurable",
    },
    keyMilestones: [
      { date: "2021", milestone: "Création de Morfo à Paris et premiers tests de capsules de semences" },
      { date: "2022", milestone: "Levée seed de 4M€ auprès de Founders Future, Mudcake et Bpifrance" },
      { date: "2022", milestone: "Premiers déploiements opérationnels au Brésil sur des terres dégradées" },
      { date: "2023", milestone: "Extension des opérations au Gabon et atteinte de 1 000 hectares traités" },
      { date: "2023", milestone: "Développement du module de monitoring satellite et certification carbone" },
      { date: "2024", milestone: "Dépassement de 2 000 hectares restaurés avec 200+ espèces natives plantées" },
    ],
    partnerships: [
      "Bpifrance – Soutien institutionnel et financement",
      "ONF International – Expertise forestière tropicale",
      "Laboratoires universitaires – R&D sur les capsules de semences",
      "Partenaires locaux au Brésil et Gabon – Logistique et terrain",
    ],
    awards: [
      "Lauréat French Tech Green20",
      "Prix de l'Innovation Écologique 2023",
      "Sélection i-Lab (Bpifrance)",
    ],
    sources: [
      { name: "Morfo – Projets", url: "https://www.morfo.rest/projects" },
      { name: "French Tech Green20", url: "https://lafrenchtech.com/fr/les-programmes/green20/" },
    ],
  },
  risks: {
    marketRisks: [
      "Volatilité du prix des crédits carbone volontaires",
      "Risque de ralentissement des engagements net-zero si conditions macro-économiques défavorables",
      "Évolution réglementaire incertaine sur les marchés carbone internationaux",
    ],
    executionRisks: [
      "Scaling des opérations terrain dans des zones tropicales logistiquement complexes",
      "Recrutement et rétention de profils techniques spécialisés (écologues, pilotes drone)",
      "Dépendance aux conditions climatiques pour les taux de germination",
    ],
    financialRisks: [
      "Besoin de financement significatif pour la Series A et l'expansion internationale",
      "Délai entre investissement initial et génération de revenus carbone (3-5 ans de cycle)",
      "Pression sur les marges si les coûts opérationnels terrain augmentent",
    ],
    competitiveRisks: [
      "Entrée de grands acteurs (NGOs, corporations) sur le marché de la reforestation tech",
      "Concurrents mieux financés (Land Life, Dendra) qui accélèrent leur expansion",
      "Risque de commoditisation des crédits carbone forestiers",
    ],
    mitigations: [
      "Technologie propriétaire et données accumulées difficiles à répliquer",
      "Focus sur la qualité (multi-espèces, biodiversité) plutôt que le volume pur",
      "Partenariats institutionnels solides (Bpifrance, ONF International)",
      "Présence terrain directe au Brésil et au Gabon créant un avantage opérationnel",
      "Diversification des revenus : crédits carbone + services de restauration + consulting",
    ],
    overallRiskLevel: "medium",
    sources: [
      { name: "WEF – Carbon Markets Outlook", url: "https://www.weforum.org/agenda/2023/carbon-markets/" },
    ],
  },
  opportunities: {
    growthOpportunities: [
      "Expansion géographique vers l'Asie du Sud-Est et l'Afrique de l'Ouest",
      "Développement de l'offre crédits biodiversité (en plus du carbone)",
      "Partenariats avec des gouvernements pour les programmes nationaux de restauration",
      "Scaling technologique : drones autonomes et capsules de nouvelle génération",
    ],
    marketExpansion:
      "Le marché des crédits carbone volontaires devrait croître de 15x d'ici 2030. Les réglementations CSRD en Europe et SEC aux États-Unis imposent de nouveaux standards de reporting, ce qui devrait accélérer la demande pour des solutions de compensation carbone de qualité.",
    productExpansion:
      "Morfo peut étendre son offre au-delà de la reforestation tropicale : restauration de mangroves, de savanes, et agroforesterie. Le module de monitoring satellite pourrait aussi être commercialisé indépendamment comme solution SaaS pour le suivi des projets nature.",
    strategicValue:
      "En tant que leader européen de la reforestation par drone, Morfo pourrait devenir une cible d'acquisition stratégique pour les grands acteurs de la compensation carbone ou les entreprises de services environnementaux.",
    sources: [
      { name: "McKinsey – Carbon Markets", url: "https://www.mckinsey.com/capabilities/sustainability/our-insights/a-blueprint-for-scaling-voluntary-carbon-markets" },
    ],
  },
  investmentRecommendation: {
    recommendation: "Invest – Potentiel élevé avec risque early-stage",
    rationale:
      "Morfo opère à l'intersection de deux méga-tendances : l'urgence climatique et la digitalisation de la restauration écologique. La technologie propriétaire de capsules multi-espèces, combinée au déploiement par drone et au monitoring IA, crée une proposition de valeur unique sur un marché en hypercroissance. L'équipe fondatrice est solide, les premiers résultats terrain sont encourageants (2 000+ ha, >70% germination), et le pipeline commercial se développe avec des clients corporate de premier plan. Le principal risque reste le caractère early-stage et le besoin de financement pour atteindre la rentabilité.",
    strengths: [
      "Technologie propriétaire et données d'écosystèmes accumulées (moat croissant)",
      "Marché en hypercroissance ($50Mds d'ici 2030) avec vents porteurs réglementaires",
      "Équipe fondatrice complémentaire et expérimentée",
      "Premiers résultats terrain validés (>2 000 ha, >70% de taux de germination)",
      "Positionnement premium sur la qualité (multi-espèces, biodiversité, pas monoculture)",
      "Écosystème French Tech et soutien Bpifrance",
    ],
    weaknesses: [
      "Stade early-stage avec revenus encore limités",
      "Cycle long entre plantation et monétisation des crédits carbone (3-5 ans)",
      "Complexité opérationnelle des déploiements en zone tropicale",
      "Besoin de Series A pour financer l'expansion",
      "Marché des crédits carbone volontaires encore volatile",
    ],
    keyQuestions: [
      "Quel est le plan précis de passage à l'échelle pour les 3 prochaines années ?",
      "Quels contrats fermes sont signés avec des clients corporate ?",
      "Quelle est la roadmap pour la certification Verra / Gold Standard des projets actuels ?",
      "Quel est le CAC (coût d'acquisition client) et le LTV attendu par hectare traité ?",
      "Comment l'entreprise gère-t-elle le risque climatique sur les taux de germination ?",
    ],
    suggestedNextSteps: [
      "Rencontre approfondie avec les fondateurs Pascal Music et Adrien Pagès",
      "Visite terrain d'un site de restauration au Brésil ou au Gabon",
      "Analyse détaillée du pipeline commercial et des lettres d'intention clients",
      "Due diligence technique sur la technologie des capsules et les données de germination",
      "Validation du modèle économique avec des experts du marché carbone",
    ],
    targetReturn: "8-12x",
    investmentHorizon: "5-7 ans",
    suggestedTicket: "500 K€ – 1,5 M€",
  },
  allSources: [
    { name: "Morfo – Site officiel", url: "https://www.morfo.rest", type: "company", relevance: "Source primaire pour les informations produit, équipe et projets de Morfo" },
    { name: "Crunchbase – Morfo", url: "https://www.crunchbase.com/organization/morfo", type: "database", relevance: "Données financières et historique des levées de fonds" },
    { name: "LinkedIn – Morfo", url: "https://www.linkedin.com/company/morfo-rest/", type: "social", relevance: "Informations sur l'équipe et la croissance de l'effectif" },
    { name: "Founders Future – Portfolio", url: "https://www.foundersfuture.com/portfolio/morfo", type: "investor", relevance: "Détails sur l'investissement seed et la thèse d'investissement" },
    { name: "Maddyness – Morfo", url: "https://www.maddyness.com/2023/01/morfo-reforestation-drones/", type: "press", relevance: "Article de presse sur la technologie et la vision de Morfo" },
    { name: "French Tech Green20", url: "https://lafrenchtech.com/fr/les-programmes/green20/", type: "ecosystem", relevance: "Label French Tech et reconnaissance institutionnelle" },
    { name: "McKinsey – Carbon Markets", url: "https://www.mckinsey.com/capabilities/sustainability/our-insights/a-blueprint-for-scaling-voluntary-carbon-markets", type: "research", relevance: "Données sur la taille du marché des crédits carbone volontaires" },
    { name: "BCG – Nature-Based Solutions", url: "https://www.bcg.com/publications/2023/why-nature-based-solutions-need-tech", type: "research", relevance: "Analyse du rôle de la technologie dans les solutions basées sur la nature" },
    { name: "Dealroom – Climate Tech", url: "https://dealroom.co/guides/climate-tech", type: "database", relevance: "Données sur l'écosystème Climate Tech en Europe" },
    { name: "GreenBiz – Reforestation Tech", url: "https://www.greenbiz.com/article/tech-enabled-reforestation", type: "press", relevance: "Analyse du paysage concurrentiel de la reforestation technologique" },
    { name: "Morfo – Projets", url: "https://www.morfo.rest/projects", type: "company", relevance: "Détails sur les projets de restauration en cours" },
    { name: "WEF – Carbon Markets", url: "https://www.weforum.org/agenda/2023/carbon-markets/", type: "research", relevance: "Perspectives sur l'évolution des marchés carbone" },
  ],
  dataQuality: {
    overallScore: "good",
    limitations: [
      "Peu de données financières publiques disponibles (startup early-stage non cotée)",
      "Les chiffres de revenus et de valorisation sont des estimations basées sur les informations disponibles",
      "Certaines métriques opérationnelles (taux de germination exact, coût par hectare) ne sont pas publiquement vérifiables",
    ],
    sourcesCount: "12",
  },
  metadata: {
    companyName: "Morfo",
    generatedAt: new Date().toISOString(),
    searchResultsCount: 47,
  },
};

/* ─── Helpers ─── */

const shortenUrl = (url: string, maxLength = 40): string => {
  try {
    const u = new URL(url);
    const domain = u.hostname.replace("www.", "");
    const full = domain + u.pathname;
    if (full.length <= maxLength) return full;
    if (domain.length <= maxLength) return domain;
    return domain.substring(0, maxLength - 3) + "...";
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength - 3) + "..." : url;
  }
};

const allSourcesAggregated = (() => {
  const byUrl = new Map<string, { name: string; url: string; type?: string; relevance?: string }>();
  const add = (s: { name?: string; url?: string; type?: string; relevance?: string } | null) => {
    if (!s?.url) return;
    if (byUrl.has(s.url)) return;
    byUrl.set(s.url, { name: s.name || shortenUrl(s.url), url: s.url, type: s.type, relevance: s.relevance });
  };
  (data.allSources || []).forEach(add);
  [data.product?.sources, data.market?.sources, data.financials?.sources, data.team?.sources, data.competition?.sources, data.traction?.sources, data.risks?.sources, data.opportunities?.sources].forEach((arr) => {
    (arr || []).forEach((s) => add(s));
  });
  return Array.from(byUrl.values());
})();

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

const getRecommendationBadge = (rec?: string) => {
  if (!rec) return null;
  const lower = rec.toLowerCase();
  if (lower.includes("invest") || lower.includes("acheter"))
    return <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">Investir</Badge>;
  if (lower.includes("watch") || lower.includes("surveiller"))
    return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Surveiller</Badge>;
  return <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">Investir</Badge>;
};

const getRiskBadge = (level?: string) => {
  if (!level) return null;
  switch (level.toLowerCase()) {
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

/* ─── Page ─── */

export default function ExempleAnalyse() {
  return (
    <AppLayout user={null} trialRemaining={3} hasTrialRemaining onLogin={() => {}} onSignOut={() => {}}>
      {/* Info banner */}
      <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 shrink-0">
            Exemple statique
          </Badge>
          <p className="text-sm text-muted-foreground flex-1">
            Ceci est un exemple de rapport de due diligence généré par{" "}
            <span className="text-primary font-medium">aivc</span>. Les données sont illustratives.{" "}
            <Link to="/" className="text-primary hover:underline">
              Essayer l'outil →
            </Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-full overflow-x-hidden" data-page="due-diligence-result">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="lg:col-span-12 flex items-center gap-2 text-sm text-foreground/80 mb-6 min-w-0 overflow-x-auto py-1">
          <Link to="/" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Accueil</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <Link to="/due-diligence" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Due Diligence</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <span className="text-foreground font-medium truncate min-w-0">Morfo (Exemple)</span>
        </nav>

        {/* ─── Sidebar ─── */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:col-start-1 lg:row-start-2 order-2 lg:order-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-foreground/70 hover:text-primary transition-all duration-300 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-primary/40 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </div>

          {/* Company card */}
          <Card className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground">{data.company.name}</h3>
            <div className="flex flex-wrap gap-2">
              {getRecommendationBadge(data.executiveSummary.recommendation)}
              <Badge variant="outline" className="text-xs font-normal">{data.company.sector}</Badge>
              <Badge variant="secondary" className="text-xs">{data.company.stage}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50 text-xs">
                <a href={data.company.website} target="_blank" rel="noopener noreferrer"><Globe className="w-3 h-3 mr-1" /> Site</a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50 text-xs">
                <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="w-3 h-3 mr-1" /> LinkedIn</a>
              </Button>
            </div>
          </Card>

          {/* Sidebar sources */}
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
        </aside>

        {/* ─── Main content ─── */}
        <div className="lg:col-span-8 xl:col-span-9 lg:row-start-2 min-w-0 max-w-full overflow-x-hidden space-y-8 order-1 lg:order-2">
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
                  <Globe className="w-4 h-4 mr-2" />
                  Site web
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-gray-600 hover:border-primary/50">
                <a href={data.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
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

          {/* Export bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
            <span className="text-sm font-medium text-foreground">Exporter l&apos;analyse complète (rapport + sources)</span>
            <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">Exemple — export désactivé</Badge>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="financials" className="w-full">
            <TabsList className="w-full flex flex-wrap justify-start gap-1.5 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-1.5 h-auto shadow-lg">
              <TabsTrigger value="financials" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />Financements
              </TabsTrigger>
              <TabsTrigger value="product" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Target className="w-3.5 h-3.5 mr-1.5" />Produit
              </TabsTrigger>
              <TabsTrigger value="market" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Marché
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Users className="w-3.5 h-3.5 mr-1.5" />Équipe
              </TabsTrigger>
              <TabsTrigger value="competition" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Shield className="w-3.5 h-3.5 mr-1.5" />Concurrence
              </TabsTrigger>
              <TabsTrigger value="traction" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />Traction
              </TabsTrigger>
              <TabsTrigger value="risks" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Risques
              </TabsTrigger>
              <TabsTrigger value="recommendation" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <Lightbulb className="w-3.5 h-3.5 mr-1.5" />Recommandation
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-foreground/70">
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />Sources
              </TabsTrigger>
            </TabsList>

            {/* ── Financials ── */}
            <TabsContent value="financials" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Financements & Métriques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Total Levé</p>
                      <p className="text-xl font-bold text-green-400">{data.financials.totalFunding}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Valorisation</p>
                      <p className="text-xl font-bold text-amber-400">{data.financials.latestValuation}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">ARR</p>
                      <p className="text-xl font-bold">{data.financials.metrics.arr}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Hectares traités</p>
                      <p className="text-xl font-bold">{data.financials.metrics["Hectares traités"]}</p>
                    </div>
                  </div>

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
                            <span className="text-xs text-muted-foreground bg-gray-800/50 px-2 py-1 rounded">{round.date}</span>
                          </div>
                          {round.valuation !== "N/A" && (
                            <p className="text-sm text-amber-400 mb-2 font-medium">Valorisation: {round.valuation}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-gray-300">Investisseurs:</span> {round.investors.join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4 text-base">Métriques Détaillées</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(data.financials.metrics).map(([key, value]) => (
                        <div key={key} className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-lg p-3 border border-gray-700/30">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">{key}</p>
                          <p className="text-sm font-semibold text-gray-200">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <SourcesFooter sources={data.financials.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Product ── */}
            <TabsContent value="product" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-blue-400" />
                    Produit & Technologie
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-foreground/90 leading-relaxed">{data.product.description}</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-400 mb-2">Proposition de Valeur</h4>
                    <p className="text-foreground/90">{data.product.valueProposition}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Technologie</h4>
                    <p className="text-foreground/90">{data.product.technology}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Fonctionnalités Clés</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.product.keyFeatures.map((f, i) => (
                        <Badge key={i} variant="secondary">{f}</Badge>
                      ))}
                    </div>
                  </div>
                  <SourcesFooter sources={data.product.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Market ── */}
            <TabsContent value="market" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Analyse du Marché
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">TAM</p>
                      <p className="text-lg font-semibold text-purple-400">{data.market.tam}</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">SAM</p>
                      <p className="text-lg font-semibold text-purple-400">{data.market.sam}</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">SOM</p>
                      <p className="text-lg font-semibold text-purple-400">{data.market.som}</p>
                    </div>
                  </div>
                  <p className="text-sm"><strong>CAGR:</strong> {data.market.cagr}</p>
                  <div>
                    <h4 className="font-semibold mb-2">Analyse</h4>
                    <p className="text-foreground/90 leading-relaxed">{data.market.analysis}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Tendances</h4>
                    <ul className="space-y-1">
                      {data.market.trends.map((t, i) => (
                        <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                          <TrendingUp className="w-3 h-3 mt-1 text-purple-400 flex-shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <SourcesFooter sources={data.market.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Team ── */}
            <TabsContent value="team" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-cyan-400" />
                    Équipe & Fondateurs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.team.overview}</p>
                  <div className="bg-cyan-500/10 rounded-lg p-3 inline-block">
                    <p className="text-sm"><strong>Taille de l'équipe:</strong> {data.team.teamSize}</p>
                  </div>
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
                            <a href={f.linkedin} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="w-4 h-4 text-muted-foreground hover:text-cyan-400" />
                            </a>
                          </div>
                          <p className="text-sm text-gray-400">{f.background}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Équipe Dirigeante</h4>
                    <div className="space-y-2">
                      {data.team.keyExecutives.map((e, i) => (
                        <div key={i} className="bg-gray-800/20 rounded-lg p-3">
                          <p className="font-medium">{e.name} <span className="text-sm text-muted-foreground">- {e.role}</span></p>
                          <p className="text-sm text-gray-400 mt-1">{e.background}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SourcesFooter sources={data.team.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Competition ── */}
            <TabsContent value="competition" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-orange-400" />
                    Analyse Concurrentielle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.competition.landscape}</p>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-400 mb-2">Avantage Concurrentiel</h4>
                    <p className="text-foreground/90">{data.competition.competitiveAdvantage}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Moat</h4>
                    <p className="text-foreground/90">{data.competition.moat}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Concurrents Principaux</h4>
                    <div className="space-y-3">
                      {data.competition.competitors.map((c, i) => (
                        <div key={i} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-semibold">{c.name}</p>
                            <Badge variant="outline">{c.funding}</Badge>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{c.description}</p>
                          <div className="grid md:grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-green-400 font-medium mb-1">Forces:</p>
                              <ul className="text-gray-400">
                                {c.strengths.map((s, j) => <li key={j}>• {s}</li>)}
                              </ul>
                            </div>
                            <div>
                              <p className="text-red-400 font-medium mb-1">Faiblesses:</p>
                              <ul className="text-gray-400">
                                {c.weaknesses.map((w, j) => <li key={j}>• {w}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SourcesFooter sources={data.competition.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Traction ── */}
            <TabsContent value="traction" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Traction & Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <p className="text-foreground/90 leading-relaxed">{data.traction.overview}</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-500/10 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Clients</p>
                      <p className="text-xl font-semibold text-green-400">{data.traction.customers.count}</p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-2">Clients Notables</p>
                      <div className="flex flex-wrap gap-2">
                        {data.traction.customers.notable.map((c, i) => (
                          <Badge key={i} variant="secondary">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Milestones Clés</h4>
                    <div className="space-y-2">
                      {data.traction.keyMilestones.map((m, i) => (
                        <div key={i} className="flex items-start gap-3 bg-gray-800/20 rounded-lg p-3">
                          <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-300">{m.milestone}</p>
                            <p className="text-xs text-muted-foreground mt-1">{m.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Partenariats</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.traction.partnerships.map((p, i) => (
                        <Badge key={i} variant="outline">{p}</Badge>
                      ))}
                    </div>
                  </div>

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
                  <SourcesFooter sources={data.traction.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Risks ── */}
            <TabsContent value="risks" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Analyse des Risques
                    </span>
                    {getRiskBadge(data.risks.overallRiskLevel)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-red-400 mb-2">Risques Marché</h4>
                      <ul className="space-y-1 text-sm">
                        {data.risks.marketRisks.map((r, i) => <li key={i} className="text-gray-300">• {r}</li>)}
                      </ul>
                    </div>
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-400 mb-2">Risques Exécution</h4>
                      <ul className="space-y-1 text-sm">
                        {data.risks.executionRisks.map((r, i) => <li key={i} className="text-gray-300">• {r}</li>)}
                      </ul>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-400 mb-2">Risques Financiers</h4>
                      <ul className="space-y-1 text-sm">
                        {data.risks.financialRisks.map((r, i) => <li key={i} className="text-gray-300">• {r}</li>)}
                      </ul>
                    </div>
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-400 mb-2">Risques Concurrentiels</h4>
                      <ul className="space-y-1 text-sm">
                        {data.risks.competitiveRisks.map((r, i) => <li key={i} className="text-gray-300">• {r}</li>)}
                      </ul>
                    </div>
                  </div>

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
                  <SourcesFooter sources={data.risks.sources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Recommendation ── */}
            <TabsContent value="recommendation" className="mt-4">
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      Recommandation d'Investissement
                    </span>
                    {getRecommendationBadge(data.investmentRecommendation.recommendation)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div>
                    <h4 className="font-semibold mb-2">Justification</h4>
                    <p className="text-foreground/90 leading-relaxed">{data.investmentRecommendation.rationale}</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 my-4">
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Multiple Cible</p>
                      <p className="text-lg font-semibold text-amber-400">{data.investmentRecommendation.targetReturn}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Horizon</p>
                      <p className="text-lg font-semibold">{data.investmentRecommendation.investmentHorizon}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Ticket Suggéré</p>
                      <p className="text-lg font-semibold text-green-400">{data.investmentRecommendation.suggestedTicket}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-green-400 mb-2">Forces</h4>
                      <ul className="space-y-1 text-sm">
                        {data.investmentRecommendation.strengths.map((s, i) => (
                          <li key={i} className="text-gray-300">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-red-400 mb-2">Faiblesses</h4>
                      <ul className="space-y-1 text-sm">
                        {data.investmentRecommendation.weaknesses.map((w, i) => (
                          <li key={i} className="text-gray-300">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-400 mb-2">Questions à Creuser</h4>
                    <ul className="space-y-1 text-sm">
                      {data.investmentRecommendation.keyQuestions.map((q, i) => (
                        <li key={i} className="text-gray-300">• {q}</li>
                      ))}
                    </ul>
                  </div>

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
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Sources ── */}
            <TabsContent value="sources" className="mt-4">
              <Card className="bg-card/80 border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-gray-400" />
                      Toutes les Sources
                    </span>
                    <Badge variant="outline" className="text-xs">{allSourcesAggregated.length} sources</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-200">Qualité des Données</span>
                      <Badge variant="secondary" className="text-xs">{data.dataQuality.overallScore}</Badge>
                    </div>
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
                  </div>

                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-2">
                      {allSourcesAggregated.map((source, i) => (
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
                                {shortenUrl(source.url, 60)}
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
          </Tabs>

          {/* Bottom sources bloc */}
          <section id="sources-du-rapport" aria-label="Sources du rapport">
            <Card className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
              <CardHeader className="pb-3 border-b border-gray-700/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LinkIcon className="w-5 h-5 text-primary" />
                  Sources du rapport
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {allSourcesAggregated.length} sources
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
          </section>

          {/* Footer metadata */}
          <div className="text-center text-xs text-muted-foreground pt-6 border-t border-gray-700/50">
            <p>
              Rapport généré le {new Date(data.metadata.generatedAt).toLocaleString("fr-FR")}
              {` • ${data.metadata.searchResultsCount} résultats de recherche analysés`}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
