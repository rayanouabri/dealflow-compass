// Analyses illimitées pour tous. Le contrôle de coût (anti-abus) est assuré
// côté serveur par le plafond de jobs CONCURRENTS (pipeline-orchestrator),
// pas par un quota d'analyses. On conserve l'API du hook pour compatibilité.
export function useTrial() {
  return {
    usedCount: 0,
    unlimited: true,
    trialRemaining: Infinity,
    hasTrialRemaining: true,
    useTrialCredit: () => true,
    resetTrial: () => {},
    maxFreeAnalyses: Infinity,
  };
}
