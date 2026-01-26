import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { StatsSection } from "@/components/landing/StatsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

interface LandingPageProps {
  onStartTrial: () => void;
  onLogin: () => void;
  trialRemaining: number;
}

export function LandingPage({ onStartTrial, onLogin, trialRemaining }: LandingPageProps) {
  const handleWatchDemo = () => {
    // Scroll to how it works section as a demo
    const element = document.querySelector('#how-it-works');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background dark">
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#252540] to-[#1a1a2e] -z-10" />
      <div className="fixed inset-0 terminal-grid opacity-[0.12] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(48,100%,60%,0.25),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(220,50%,50%,0.18),transparent_50%)] -z-10" />
      <Header onStartTrial={onStartTrial} onLogin={onLogin} />
      <HeroSection 
        onStartTrial={onStartTrial} 
        onWatchDemo={handleWatchDemo}
        trialRemaining={trialRemaining} 
      />
      <SocialProofBar />
      <StatsSection />
      <HowItWorksSection />
      <DashboardPreview onStartTrial={onStartTrial} />
      <section id="features">
        <FeaturesSection />
      </section>
      <PricingSection onStartTrial={onStartTrial} />
      <CTASection onStartTrial={onStartTrial} />
      <Footer />
    </div>
  );
}
