import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Rocket } from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialRemaining: number;
}

export function PaywallModal({ isOpen, onClose, trialRemaining }: PaywallModalProps) {
  const features = [
    "Unlimited fund analyses",
    "Advanced pitch deck customization",
    "Priority AI processing",
    "Export to PDF & PowerPoint",
    "Competitor analysis",
    "Market sizing reports",
    "Email support",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <Badge variant="secondary">Free Trial Ended</Badge>
          </div>
          <DialogTitle className="text-2xl">Unlock Full Access</DialogTitle>
          <DialogDescription className="text-base">
            {trialRemaining === 0 
              ? "You've used all your free analyses. Upgrade to continue analyzing funds and generating pitch decks."
              : `You have ${trialRemaining} free analyses remaining. Upgrade now for unlimited access.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="p-5 rounded-xl bg-card border border-primary/30 glow-success">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Pro Plan</h3>
                <p className="text-sm text-muted-foreground">Everything you need to raise</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="w-full gap-2 h-11" size="lg">
              <Rocket className="w-4 h-4" />
              Start 7-Day Free Trial
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              No credit card required • Cancel anytime
            </p>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Special Offer</p>
                <p className="text-xs text-muted-foreground">
                  Get 2 months free when you choose annual billing ($990/year instead of $1,188)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Maybe Later
          </Button>
          <Button className="flex-1 gap-2">
            <Crown className="w-4 h-4" />
            Upgrade Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
