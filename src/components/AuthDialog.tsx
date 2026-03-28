import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultView?: "login" | "signup";
  onAuthSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, defaultView = "login", onAuthSuccess }: AuthDialogProps) {
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
  };

  // Debug: log when dialog open state changes
  useEffect(() => {
    console.log("AuthDialog open state:", open);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connexion</DialogTitle>
          <DialogDescription>
            Connectez-vous pour accéder à DealFlow Compass
          </DialogDescription>
        </DialogHeader>
        <LoginForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}

