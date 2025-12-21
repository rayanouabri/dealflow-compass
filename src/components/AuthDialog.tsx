import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";
import { SignupForm } from "@/components/SignupForm";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultView?: "login" | "signup";
}

export function AuthDialog({ open, onOpenChange, defaultView = "login" }: AuthDialogProps) {
  const [view, setView] = useState<"login" | "signup">(defaultView);

  // Update view when defaultView changes
  useEffect(() => {
    if (open) {
      setView(defaultView);
    }
  }, [defaultView, open]);

  const handleSuccess = () => {
    // Close dialog - parent will handle redirect
    onOpenChange(false);
    // Reset view to login for next time
    setTimeout(() => setView("login"), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "login" ? "Connexion" : "Créer un compte"}
          </DialogTitle>
          <DialogDescription>
            {view === "login"
              ? "Connectez-vous pour accéder à DealFlow Compass"
              : "Créez un compte gratuit pour commencer à sourcer des startups"}
          </DialogDescription>
        </DialogHeader>
        {view === "login" ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToSignup={() => setView("signup")}
          />
        ) : (
          <SignupForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setView("login")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

