import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Radar,
  FileSearch,
  Linkedin,
  FileText,
  Github,
  Filter,
  ListChecks,
  Building2,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Radar,
    title: "Détection multi-signaux",
    description:
      "12 canaux croisés (LinkedIn hiring, brevets INPI/EPO/USPTO, GitHub trending, arXiv/HAL, ProductHunt, Show HN, Wellfound, Pappers…). Une startup qui apparaît dans 3+ canaux est boostée automatiquement.",
    highlight: true,
  },
  {
    icon: Linkedin,
    title: "Signaux LinkedIn",
    description:
      "Hiring bursts (10+ postes en 3 mois), profils fondateurs ex-GAFAM, exits passés, paires cofondateurs, embauches VP/Head of — tout patternisé sans API LinkedIn payante.",
  },
  {
    icon: FileText,
    title: "Brevets & spin-offs",
    description:
      "Suivi Google Patents, INPI (France), EPO. Mouvement chercheur→fondateur, citations brevets, dépôts trademark — les signaux les plus en amont de toute traction.",
  },
  {
    icon: Github,
    title: "Open-source & ProductHunt",
    description:
      "Repos trending par secteur, orgs créées récemment, lancements ProductHunt, posts Show HN. Détecte les fondateurs builders avant qu'ils aient une page Crunchbase.",
  },
  {
    icon: Filter,
    title: "Filtrage thèse + portfolio",
    description:
      "L'IA extrait votre thèse réelle depuis votre portfolio existant, puis exclut automatiquement les sociétés que vous avez déjà investies. Plus jamais de doublon avec votre deck.",
  },
  {
    icon: FileSearch,
    title: "Due diligence en ~2 min",
    description:
      "Rapport structuré : équipe, marché TAM/SAM, traction, produit, concurrents, risques, recommandation. Avec sources cliquables — chaque affirmation traçable.",
  },
  {
    icon: ListChecks,
    title: "Scoring + corroboration",
    description:
      "Chaque startup obtient un score signal weight × mentions × récence, avec bonus cross-signal. Les pré-seed avec 4 canaux convergents remontent en tête.",
  },
  {
    icon: Building2,
    title: "Couverture France-first",
    description:
      "Requêtes natives FR (Pappers, HAL.science, INPI, Welcometothejungle, Agoranov/Wilco/Station F). Et requêtes globales en anglais quand la géographie l'exige.",
  },
  {
    icon: Sparkles,
    title: "Cache intelligent",
    description:
      "Les thèses, données marché et requêtes récurrentes sont mises en cache 14 jours — votre 2e analyse sur le même secteur coûte 60% moins de crédits, identique en qualité.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Conçu pour les analystes
              <span className="block text-gradient-ai-vc">qui veulent voir les deals avant les autres</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Pas un wrapper ChatGPT. Un vrai moteur de signaux faibles + due diligence, taillé pour le sourcing pré-seed et seed.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              className={`p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden backdrop-blur-sm ${
                feature.highlight
                  ? "bg-primary/15 border-primary/50 hover:border-primary/70 glow-ai-vc"
                  : "bg-card/70 border-primary/30 hover:border-primary/50"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                    feature.highlight ? "bg-primary/30 group-hover:bg-primary/40 glow-ai-vc" : "bg-primary/20 group-hover:bg-primary/30"
                  }`}
                >
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
