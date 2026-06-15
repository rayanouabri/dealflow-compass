import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

// Réserve une route aux utilisateurs connectés. Tant que la session se résout on
// affiche un loader (évite un flash de redirection au refresh). Les non-connectés
// sont renvoyés à la landing avec un état `requireAuth` pour y ouvrir la connexion.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{ requireAuth: true, from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
