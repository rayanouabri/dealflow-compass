import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Sparkles, 
  TrendingUp, 
  Shield, 
  Globe, 
  Zap,
  BarChart3,
  FileText,
  Users
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Sourcing IA avancé",
    description: "Algorithme entraîné sur 10,000+ deals pour identifier les startups les plus pertinentes selon votre thèse d'investissement.",
    highlight: true
  },
  {
    icon: Sparkles,
    title: "Due diligence automatisée",
    description: "Rapports d'analyse complets : marché, produit, traction, équipe, concurrents et recommandation d'investissement."
  },
  {
    icon: TrendingUp,
    title: "Intelligence marché",
    description: "Données en temps réel sur les startups, leurs métriques, levées de fonds et positionnement concurrentiel."
  },
  {
    icon: BarChart3,
    title: "Dashboard de suivi",
    description: "Centralisez vos analyses de startups, suivez vos opportunités et mesurez votre pipeline de deals."
  },
  {
    icon: Globe,
    title: "Couverture mondiale",
    description: "Accès à des startups en Europe, Amérique du Nord, Asie et marchés émergents."
  },
  {
    icon: Zap,
    title: "Résultats rapides",
    description: "Sourcing et due diligence complète en quelques minutes grâce à notre pipeline IA optimisé."
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
                  ? 'bg-primary/10 border-primary/40 hover:border-primary/60 glow-ai-vc' 
                  : 'bg-card/50 border-primary/20 hover:border-primary/40'
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
