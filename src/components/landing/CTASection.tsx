import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

interface CTASectionProps {
  onStartTrial: () => void;
}

export function CTASection({ onStartTrial }: CTASectionProps) {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 terminal-grid opacity-[0.05]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(48,100%,55%,0.1),transparent_70%)]" />
      
      <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-8 backdrop-blur-sm glow-ai-vc">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Premier deal en 5 minutes</span>
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Arrêtez de scroller LinkedIn.
            <span className="block text-gradient-ai-vc mt-2 drop-shadow-[0_0_20px_rgba(48,100%,55%,0.3)]">Laissez l'IA vous trouver le deal.</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Entrez le nom de votre fonds. Recevez une startup alignée à votre thèse + son rapport de due diligence sourcé.
            <span className="block mt-1 text-primary font-medium">5 essais gratuits, sans carte bancaire.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={onStartTrial}
              className="gap-2 px-10 h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc shadow-[0_0_40px_rgba(48,100%,55%,0.5)] group"
            >
              <Zap className="w-5 h-5" />
              Lancer mon premier sourcing
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              5 analyses offertes
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Due diligence sourcée incluse
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Données hébergées en EU
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Pas d'entraînement sur vos deals
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
