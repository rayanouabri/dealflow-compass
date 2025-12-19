import { useState, useEffect } from "react";

const TRIAL_KEY = "dealflow_trial_count";
const MAX_FREE_ANALYSES = 3;

export function useTrial() {
  const [usedCount, setUsedCount] = useState(0);
  
  useEffect(() => {
    const stored = localStorage.getItem(TRIAL_KEY);
    if (stored) {
      setUsedCount(parseInt(stored, 10));
    }
  }, []);

  const trialRemaining = Math.max(0, MAX_FREE_ANALYSES - usedCount);
  const hasTrialRemaining = trialRemaining > 0;

  const useTrialCredit = () => {
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
    trialRemaining,
    hasTrialRemaining,
    useTrialCredit,
    resetTrial,
    maxFreeAnalyses: MAX_FREE_ANALYSES,
  };
}
