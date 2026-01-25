import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AuthDialog } from "@/components/AuthDialog";
import { LandingPage } from "@/components/LandingPage";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { trialRemaining, hasTrialRemaining } = useTrial();

  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (authLoading || !user || showAuthDialog) return;
    const t = setTimeout(() => navigate("/analyser", { replace: true }), 200);
    return () => clearTimeout(t);
  }, [user, authLoading, showAuthDialog, navigate]);

  const handleStartTrial = () => {
    if (hasTrialRemaining) {
      navigate("/analyser");
      return;
    }
    if (!user) {
      setAuthView("signup");
      setShowAuthDialog(true);
    } else {
      setShowPaywall(true);
    }
  };

  const handleLogin = () => {
    setAuthView("login");
    setShowAuthDialog(true);
  };

  if (authLoading) return null;

  return (
    <>
      <LandingPage
        onStartTrial={handleStartTrial}
        onLogin={handleLogin}
        trialRemaining={trialRemaining}
      />
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultView={authView}
        onAuthSuccess={() => setShowAuthDialog(false)}
      />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trialRemaining={trialRemaining}
      />
    </>
  );
}
