import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, FileText, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Définissez votre thèse",
    description: "Entrez le nom de votre fonds VC. Notre IA analyse automatiquement votre thèse d'investissement basée sur votre portfolio réel.",
    color: "primary"
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Sourcing intelligent",
    description: "Notre algorithme identifie des startups réelles qui correspondent parfaitement à votre thèse d'investissement (secteur, stade, géographie).",
    color: "accent"
  },
  {
    number: "03",
    icon: FileText,
    title: "Due diligence automatisée",
    description: "Recevez un rapport de due diligence complet : marché, produit, traction, équipe, analyse concurrentielle et recommandation d'investissement.",
    color: "success"
  },
  {
    number: "04",
    icon: Send,
    title: "Décision éclairée",
    description: "Exportez vos rapports, partagez avec votre équipe et prenez des décisions d'investissement basées sur des données approfondies.",
    color: "data-amber"
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
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              Comment ça marche
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Du sourcing à la décision
              <span className="block text-gradient-success">en 4 étapes automatisées</span>
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
              
              <div className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 h-full group-hover:shadow-lg group-hover:shadow-primary/5">
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
