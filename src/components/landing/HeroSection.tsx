import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { LiveDemo } from "@/components/landing/LiveDemo";

interface HeroSectionProps {
  onStartTrial: () => void;
  onWatchDemo: () => void;
  trialRemaining: number;
}

export function HeroSection({ onStartTrial, onWatchDemo }: HeroSectionProps) {
  return (
    <section className="pt-20 pb-24 md:pt-28 md:pb-32 border-b border-border/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Copy */}
          <div className="lg:col-span-6 max-w-xl">
            <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-[0.16em] mb-6">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Sourcing & due diligence pour fonds early-stage
            </p>

            <h1 className="font-display text-[2.5rem] md:text-[3.25rem] font-medium tracking-tight text-foreground leading-[1.08] mb-6">
              Trouvez la pépite alignée à votre thèse.<br className="hidden md:block" /> Et le mémo qui va avec.
            </h1>

            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed mb-8">
              L'IA croise Google, Dealroom, INSEE, GitHub et les portfolios
              d'accélérateurs pour remonter des startups early <strong className="text-foreground/90 font-medium">réellement
              on-thesis</strong> — pas les noms déjà sur toutes les lèvres. Elle les
              note sur la qualité d'investissement (équipe, moat, marché) puis rédige
              une due diligence de niveau comité où <strong className="text-foreground/90 font-medium">chaque
              affirmation est chiffrée et sourcée</strong>. Export PDF en un clic.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-6">
              <Button
                size="lg"
                onClick={onStartTrial}
                className="gap-2 h-11 px-6 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
              >
                Lancer une analyse
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={onWatchDemo}
                className="h-11 px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Voir la méthode
              </Button>
            </div>

            <p className="text-[13px] text-muted-foreground">
              Compte gratuit · analyses illimitées · sans carte bancaire.
            </p>
          </div>

          {/* Démo animée d'un run réel */}
          <div className="lg:col-span-6 lg:pl-4">
            <LiveDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
