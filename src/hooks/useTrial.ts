import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

const TRIAL_KEY = "dealflow_trial_count";
// Visiteurs anonymes : quelques essais gratuits avant inscription.
// Comptes connectés : ILLIMITÉ (pas de limite d'analyses par compte).
const MAX_FREE_ANALYSES = 3;

export function useTrial() {
  const { user } = useAuth();
  const [usedCount, setUsedCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(TRIAL_KEY);
    if (stored) setUsedCount(parseInt(stored, 10));
  }, []);

  const unlimited = !!user;
  const trialRemaining = unlimited ? Infinity : Math.max(0, MAX_FREE_ANALYSES - usedCount);
  const hasTrialRemaining = unlimited || trialRemaining > 0;

  const useTrialCredit = () => {
    if (unlimited) return true; // comptes connectés : aucune décrémentation
    const newCount = usedCount + 1;
    setUsedCount(newCount);
    localStorage.setItem(TRIAL_KEY, newCount.toString());
    return newCount <= MAX_FREE_ANALYSES;
  };

  const resetTrial = () => {
    setUsedCount(0);
    localStorage.removeItem(TRIAL_KEY);
  };

  return {
    usedCount,
    unlimited,
    trialRemaining,
    hasTrialRemaining,
    useTrialCredit,
    resetTrial,
    maxFreeAnalyses: MAX_FREE_ANALYSES,
  };
}
