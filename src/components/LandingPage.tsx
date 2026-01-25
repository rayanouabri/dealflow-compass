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
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#0a0a0f] to-black -z-10" />
      <div className="fixed inset-0 terminal-grid opacity-[0.03] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(48,100%,55%,0.05),transparent_50%)] -z-10" />
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
