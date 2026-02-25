import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Footer } from "@/components/landing/Footer";
import {
  BarChart3,
  ArrowLeft,
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
  Lightbulb,
  Award,
  Briefcase,
  LinkIcon,
} from "lucide-react";

const SourceLink = ({ url, name }: { url: string; name: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 transition-all"
  >
    <LinkIcon className="w-3 h-3 flex-shrink-0" />
    <span className="truncate max-w-[120px]">{name}</span>
    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
  </a>
);

export default function ExempleAnalyse() {
  return (
    <div className="min-h-screen flex flex-col bg-background dark">
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#252540] to-[#1a1a2e] -z-10" />
      <div className="fixed inset-0 terminal-grid opacity-[0.12] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(48,100%,60%,0.25),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(220,50%,50%,0.18),transparent_50%)] -z-10" />

      {/* Header */}
      <header className="border-b border-primary/30 bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-primary/10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity group">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center glow-ai-vc border border-primary/30 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  <span className="text-foreground">ai</span>
                  <span className="text-primary">vc</span>
                  <span className="text-foreground">.</span>
                </span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Exemple d'analyse
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400">
                Exemple statique
              </Badge>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Intro Banner */}
        <div className="mb-8 p-6 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Exemple de rapport de Due Diligence
              </h1>
              <p className="text-muted-foreground">
                Voici un exemple de rendu d'analyse généré par <span className="text-primary font-medium">aivc</span>. 
                Ce rapport illustre le niveau de détail et la qualité des analyses que notre outil produit automatiquement.
              </p>
            </div>
            <Link to="/" className="shrink-0">
              <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm cursor-pointer hover:bg-primary/90">
                Essayer l'outil →
              </Badge>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Company Header */}
          <div className="lg:col-span-12">
            <Card className="bg-card/80 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                    M
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground">Mistral AI</h2>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Series B</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Entreprise française pionnière dans le développement de modèles de langage (LLM) open-source et commerciaux, 
                      fondée par d'anciens chercheurs de Google DeepMind et Meta AI.
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <a href="https://mistral.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <Globe className="w-4 h-4" /> mistral.ai
                      </a>
                      <a href="https://linkedin.com/company/mistralai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-400 hover:underline">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Fondée :</span>
                        <span className="ml-2 text-foreground font-medium">2023</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Siège :</span>
                        <span className="ml-2 text-foreground font-medium">Paris, France</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Secteur :</span>
                        <span className="ml-2 text-foreground font-medium">Intelligence Artificielle</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Effectifs :</span>
                        <span className="ml-2 text-foreground font-medium">~700</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Executive Summary */}
          <div className="lg:col-span-8">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Résumé exécutif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Mistral AI est l'un des acteurs les plus prometteurs de l'écosystème IA européen. Fondée en avril 2023 par Arthur Mensch 
                  (ex-Google DeepMind), Guillaume Lample et Timothée Lacroix (ex-Meta AI), la startup a connu une ascension fulgurante, 
                  atteignant une valorisation de 6,2 milliards d'euros en moins de 18 mois. L'entreprise se distingue par son approche 
                  open-source combinée à des offres commerciales premium, positionnant la France comme un acteur majeur de l'IA générative mondiale.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">INVESTIR</Badge>
                  <Badge variant="outline" className="border-primary/40 text-primary">Confiance : Élevée</Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Points forts
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Équipe fondatrice de classe mondiale (DeepMind, Meta AI)</li>
                      <li>• Croissance exceptionnelle avec valorisation de 6,2 Md€</li>
                      <li>• Positionnement stratégique open-source + commercial</li>
                      <li>• Soutien du gouvernement français et de l'écosystème européen</li>
                      <li>• Modèles compétitifs face à GPT-4 et Claude (Mistral Large, Mixtral)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Risques clés
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Concurrence intense (OpenAI, Google, Anthropic, Meta)</li>
                      <li>• Besoins en capitaux très élevés pour l'entraînement GPU</li>
                      <li>• Modèle économique encore en maturation</li>
                      <li>• Risque de commoditisation des LLM open-source</li>
                      <li>• Dépendance aux GPU Nvidia et au cloud computing</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Score Card */}
          <div className="lg:col-span-4">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Target className="w-5 h-5 text-primary" />
                  Score d'analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { label: "Équipe", score: 95 },
                  { label: "Produit / Tech", score: 90 },
                  { label: "Marché", score: 88 },
                  { label: "Traction", score: 85 },
                  { label: "Position Concurrentielle", score: 82 },
                  { label: "Timing", score: 92 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground font-semibold">{item.score}/100</span>
                    </div>
                    <Progress value={item.score} className="h-2" />
                  </div>
                ))}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">Score global</span>
                    <span className="text-2xl font-bold text-primary">88/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financials */}
          <div className="lg:col-span-6">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Financements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground">Financement total</p>
                    <p className="text-xl font-bold text-foreground">~1,1 Md€</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground">Dernière valorisation</p>
                    <p className="text-xl font-bold text-foreground">6,2 Md€</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Historique des levées</h4>
                  {[
                    { round: "Seed", amount: "105 M€", date: "Juin 2023", investors: "Lightspeed, Elad Gil, Eric Schmidt" },
                    { round: "Series A", amount: "385 M€", date: "Décembre 2023", investors: "a16z, Lightspeed, Salesforce Ventures, BNP Paribas" },
                    { round: "Series B", amount: "600 M€", date: "Juin 2024", investors: "General Catalyst, DST Global, NVIDIA, Samsung, Salesforce, IBM, BPI France" },
                  ].map((round) => (
                    <div key={round.round} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="text-xs">{round.round}</Badge>
                        <span className="text-sm font-semibold text-primary">{round.amount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{round.date}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-foreground/80">Investisseurs :</span> {round.investors}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    <SourceLink url="https://www.crunchbase.com/organization/mistral-ai" name="Crunchbase" />
                    <SourceLink url="https://techcrunch.com/2024/06/11/mistral-ai-raises-640-million/" name="TechCrunch" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team */}
          <div className="lg:col-span-6">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Équipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  L'équipe fondatrice de Mistral AI est composée de chercheurs de renommée mondiale en IA, 
                  avec une expérience directe dans le développement de grands modèles de langage chez Google DeepMind et Meta.
                </p>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Fondateurs</h4>
                  {[
                    { name: "Arthur Mensch", role: "CEO", bg: "Ex-Google DeepMind. Polytechnique, ENS. Spécialiste du scaling des LLM." },
                    { name: "Guillaume Lample", role: "Chief Scientist", bg: "Ex-Meta AI (FAIR). Recherche en NLP, architectures transformer." },
                    { name: "Timothée Lacroix", role: "CTO", bg: "Ex-Meta AI (FAIR). Expert en systèmes distribués et optimisation GPU." },
                  ].map((founder) => (
                    <div key={founder.name} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-foreground">{founder.name}</span>
                        <Badge variant="outline" className="text-xs">{founder.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{founder.bg}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Culture & Recrutement</h4>
                  <p className="text-sm text-muted-foreground">
                    Recrutement agressif de chercheurs top-tier en IA à Paris. Culture orientée recherche et open-source, 
                    avec un accent sur la performance et l'efficacité des modèles. ~700 employés avec une croissance rapide.
                  </p>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    <SourceLink url="https://mistral.ai/about" name="Mistral About" />
                    <SourceLink url="https://www.linkedin.com/company/mistralai/" name="LinkedIn" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product */}
          <div className="lg:col-span-12">
            <Card className="bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Building2 className="w-5 h-5 text-primary" />
                  Produit & Technologie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Mistral AI développe une gamme complète de modèles de langage, allant de modèles open-source compacts (Mistral 7B) 
                  à des modèles commerciaux très performants (Mistral Large). L'innovation clé est l'architecture Mixture of Experts (MoE) 
                  utilisée dans Mixtral, qui offre d'excellentes performances avec une efficacité computationnelle supérieure.
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Proposition de valeur</h4>
                    <p className="text-sm text-muted-foreground">
                      Modèles d'IA ouverts et performants, offrant une alternative européenne souveraine aux solutions américaines, 
                      avec déploiement on-premise et cloud, garantissant la confidentialité des données.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Technologie</h4>
                    <p className="text-sm text-muted-foreground">
                      Architecture transformer avancée avec Mixture of Experts (MoE). Mistral 7B, Mixtral 8x7B, Mistral Large, 
                      Codestral (code), et Le Chat (assistant IA). API et plateforme La Plateforme.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Fonctionnalités clés</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Modèles open-weight (Mistral 7B, Mixtral)</li>
                      <li>• API commerciale (La Plateforme)</li>
                      <li>• Le Chat — assistant IA grand public</li>
                      <li>• Codestral — modèle spécialisé code</li>
                      <li>• Déploiement on-premise disponible</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    <SourceLink url="https://mistral.ai/products/" name="Mistral Products" />
                    <SourceLink url="https://docs.mistral.ai/" name="Documentation" />
                    <SourceLink url="https://huggingface.co/mistralai" name="HuggingFace" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market */}
          <div className="lg:col-span-6">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Marché
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "TAM", value: "$1,3T", desc: "Marché global de l'IA (2032)" },
                    { label: "SAM", value: "$150B", desc: "Marché des LLM & IA générative" },
                    { label: "SOM", value: "$15B", desc: "LLM enterprise Europe + US" },
                    { label: "CAGR", value: "37,3%", desc: "Croissance annuelle 2024–2032" },
                  ].map((metric) => (
                    <div key={metric.label} className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-lg font-bold text-primary">{metric.value}</p>
                      <p className="text-[10px] text-muted-foreground/70">{metric.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Tendances du marché</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Adoption massive de l'IA générative par les entreprises</li>
                    <li>• Demande croissante de souveraineté des données en Europe (AI Act)</li>
                    <li>• Mouvement open-source vs modèles propriétaires</li>
                    <li>• Course à l'efficacité des modèles (small models, MoE)</li>
                    <li>• Verticaux spécialisés (code, santé, finance, juridique)</li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    <SourceLink url="https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-market" name="Grand View Research" />
                    <SourceLink url="https://www.statista.com/outlook/tmo/artificial-intelligence/generative-ai/worldwide" name="Statista" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Competition */}
          <div className="lg:col-span-6">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="w-5 h-5 text-primary" />
                  Concurrence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Le marché des LLM est intensément compétitif, dominé par des géants américains. 
                  Mistral AI se différencie par son approche européenne, open-source et efficiente.
                </p>

                <div className="space-y-3">
                  {[
                    { name: "OpenAI", funding: "$13,3B+", desc: "Leader mondial avec GPT-4, ChatGPT. Partenariat Microsoft." },
                    { name: "Anthropic", funding: "$7,6B+", desc: "Claude 3. Fondée par d'ex-OpenAI. Focus sécurité IA." },
                    { name: "Google DeepMind", funding: "Filiale Google", desc: "Gemini. Ressources illimitées, accès data & compute." },
                    { name: "Meta AI (FAIR)", funding: "Filiale Meta", desc: "LLaMA 3. Open-source, concurrence directe sur les modèles ouverts." },
                  ].map((comp) => (
                    <div key={comp.name} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-foreground">{comp.name}</span>
                        <Badge variant="outline" className="text-xs">{comp.funding}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{comp.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Avantage concurrentiel</h4>
                  <p className="text-sm text-muted-foreground">
                    Champion européen de l'IA avec soutien gouvernemental, approche open-source créant un écosystème de développeurs, 
                    efficacité des modèles MoE, conformité RGPD native et déploiement souverain.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Traction */}
          <div className="lg:col-span-6">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Award className="w-5 h-5 text-primary" />
                  Traction & Jalons
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Jalons clés</h4>
                  {[
                    { date: "Avr. 2023", milestone: "Création de Mistral AI à Paris" },
                    { date: "Juin 2023", milestone: "Levée seed de 105M€ — record européen" },
                    { date: "Sept. 2023", milestone: "Lancement de Mistral 7B (open-source)" },
                    { date: "Déc. 2023", milestone: "Mixtral 8x7B (MoE) — Series A de 385M€" },
                    { date: "Fév. 2024", milestone: "Partenariat Microsoft Azure — Mistral Large" },
                    { date: "Juin 2024", milestone: "Series B de 600M€ — valorisation 6,2 Md€" },
                    { date: "2024", milestone: "Lancement de Le Chat, Codestral, La Plateforme" },
                  ].map((m, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-xs text-primary font-mono whitespace-nowrap mt-0.5">{m.date}</span>
                      <span className="text-sm text-muted-foreground">{m.milestone}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Partenariats notables</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Microsoft Azure — distribution cloud</li>
                    <li>• Amazon Bedrock — intégration AWS</li>
                    <li>• Google Cloud — partenariat stratégique</li>
                    <li>• BPI France — soutien institutionnel</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risks & Opportunities */}
          <div className="lg:col-span-6">
            <Card className="bg-card/80 border-primary/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Risques & Opportunités
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Risques principaux
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <span className="text-foreground/80">Marché :</span> Commoditisation rapide des LLM, course au fond des prix</li>
                    <li>• <span className="text-foreground/80">Exécution :</span> Scaling de l'infrastructure et rétention des talents</li>
                    <li>• <span className="text-foreground/80">Financier :</span> Burn rate élevé, besoin de revenus récurrents</li>
                    <li>• <span className="text-foreground/80">Concurrence :</span> Ressources disproportionnées des GAFAM</li>
                    <li>• <span className="text-foreground/80">Réglementaire :</span> AI Act européen, compliance des modèles</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Opportunités
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Leader de l'IA souveraine européenne (marché réglementé)</li>
                    <li>• Expansion vers les verticaux enterprise (finance, santé, juridique)</li>
                    <li>• Monétisation de Le Chat comme alternative européenne à ChatGPT</li>
                    <li>• Partenariats stratégiques avec les grands clouds</li>
                    <li>• IPO potentielle à moyen terme</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-sm text-amber-400 font-medium">Niveau de risque global : Modéré</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Risques élevés compensés par l'équipe exceptionnelle, le timing de marché et le soutien institutionnel.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment Recommendation */}
          <div className="lg:col-span-12">
            <Card className="bg-card/80 border-emerald-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Recommandation d'investissement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-base px-4 py-1">
                    INVESTIR — Fort potentiel
                  </Badge>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  Mistral AI représente une opportunité d'investissement rare : un champion européen de l'IA avec une équipe fondatrice 
                  exceptionnelle, un timing de marché idéal et un positionnement différencié (open-source + souveraineté). 
                  Malgré la concurrence féroce des géants américains, la combinaison de l'approche open-source, du soutien institutionnel 
                  européen et de l'efficacité technique (MoE) offre un moat défendable.
                </p>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xs text-muted-foreground">Ticket suggéré</p>
                    <p className="text-lg font-bold text-foreground">5–20 M€</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xs text-muted-foreground">Horizon d'investissement</p>
                    <p className="text-lg font-bold text-foreground">5–7 ans</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xs text-muted-foreground">Rendement cible</p>
                    <p className="text-lg font-bold text-foreground">5–10x</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Prochaines étapes recommandées</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>1. Rencontre avec l'équipe dirigeante (Arthur Mensch)</li>
                      <li>2. Évaluation technique approfondie des modèles</li>
                      <li>3. Analyse des métriques d'usage de La Plateforme</li>
                      <li>4. Due diligence juridique (IP, licences open-source)</li>
                      <li>5. Validation du pipeline commercial enterprise</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Questions clés</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Quelle est la roadmap produit pour les 18 prochains mois ?</li>
                      <li>• Quel est le taux de conversion freemium → enterprise ?</li>
                      <li>• Comment se différencier durablement face à Meta AI (LLaMA) ?</li>
                      <li>• Quel est le plan de rentabilité et le runway actuel ?</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Sources */}
          <div className="lg:col-span-12">
            <Card className="bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <LinkIcon className="w-5 h-5 text-primary" />
                  Sources du rapport
                  <Badge variant="outline" className="ml-2 text-xs">12 sources</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Mistral AI — Site officiel", url: "https://mistral.ai" },
                    { name: "Crunchbase — Mistral AI", url: "https://www.crunchbase.com/organization/mistral-ai" },
                    { name: "TechCrunch — Series B", url: "https://techcrunch.com/2024/06/11/mistral-ai-raises-640-million/" },
                    { name: "LinkedIn — Mistral AI", url: "https://www.linkedin.com/company/mistralai/" },
                    { name: "HuggingFace — mistralai", url: "https://huggingface.co/mistralai" },
                    { name: "Mistral AI Docs", url: "https://docs.mistral.ai/" },
                    { name: "Grand View Research — AI Market", url: "https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-market" },
                    { name: "Statista — Generative AI", url: "https://www.statista.com/outlook/tmo/artificial-intelligence/generative-ai/worldwide" },
                    { name: "Les Echos — Mistral AI", url: "https://www.lesechos.fr/tech-medias/intelligence-artificielle/" },
                    { name: "Bloomberg — Mistral funding", url: "https://www.bloomberg.com/news/articles/mistral-ai-funding" },
                    { name: "Reuters — Mistral partnership", url: "https://www.reuters.com/technology/mistral-ai/" },
                    { name: "The Verge — Mistral AI", url: "https://www.theverge.com/2024/mistral-ai" },
                  ].map((s, i) => (
                    <SourceLink key={i} url={s.url} name={s.name} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Banner */}
          <div className="lg:col-span-12">
            <div className="p-8 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Générez votre propre analyse de startup
              </h3>
              <p className="text-muted-foreground mb-4">
                Ce rapport a été généré automatiquement par <span className="text-primary font-medium">aivc</span>. 
                Connectez-vous pour analyser n'importe quelle startup en quelques minutes.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors glow-ai-vc"
              >
                Accéder à l'outil →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
