import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onStartTrial: () => void;
  onWatchDemo: () => void;
  trialRemaining: number;
}

export function HeroSection({ onStartTrial, onWatchDemo, trialRemaining }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-40">
      {/* Background effects */}
      <div className="absolute inset-0 terminal-grid opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge 
              variant="outline" 
              className="mb-6 px-4 py-2 text-sm border-primary/30 bg-primary/5 backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary animate-pulse" />
              +2,400 startups connectées avec leur VC idéal
            </Badge>
          </motion.div>
          
          {/* Main heading */}
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Trouvez votre
            <span className="block text-gradient-success mt-2">investisseur idéal</span>
            <span className="block text-2xl md:text-3xl lg:text-4xl font-medium text-muted-foreground mt-4">
              en 30 secondes
            </span>
          </motion.h1>
          
          {/* Subtitle - Benefit oriented */}
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Notre IA analyse <span className="text-foreground font-medium">500+ fonds VC</span> et génère 
            des pitch decks personnalisés selon leur thèse d'investissement.
            <span className="block mt-2 text-primary font-medium">Fini les emails à froid. Ciblez juste.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button 
              size="lg" 
              onClick={onStartTrial}
              className="gap-2 px-8 h-14 text-base glow-success group"
            >
              <Zap className="w-5 h-5" />
              Analyser un fond gratuitement
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={onWatchDemo}
              className="gap-2 px-6 h-14 text-base border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <Play className="w-4 h-4" />
              Voir la démo (2 min)
            </Button>
          </motion.div>

          {/* Trial info */}
          <motion.p 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {trialRemaining > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="status-dot" />
                {trialRemaining} analyses gratuites • Sans création de compte
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✓ Sans carte bancaire • ✓ Résultats instantanés • ✓ Export inclus
              </span>
            )}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
