import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, FileText, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Définissez votre thèse",
    description: "Entrez le nom d'un fonds (ex: \"Partech\") ou définissez votre propre thèse (secteur, géographie, stade). L'IA reconstruit automatiquement le profil d'investissement du fonds à partir de son portfolio réel.",
    bullets: [
      "Reconnaissance auto des fonds européens & mondiaux",
      "Thèse personnalisable (secteur, ticket, stade)",
      "Paramètres avancés (géographie, maturité, secteur)",
    ],
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Sourcing IA multi-sources",
    description: "Le moteur lance en parallèle plus de 70 requêtes de recherche ciblées via Brave Search, déduplique et classe les résultats, puis un agent Gemini AI sélectionne les startups les plus pertinentes.",
    bullets: [
      "70+ requêtes Brave Search exécutées en parallèle",
      "Déduplication et ranking automatique des résultats",
      "Agent Gemini AI : sélection & scoring des candidats",
      "Matching par secteur, stade et géographie",
      "Résultats en moins de 5 minutes",
    ],
  },
  {
    number: "03",
    icon: FileText,
    title: "Due diligence automatisée",
    description: "Rapport professionnel complet généré pour chaque startup identifiée, incluant toutes les dimensions d'analyse VC.",
    bullets: [
      "Résumé exécutif + recommandation",
      "Analyse marché : TAM / SAM / SOM / CAGR",
      "Profil équipe fondateurs + LinkedIn",
      "Historique de financement & valorisation",
      "Analyse concurrentielle détaillée",
      "Score de confiance IA",
    ],
  },
  {
    number: "04",
    icon: Send,
    title: "Décision & Export",
    description: "Exportez, partagez et décidez. Toutes vos analyses sont sauvegardées et accessibles depuis votre dashboard.",
    bullets: [
      "Export Markdown & PDF",
      "Chat IA Q&A sur chaque rapport",
      "Historique de toutes vos analyses",
      "Partage avec votre équipe",
    ],
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 relative" id="how-it-works">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              Comment ça marche
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Du sourcing à la décision
              <span className="block text-gradient-ai-vc">en 4 étapes automatisées</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Plus besoin de passer des semaines à rechercher et analyser des startups. Automatisez votre sourcing et due diligence.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="relative group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
              )}
              
              <div className="relative p-6 rounded-2xl bg-card/80 border border-primary/40 hover:border-primary/60 transition-all duration-300 h-full group-hover:shadow-lg group-hover:shadow-primary/30 backdrop-blur-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center glow-ai-vc border-2 border-background">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-all group-hover:scale-110">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground relative z-10">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10 mb-4">{step.description}</p>

                <ul className="space-y-1.5 relative z-10">
                  {step.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary font-bold mt-0.5 flex-shrink-0">✓</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
