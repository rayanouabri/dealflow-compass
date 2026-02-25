import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";

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
            <span className="text-sm font-medium text-primary">Rejoignez-nous</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Prêt à automatiser votre
            <span className="block text-gradient-ai-vc mt-2 drop-shadow-[0_0_20px_rgba(48,100%,55%,0.3)]">sourcing et due diligence ?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Faites votre première analyse de startup gratuite en quelques minutes. 
            Sourcing IA et due diligence complète inclus.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={onStartTrial}
              className="gap-2 px-10 h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc shadow-[0_0_40px_rgba(48,100%,55%,0.5)] group"
            >
              <Zap className="w-5 h-5" />
              Commencer maintenant
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="gap-2 h-14 text-lg border-primary/30 hover:border-primary/60 hover:bg-primary/10"
            >
              <Link to="/exemple-morfo">
                Voir un exemple
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              3 analyses de startups gratuites
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Due diligence incluse
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Résultats en quelques minutes
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
