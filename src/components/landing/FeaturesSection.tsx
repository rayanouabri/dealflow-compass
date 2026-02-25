import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Sparkles, 
  TrendingUp, 
  Globe, 
  Zap,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "100+ requêtes web en parallèle",
    description: "L'outil lance plus de 100 requêtes web simultanées pour collecter des données sur le produit, le marché, l'équipe, le financement et la traction.",
    highlight: true
  },
  {
    icon: Sparkles,
    title: "Agent IA — rapport structuré",
    description: "Un agent IA analyse le contexte collecté et génère un rapport JSON complet : résumé exécutif, TAM/SAM/SOM, équipe, concurrents et recommandation d'investissement."
  },
  {
    icon: TrendingUp,
    title: "Pipeline en 2 phases",
    description: "Phase 1 : recherche web (requêtes parallèles, déduplication, structuration). Phase 2 : analyse IA du contexte et génération du rapport complet."
  },
  {
    icon: BarChart3,
    title: "10+ catégories analysées",
    description: "Produit, marché, équipe, financement, traction, concurrents, technologie, actualités, recrutement — couverts de manière exhaustive."
  },
  {
    icon: Target,
    title: "Recommandation d'investissement",
    description: "INVEST / WATCH / PASS avec niveau de confiance, points forts, risques clés et prochaines étapes suggérées pour la due diligence."
  },
  {
    icon: Zap,
    title: "Résultats en ~5 minutes",
    description: "De la saisie du nom au rapport complet en environ 5 minutes. Sources vérifiées, rapport exportable en Markdown."
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Tout ce qu'il vous faut
              <span className="block text-gradient-ai-vc">pour investir</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Du sourcing de startups à la due diligence complète, nous automatisons tout votre processus d'investissement.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              className={`p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden backdrop-blur-sm ${
                feature.highlight 
                  ? 'bg-primary/15 border-primary/50 hover:border-primary/70 glow-ai-vc' 
                  : 'bg-card/70 border-primary/30 hover:border-primary/50'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all ${
                  feature.highlight 
                    ? 'bg-primary/30 group-hover:bg-primary/40 glow-ai-vc' 
                    : 'bg-primary/20 group-hover:bg-primary/30'
                }`}>
                  <feature.icon className="w-7 h-7 text-primary" />
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
