import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Phase {
  key: string;
  label: string;
  description: string;
}

const PHASES: Phase[] = [
  { key: 'created', label: 'Fund Research', description: 'Analyzing fund thesis and portfolio' },
  { key: 'thesis_done', label: 'Market Analysis', description: 'Researching market trends' },
  { key: 'market_done', label: 'Startup Discovery', description: 'Finding relevant startups' },
  { key: 'startups_ranked', label: 'Final Analysis', description: 'AI due diligence' },
  { key: 'completed', label: 'Complete', description: 'Analysis ready' },
];

interface AnalysisPipelineUIProps {
  currentPhase?: string | null;
  progress: number;
  error?: Error | null;
  isLoading: boolean;
}

export function AnalysisPipelineUI({
  currentPhase,
  progress,
  error,
  isLoading,
}: AnalysisPipelineUIProps) {
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground text-right">{progress}% Complete</p>
        </CardContent>
      </Card>

      {/* Phases timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {PHASES.map((phase, idx) => {
              const isCompleted = PHASES.findIndex((p) => p.key === currentPhase) >= idx;
              const isActive = phase.key === currentPhase;
              const isFuture = !isCompleted;

              return (
                <div key={phase.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`rounded-full p-3 ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    {idx < PHASES.length - 1 && (
                      <div
                        className={`w-1 h-12 my-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <h4
                      className={`font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                      {phase.label}
                    </h4>
                    <p className="text-sm text-gray-600">{phase.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Analysis Error</h4>
              <p className="text-sm text-red-800">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
