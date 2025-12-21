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
  onAuthSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, defaultView = "login", onAuthSuccess }: AuthDialogProps) {
  const [view, setView] = useState<"login" | "signup">(defaultView);

  // Update view when defaultView changes
  useEffect(() => {
    if (open) {
      setView(defaultView);
    }
  }, [defaultView, open]);

  const handleSuccess = () => {
    console.log("AuthDialog: handleSuccess called");
    // Close dialog - parent will handle redirect
    onOpenChange(false);
    // Call success callback if provided
    if (onAuthSuccess) {
      setTimeout(() => {
        onAuthSuccess();
      }, 200);
    }
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

