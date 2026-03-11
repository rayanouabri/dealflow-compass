import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, TrendingUp } from "lucide-react";

interface QueryOption {
  label: string;
  tag: string;
}

interface StartupCard {
  name: string;
  sector: string;
  country: string;
  score: number;
  description: string;
  stage: string;
}

interface MockResult {
  startups: StartupCard[];
}

const queries: QueryOption[] = [
  {
    label: "Startups FinTech SaaS B2B, early stage, Europe — comme Partech",
    tag: "FinTech · Europe · Early Stage",
  },
  {
    label: "Deep tech biotech, Series A, France — comme Elaia Partners",
    tag: "Biotech · France · Series A",
  },
  {
    label: "Marketplaces B2C, seed, DACH — comme Earlybird",
    tag: "Marketplace · DACH · Seed",
  },
];

const mockResults: MockResult[] = [
  {
    startups: [
      {
        name: "Fintory",
        sector: "FinTech SaaS B2B",
        country: "🇫🇷 France",
        score: 94,
        description: "Plateforme de réconciliation comptable automatisée pour PME.",
        stage: "Seed",
      },
      {
        name: "PayLayer",
        sector: "Payments Infrastructure",
        country: "🇩🇪 Allemagne",
        score: 88,
        description: "API de paiements B2B pour SaaS et marketplaces européennes.",
        stage: "Pre-seed",
      },
      {
        name: "LedgerFlow",
        sector: "FinTech B2B",
        country: "🇬🇧 Royaume-Uni",
        score: 82,
        description: "Automatisation de la comptabilité analytique pour scale-ups.",
        stage: "Series A",
      },
    ],
  },
  {
    startups: [
      {
        name: "CellBridge",
        sector: "Biotech · Thérapie cellulaire",
        country: "🇫🇷 France",
        score: 91,
        description: "Développement de thérapies CAR-T nouvelle génération à coût réduit.",
        stage: "Series A",
      },
      {
        name: "NeuralMed",
        sector: "HealthTech · IA diagnostique",
        country: "🇫🇷 France",
        score: 87,
        description: "IA d'aide au diagnostic oncologique à partir d'imagerie médicale.",
        stage: "Series A",
      },
      {
        name: "GenoPrint",
        sector: "Biotech · Génomique",
        country: "🇫🇷 France",
        score: 79,
        description: "Séquençage génomique rapide et abordable pour la médecine personnalisée.",
        stage: "Seed",
      },
    ],
  },
  {
    startups: [
      {
        name: "HomeSwap",
        sector: "Marketplace B2C · Immobilier",
        country: "🇩🇪 Allemagne",
        score: 89,
        description: "Marketplace d'échange temporaire de logements entre particuliers.",
        stage: "Seed",
      },
      {
        name: "CraftHub",
        sector: "Marketplace B2C · Artisanat",
        country: "🇦🇹 Autriche",
        score: 84,
        description: "Plateforme de mise en relation entre artisans locaux et consommateurs.",
        stage: "Pre-seed",
      },
      {
        name: "FleetLink",
        sector: "Marketplace B2C · Mobilité",
        country: "🇨🇭 Suisse",
        score: 78,
        description: "Marketplace de location de véhicules entre particuliers pour la région DACH.",
        stage: "Seed",
      },
    ],
  },
];

export function VibeSourcingSection() {
  const [selected, setSelected] = useState(0);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />

      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
              Vibe Sourcing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Décrivez votre thèse,
              <span className="block text-gradient-ai-vc">l'IA fait le reste</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Entrez simplement le nom d'un fonds VC ou décrivez votre thèse en langage naturel — notre moteur identifie instantanément les startups qui matchent.
            </p>
          </motion.div>
        </div>

        <motion.div
          className="grid lg:grid-cols-2 gap-6 items-start"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {/* Left — Query cards */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
              Exemples de thèses
            </p>
            {queries.map((query, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                  selected === i
                    ? "bg-primary/15 border-primary/60 shadow-[0_0_20px_rgba(48,100%,55%,0.2)] glow-ai-vc"
                    : "bg-card/60 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${selected === i ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div>
                    <p className={`text-sm leading-relaxed ${selected === i ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      "{query.label}"
                    </p>
                    <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border ${
                      selected === i ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border"
                    }`}>
                      {query.tag}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right — Results mockup */}
          <div className="rounded-2xl border border-primary/30 bg-card/70 backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(48,100%,55%,0.1)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Résultats IA</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/10 text-primary">
                3 startups matchées
              </Badge>
            </div>

            {/* Startup cards */}
            <div className="p-4 space-y-3">
              {mockResults[selected].startups.map((startup, i) => (
                <motion.div
                  key={`${selected}-${i}`}
                  className="p-4 rounded-xl bg-background/50 border border-border hover:border-primary/30 transition-all duration-200"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{startup.name}</p>
                      <p className="text-xs text-muted-foreground">{startup.sector}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">{startup.score}<span className="text-xs text-muted-foreground">/100</span></p>
                      <p className="text-[10px] text-muted-foreground">Score IA</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{startup.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {startup.country}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {startup.stage}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
