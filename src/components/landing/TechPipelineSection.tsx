import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Search, Brain, Filter, FileText, ArrowRight, Zap } from "lucide-react";

const pipelineSteps = [
  {
    icon: Brain,
    label: "Analyse de thèse",
    description: "L'agent IA reconstruit le profil d'investissement du fonds (secteurs, stade, géographie) à partir de son portfolio réel.",
    detail: "1 appel IA",
  },
  {
    icon: Search,
    label: "100+ requêtes en parallèle",
    description: "Le moteur exécute en simultané plus de 100 requêtes de recherche ciblées : nom, secteur, concurrents, financements, équipe fondatrice...",
    detail: "Moteur de recherche",
  },
  {
    icon: Filter,
    label: "Déduplication & ranking",
    description: "Les résultats bruts sont dédupliqués, classés par pertinence et regroupés par catégorie (produit, marché, concurrents, équipe...).",
    detail: "Algorithme interne",
  },
  {
    icon: Brain,
    label: "Sélection IA (Picking)",
    description: "Un agent IA analyse les 10 meilleurs candidats et sélectionne la startup la plus pertinente pour votre thèse.",
    detail: "Scoring multi-critères",
  },
  {
    icon: FileText,
    label: "Due diligence complète",
    description: "50+ requêtes de recherche supplémentaires sur la startup sélectionnée, puis génération du rapport complet par l'agent IA.",
    detail: "Rapport structuré",
  },
];

const analysisCategories = [
  { label: "Résumé exécutif", sub: "Synthèse & recommandation d'investissement" },
  { label: "Produit & Tech", sub: "Stack, différenciation, barrières à l'entrée" },
  { label: "Marché", sub: "TAM / SAM / SOM / CAGR — chiffré" },
  { label: "Concurrence", sub: "Positionnement & avantages compétitifs" },
  { label: "Équipe", sub: "Profils fondateurs, expériences, LinkedIn" },
  { label: "Financement", sub: "Historique des levées & valorisations" },
  { label: "Traction", sub: "Métriques clés, clients, croissance" },
  { label: "Score IA", sub: "Confiance globale sur 100" },
];

export function TechPipelineSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden" id="pipeline">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent" />
      <div className="absolute inset-0 terminal-grid opacity-[0.04]" />

      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 mr-2 text-primary" />
              Moteur IA
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Comment fonctionne
              <span className="block text-gradient-ai-vc">le moteur d'analyse</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Sous le capot, un pipeline orchestré en plusieurs phases exécute des centaines de recherches, 
              filtre, classe et synthétise pour vous livrer une due diligence de niveau professionnel.
            </p>
          </motion.div>
        </div>

        {/* Pipeline flow */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-2 justify-center">
            {pipelineSteps.map((step, i) => (
              <div key={i} className="flex lg:flex-col items-center gap-3 lg:gap-2 flex-1 min-w-0">
                <div className="flex lg:flex-col items-center gap-3 w-full">
                  {/* Card */}
                  <div className="flex-1 lg:w-full p-4 rounded-xl bg-card/80 border border-primary/30 backdrop-blur-sm hover:border-primary/50 transition-all group">
                    <div className="flex lg:flex-col items-start lg:items-center gap-3 lg:gap-2 lg:text-center">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-all">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">{step.label}</p>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {step.detail}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed hidden lg:block">{step.description}</p>
                  </div>

                  {/* Arrow */}
                  {i < pipelineSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-primary/40 flex-shrink-0 rotate-90 lg:rotate-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Due diligence report content */}
        <motion.div
          className="grid lg:grid-cols-2 gap-8 items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          {/* Left — explanation */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Un rapport de due diligence
              <span className="block text-gradient-ai-vc">structuré en 8 sections</span>
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Après la phase de recherche (50+ requêtes sur la startup sélectionnée),
              l'agent IA synthétise l'ensemble du contexte collecté en un rapport complet couvrant
              toutes les dimensions qu'un analyste VC examine avant un investissement.
            </p>
            <ul className="space-y-2">
              {[
                "Analyse en deux phases indépendantes (recherche + synthèse IA)",
                "Contexte brut de plus de 150 résultats web dédupliqués",
                "Prompt optimisé pour le standard VC Series A/B",
                "Score de confiance calculé sur 7 critères pondérés",
                "Export Markdown ou PDF en un clic",
                "Chat IA Q&A pour approfondir chaque section",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — report sections mockup */}
          <div className="rounded-2xl border border-primary/30 bg-card/70 backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(48,100%,55%,0.08)]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Rapport de Due Diligence — Exemple</span>
            </div>
            <div className="p-4 space-y-2">
              {analysisCategories.map((cat, i) => (
                <motion.div
                  key={cat.label}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-all group"
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.sub}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-all" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
