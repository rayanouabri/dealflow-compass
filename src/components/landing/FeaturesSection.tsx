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
    title: "Matching IA avancé",
    description: "Algorithme entraîné sur 10,000+ deals pour identifier les VCs les plus pertinents pour votre startup.",
    highlight: true
  },
  {
    icon: Sparkles,
    title: "Pitch decks personnalisés",
    description: "Génération automatique de decks adaptés à la thèse d'investissement de chaque fonds."
  },
  {
    icon: TrendingUp,
    title: "Intelligence marché",
    description: "Données en temps réel sur l'activité des fonds, portfolios et tendances d'investissement."
  },
  {
    icon: BarChart3,
    title: "Dashboard de suivi",
    description: "Centralisez vos interactions avec les VCs et mesurez votre progression."
  },
  {
    icon: Globe,
    title: "Couverture mondiale",
    description: "Accès à des fonds en Europe, Amérique du Nord, Asie et marchés émergents."
  },
  {
    icon: Zap,
    title: "Résultats instantanés",
    description: "Analyse complète en moins de 30 secondes grâce à notre pipeline IA optimisé."
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tout ce qu'il vous faut
              <span className="block text-gradient-success">pour lever</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              De la découverte de fonds à la préparation du pitch, nous couvrons tout le process.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              className={`p-6 rounded-2xl border transition-all duration-300 group ${
                feature.highlight 
                  ? 'bg-primary/5 border-primary/30 hover:border-primary/50' 
                  : 'bg-card border-border hover:border-primary/30'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                feature.highlight 
                  ? 'bg-primary/20 group-hover:bg-primary/30' 
                  : 'bg-primary/10 group-hover:bg-primary/20'
              }`}>
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
