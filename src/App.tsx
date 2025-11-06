import { useState } from 'react';
import { ProjectForm } from './components/ProjectForm';
import { PlanningProgress } from './components/PlanningProgress';
import { PlanResults } from './components/PlanResults';
import { supabase } from './lib/supabase';
import { AgentOrchestrator, type OrchestrationProgress } from './lib/orchestrator';

type AppState = 'form' | 'planning' | 'results';

function App() {
  const [state, setState] = useState<AppState>('form');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [progress, setProgress] = useState<OrchestrationProgress>({
    currentPhase: '',
    completedPhases: [],
    totalPhases: 12
  });

  const handleProjectSubmit = async (name: string, description: string, competitorLinks: string[], competitorReviews: string[]) => {
    setState('planning');
    setProjectName(name);

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          competitor_links: competitorLinks,
          competitor_reviews: competitorReviews,
          status: 'draft'
        })
        .select()
        .single();

      if (error || !project) {
        throw new Error('Failed to create project');
      }

      setProjectId(project.id);

      const orchestrator = new AgentOrchestrator(
        project.id,
        'openai',
        (newProgress) => {
          setProgress(newProgress);
        }
      );

      await orchestrator.runAllPhases();
      setState('results');
    } catch (error) {
      console.error('Planning error:', error);
      setProgress((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }));
    }
  };

  const handleStartNew = () => {
    setState('form');
    setProjectId(null);
    setProjectName('');
    setProgress({
      currentPhase: '',
      completedPhases: [],
      totalPhases: 12
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-12">
        {state === 'form' && (
          <ProjectForm onSubmit={handleProjectSubmit} isLoading={false} />
        )}

        {state === 'planning' && <PlanningProgress progress={progress} />}

        {state === 'results' && projectId && (
          <div className="space-y-6">
            <PlanResults projectId={projectId} projectName={projectName} />
            <div className="text-center">
              <button
                onClick={handleStartNew}
                className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                Plan Another Project
              </button>
            </div>
          </div>
        )}

        {progress.error && state === 'planning' && (
          <div className="mt-6 text-center">
            <button
              onClick={handleStartNew}
              className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
