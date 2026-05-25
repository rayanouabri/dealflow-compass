import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAppStore } from '@/store/useAppStore';

type PhaseType = 'search_fund' | 'search_market' | 'search_startups' | 'analyze' | null;

interface PipelineState {
  jobId: string | null;
  currentPhase: PhaseType;
  loading: boolean;
  error: string | null;
  progress: number; // 0-100
}

interface AnalysisParams {
  fundName?: string;
  customThesis?: any;
  numberOfStartups?: number;
}

export function useAnalysisPipeline() {
  const { setAnalysisPhase, setAnalysisJobId, setAnalysisLoading, setAnalysisError } =
    useAppStore();

  // Mutation: Start analysis (creates sourcing job)
  const startAnalysisMutation = useMutation({
    mutationFn: async (params: AnalysisParams) => {
      const { data, error } = await supabase
        .from('sourcing_jobs')
        .insert([
          {
            user_id: (await supabase.auth.getUser()).data.user?.id,
            fund_name: params.fundName || null,
            custom_thesis: params.customThesis || null,
            params: { numberOfStartups: params.numberOfStartups || 5 },
            status: 'created',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAnalysisJobId(data.id);
    },
    onError: (error) => {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to start analysis');
    },
  });

  // Query: Poll job status
  const jobStatusQuery = useQuery({
    queryKey: ['analysisJob', startAnalysisMutation.data?.id],
    queryFn: async () => {
      if (!startAnalysisMutation.data?.id) return null;

      const { data, error } = await supabase
        .from('sourcing_jobs')
        .select('*')
        .eq('id', startAnalysisMutation.data.id)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: (data) => {
      // Stop polling when done
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
    enabled: !!startAnalysisMutation.data?.id,
  });

  // Mutation: Execute phase
  const executePhase = useMutation({
    mutationFn: async ({
      phase,
      params,
    }: {
      phase: PhaseType;
      params?: any;
    }) => {
      setAnalysisPhase(phase);
      setAnalysisLoading(true);

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            phase,
            jobId: startAnalysisMutation.data?.id,
            ...params,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Phase execution failed');
        }

        return await response.json();
      } finally {
        setAnalysisLoading(false);
      }
    },
    onError: (error) => {
      setAnalysisError(error instanceof Error ? error.message : 'Unknown error');
    },
  });

  const progress = (() => {
    const status = jobStatusQuery.data?.status;
    switch (status) {
      case 'created': return 10;
      case 'thesis_done': return 30;
      case 'market_done': return 50;
      case 'startups_ranked': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  })();

  return {
    // State
    jobId: startAnalysisMutation.data?.id,
    currentPhase: jobStatusQuery.data?.status,
    progress,
    loading: startAnalysisMutation.isPending || jobStatusQuery.isLoading,
    error: startAnalysisMutation.error || jobStatusQuery.error,

    // Methods
    startAnalysis: startAnalysisMutation.mutate,
    executePhase: executePhase.mutate,
    retryPhase: () => jobStatusQuery.refetch(),

    // Raw data
    jobData: jobStatusQuery.data,
  };
}
