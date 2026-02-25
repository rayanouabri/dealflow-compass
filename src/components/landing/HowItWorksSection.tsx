import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, FileText, Send, Globe, Brain, Database, BarChart3 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Saisie de l'entreprise",
    description: "Entrez le nom et/ou le site web de la startup à analyser. L'outil démarre immédiatement le pipeline d'analyse.",
    color: "primary",
    badge: "Démarrage"
  },
  {
    number: "02",
    icon: Globe,
    title: "Phase Search — 100+ requêtes",
    description: "L'outil lance 100+ requêtes web en parallèle : produit, marché, équipe, financement, traction, concurrents, technologie, actualités, recrutement. Déduplication et structuration automatique.",
    color: "accent",
    badge: "~2 min"
  },
  {
    number: "03",
    icon: Brain,
    title: "Phase IA — Analyse & rapport",
    description: "Un agent IA reçoit le contexte structuré et génère un rapport JSON complet : résumé exécutif, produit, marché (TAM/SAM/SOM), équipe, financement, concurrents, traction, recommandation d'investissement.",
    color: "success",
    badge: "~3 min"
  },
  {
    number: "04",
    icon: FileText,
    title: "Rapport structuré & export",
    description: "Rapport complet avec sources vérifiées, recommandation d'investissement (INVEST/WATCH/PASS) et niveau de confiance. Exportable en Markdown.",
    color: "data-amber",
    badge: "Résultat"
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
              Du nom de startup au rapport
              <span className="block text-gradient-ai-vc">en ~5 minutes</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Un pipeline en 2 phases : 100+ requêtes web pour collecter les données, puis un agent IA pour générer le rapport complet.
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
                
                {/* Badge */}
                <div className="absolute top-2 right-3">
                  <span className="text-xs text-primary/70 font-medium">{step.badge}</span>
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-all group-hover:scale-110">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground relative z-10">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 2-phase highlight */}
        <motion.div
          className="mt-12 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <div className="p-5 rounded-2xl bg-card/80 border border-primary/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Phase 1 — Search</p>
                <p className="text-xs text-muted-foreground">100+ requêtes web en parallèle</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Collecte de données sur le produit, le marché, l'équipe, le financement, la traction, les concurrents, la technologie et l'actualité. Déduplication et structuration automatiques.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-card/80 border border-primary/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Phase 2 — Agent IA</p>
                <p className="text-xs text-muted-foreground">Rapport structuré complet</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Résumé exécutif, produit, marché (TAM/SAM/SOM), équipe, financement, concurrents, traction, risques et recommandation d'investissement avec niveau de confiance.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
