import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Sparkles, Zap, Radar, FileSearch, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onStartTrial: () => void;
  onWatchDemo: () => void;
  trialRemaining: number;
}

export function HeroSection({ onStartTrial, onWatchDemo, trialRemaining }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-40">
      {/* Animated background effects */}
      <div className="absolute inset-0 terminal-grid opacity-[0.08]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(48,100%,55%,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(220,50%,40%,0.1),transparent_50%)]" />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
      
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="mb-6 px-4 py-2 text-sm border-primary/40 bg-primary/20 backdrop-blur-sm glow-ai-vc"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary animate-pulse" />
              Sourcing pré-seed · Signaux faibles · Due diligence en 2 minutes
            </Badge>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Trouvez les startups
            <span className="block text-gradient-ai-vc mt-2 drop-shadow-[0_0_20px_rgba(48,100%,55%,0.3)]">
              avant Crunchbase
            </span>
            <span className="block text-2xl md:text-3xl lg:text-4xl font-medium text-muted-foreground mt-4">
              12 canaux de signaux faibles agrégés en un seul deck
            </span>
          </motion.h1>

          {/* Subtitle - Benefit oriented */}
          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Entrez votre <span className="text-foreground font-medium">thèse</span> (ou juste le nom de votre fonds).
            Notre moteur croise <span className="text-foreground font-medium">LinkedIn, brevets, GitHub, arXiv, ProductHunt</span> et
            sort la startup la plus alignée — avec rapport de due diligence sourcé.
            <span className="block mt-2 text-primary font-medium">2 jours de travail analyste → 5 minutes.</span>
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
              className="gap-2 px-8 h-14 text-base bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc group shadow-[0_0_30px_rgba(48,100%,55%,0.4)]"
            >
              <Zap className="w-5 h-5" />
              Démarrer le sourcing IA
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={onWatchDemo}
              className="gap-2 px-6 h-14 text-base border-primary/30 hover:border-primary/60 hover:bg-primary/10 backdrop-blur-sm"
            >
              <Play className="w-4 h-4" />
              Voir la démo (2 min)
            </Button>
          </motion.div>

          {/* Trial info */}
          <motion.p
            className="text-sm text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {trialRemaining > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="status-dot" />
                {trialRemaining} analyses gratuites restantes · Sans carte bancaire
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                5 analyses gratuites · Sans carte bancaire · Annulation à tout moment
              </span>
            )}
          </motion.p>

          {/* Concrete metric chips */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { icon: Radar, label: "12 canaux de signaux", sub: "LinkedIn · Brevets · GitHub · arXiv …" },
              { icon: Building2, label: "Détection pré-seed", sub: "Trouve avant Crunchbase / PitchBook" },
              { icon: FileSearch, label: "DD sourcée ~2 min", sub: "Chaque affirmation a son URL" },
            ].map((chip, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/50 border border-primary/20 backdrop-blur-sm"
              >
                <chip.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex flex-col leading-tight text-left">
                  <span className="text-xs font-semibold text-foreground">{chip.label}</span>
                  <span className="text-[10px] text-muted-foreground">{chip.sub}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
