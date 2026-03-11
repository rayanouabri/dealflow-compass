import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Sparkles, Zap, Brain } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onStartTrial: () => void;
  onWatchDemo: () => void;
  trialRemaining: number;
}

const demoQuery = "Trouve-moi des startups SaaS B2B en early stage dans la FinTech en Europe pour un fonds comme Partech...";

const mockStartups = [
  { name: "Fintory", sector: "FinTech SaaS", score: 94, stage: "Seed" },
  { name: "PayLayer", sector: "Payments B2B", score: 88, stage: "Pre-seed" },
  { name: "LedgerFlow", sector: "FinTech B2B", score: 82, stage: "Series A" },
];

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
            className="flex flex-col items-center gap-2 mb-6"
          >
            <Badge 
              variant="outline" 
              className="px-4 py-2 text-sm border-primary/40 bg-primary/20 backdrop-blur-sm glow-ai-vc"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary animate-pulse" />
              Outil de sourcing et d'analyse de startups • Due diligence automatisée
            </Badge>
            <Badge
              variant="outline"
              className="px-3 py-1 text-xs border-primary/30 bg-primary/10 backdrop-blur-sm text-muted-foreground"
            >
              <Brain className="w-3 h-3 mr-1.5 text-primary" />
              Propulsé par un agent IA multi-sources
            </Badge>
          </motion.div>
          
          {/* Main heading */}
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Sourcez les meilleures
            <span className="block text-gradient-ai-vc mt-2 drop-shadow-[0_0_20px_rgba(48,100%,55%,0.3)]">
              opportunités d'investissement
            </span>
            <span className="block text-2xl md:text-3xl lg:text-4xl font-medium text-muted-foreground mt-4">
              en quelques minutes
            </span>
          </motion.h1>
          
          {/* Subtitle - Benefit oriented */}
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Entrez le nom d'un fonds VC ou décrivez votre thèse. Notre IA{" "}
            <span className="text-foreground font-medium">analyse le profil d'investissement</span>{" "}
            et source instantanément des startups réelles qui matchent — avec due diligence complète incluse.
            <span className="block mt-2 text-primary font-medium">Automatisez votre sourcing. Investissez mieux.</span>
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
            className="text-sm text-muted-foreground mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {trialRemaining > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="status-dot" />
                {trialRemaining} analyses de startups gratuites • Due diligence incluse
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✓ Sourcing automatisé • ✓ Due diligence complète • ✓ Rapports exportables
              </span>
            )}
          </motion.p>

          {/* Vibe Sourcing Demo */}
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <div className="rounded-2xl border border-primary/30 bg-card/70 backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(48,100%,55%,0.12)]">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">AI-VC Sourcing Engine</span>
              </div>

              {/* Query line */}
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs text-muted-foreground font-mono mb-2">$ sourcing --query</p>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono text-sm mt-0.5">›</span>
                  <p className="text-sm text-foreground/90 font-mono leading-relaxed text-left">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 2.5, delay: 0.8 }}
                    >
                      {demoQuery}
                    </motion.span>
                  </p>
                </div>
              </div>

              {/* Results */}
              <motion.div
                className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.6 }}
              >
                {mockStartups.map((startup, i) => (
                  <motion.div
                    key={startup.name}
                    className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-left"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.7 + i * 0.15 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">{startup.name}</p>
                      <span className="text-xs font-bold text-primary">{startup.score}/100</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{startup.sector}</p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {startup.stage}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
