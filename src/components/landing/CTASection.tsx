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
      <div className="absolute inset-0 terminal-grid opacity-20" />
      
      <div className="container max-w-4xl mx-auto px-4 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Rejoignez-nous</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            Prêt à automatiser votre
            <span className="block text-gradient-success mt-2">sourcing et due diligence ?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Faites votre première analyse de startup gratuite en quelques minutes. 
            Sourcing IA et due diligence complète inclus.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={onStartTrial}
              className="gap-2 px-10 h-14 text-lg glow-success group"
            >
              <Zap className="w-5 h-5" />
              Commencer maintenant
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
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
