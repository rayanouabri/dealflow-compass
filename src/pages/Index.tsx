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

  // « Lancer une analyse » : accès direct à l'app (analyses illimitées, sans gate).
  const handleStartTrial = () => {
    navigate("/analyser");
  };

  const handleSignup = () => {
    setAuthView("signup");
    setShowAuthDialog(true);
  };

  const handleLogin = () => {
    setAuthView("login");
    setShowAuthDialog(true);
  };

  // Never return null — a blank page is worse than showing the landing page
  // while auth resolves (loading stays true if getSession() hangs on some browsers)

  return (
    <>
      <LandingPage
        onStartTrial={handleStartTrial}
        onSignup={handleSignup}
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
