import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onStartTrial: () => void;
}

export function CTASection({ onStartTrial }: CTASectionProps) {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl md:text-[2.5rem] font-medium tracking-tight text-foreground leading-tight mb-5">
            Votre prochain deal est déjà dans les signaux.
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Cochez vos secteurs et stades, précisez votre thèse. En quelques minutes, vous avez
            une startup alignée avec vos critères et son rapport de due diligence sourcé.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Button
              size="lg"
              onClick={onStartTrial}
              className="gap-2 h-11 px-6 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
            >
              Créer mon compte gratuit
              <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-[13px] text-muted-foreground sm:pt-3">
              Analyses illimitées, sans carte bancaire.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
