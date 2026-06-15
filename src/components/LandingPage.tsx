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
import { Reveal } from "@/components/landing/Reveal";

interface LandingPageProps {
  onStartTrial: () => void;
  onSignup: () => void;
  onLogin: () => void;
  trialRemaining: number;
}

export function LandingPage({ onStartTrial, onSignup, onLogin, trialRemaining }: LandingPageProps) {
  const handleWatchDemo = () => {
    // Scroll to how it works section as a demo
    const element = document.querySelector('#how-it-works');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Header onSignup={onSignup} onLogin={onLogin} />
      <HeroSection 
        onStartTrial={onStartTrial} 
        onWatchDemo={handleWatchDemo}
        trialRemaining={trialRemaining} 
      />
      <Reveal><SocialProofBar /></Reveal>
      <Reveal><StatsSection /></Reveal>
      <Reveal><HowItWorksSection /></Reveal>
      <Reveal><DashboardPreview onStartTrial={onStartTrial} /></Reveal>
      <section id="features">
        <Reveal><FeaturesSection /></Reveal>
      </section>
      <Reveal><PricingSection onStartTrial={onStartTrial} /></Reveal>
      <Reveal><CTASection onStartTrial={onStartTrial} /></Reveal>
      <Footer />
    </div>
  );
}
