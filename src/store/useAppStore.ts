import { create } from 'zustand';
import { supabase } from '@/lib/supabase-client';

interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'starter' | 'professional';
  trial_credits_remaining: number;
}

interface AnalysisState {
  fundName: string;
  currentPhase: 'search_fund' | 'search_market' | 'search_startups' | 'pick' | null;
  jobId: string | null;
  loading: boolean;
  error: string | null;
}

interface AppStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // Trial
  trialRemaining: number;
  setTrialRemaining: (count: number) => void;

  // Analysis pipeline
  analysis: AnalysisState;
  setAnalysisPhase: (phase: AnalysisState['currentPhase']) => void;
  setAnalysisJobId: (jobId: string) => void;
  setAnalysisLoading: (loading: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  resetAnalysis: () => void;

  // Hydration from Supabase
  hydrate: () => Promise<void>;
}

const defaultAnalysisState: AnalysisState = {
  fundName: '',
  currentPhase: null,
  jobId: null,
  loading: false,
  error: null,
};

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  isAuthenticated: false,
  trialRemaining: 0,
  analysis: defaultAnalysisState,

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    trialRemaining: user?.trial_credits_remaining ?? 0
  }),

  setTrialRemaining: (count) => set({ trialRemaining: count }),

  setAnalysisPhase: (phase) => set((state) => ({
    analysis: { ...state.analysis, currentPhase: phase }
  })),

  setAnalysisJobId: (jobId) => set((state) => ({
    analysis: { ...state.analysis, jobId }
  })),

  setAnalysisLoading: (loading) => set((state) => ({
    analysis: { ...state.analysis, loading }
  })),

  setAnalysisError: (error) => set((state) => ({
    analysis: { ...state.analysis, error }
  })),

  resetAnalysis: () => set({ analysis: defaultAnalysisState }),

  hydrate: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email, subscription_tier, trial_credits_remaining')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        set({
          user: profile as User,
          isAuthenticated: true,
          trialRemaining: profile.trial_credits_remaining
        });
      }
    } catch (error) {
      console.error('Store hydration error:', error);
    }
  },
}));

// Subscribe to auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    await useAppStore.getState().hydrate();
  } else {
    useAppStore.getState().setUser(null);
  }
});
