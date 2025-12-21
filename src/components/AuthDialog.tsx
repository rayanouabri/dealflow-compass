import { useState } from "react";
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

  const handleSuccess = () => {
    onOpenChange(false);
    setView("login");
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

