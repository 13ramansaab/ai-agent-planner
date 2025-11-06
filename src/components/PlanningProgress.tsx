import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { AGENT_PHASES } from '../lib/agents';
import type { OrchestrationProgress } from '../lib/orchestrator';

type PlanningProgressProps = {
  progress: OrchestrationProgress;
};

export function PlanningProgress({ progress }: PlanningProgressProps) {
  const getPhaseStatus = (phaseType: string) => {
    if (progress.completedPhases.includes(phaseType)) {
      return 'completed';
    }
    if (progress.currentPhase === AGENT_PHASES.find(p => p.type === phaseType)?.name) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Planning Your Project</h2>
          <p className="text-gray-600">
            AI agents are analyzing your project and creating a comprehensive plan
          </p>
        </div>

        {progress.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Planning Error</p>
              <p className="text-sm text-red-700 mt-1">{progress.error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {AGENT_PHASES.map((phase) => {
            const status = getPhaseStatus(phase.type);
            return (
              <div
                key={phase.type}
                className={`p-4 rounded-lg border-2 transition-all ${
                  status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : status === 'active'
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : status === 'active' ? (
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold ${
                        status === 'completed'
                          ? 'text-green-900'
                          : status === 'active'
                          ? 'text-blue-900'
                          : 'text-gray-700'
                      }`}
                    >
                      {phase.name}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        status === 'completed'
                          ? 'text-green-700'
                          : status === 'active'
                          ? 'text-blue-700'
                          : 'text-gray-600'
                      }`}
                    >
                      {phase.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Phase {progress.completedPhases.length} of {progress.totalPhases}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{
                    width: `${(progress.completedPhases.length / progress.totalPhases) * 100}%`
                  }}
                />
              </div>
              <span className="text-gray-700 font-medium">
                {Math.round((progress.completedPhases.length / progress.totalPhases) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
