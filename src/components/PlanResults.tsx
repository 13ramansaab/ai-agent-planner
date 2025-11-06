import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Database,
  Code,
  Layers,
  Layout,
  Palette,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { supabase, type PlanningPhase, type Prompt } from '../lib/supabase';

type PlanResultsProps = {
  projectId: string;
  projectName: string;
};

export function PlanResults({ projectId, projectName }: PlanResultsProps) {
  const [phases, setPhases] = useState<PlanningPhase[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('strategy');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  useEffect(() => {
    loadPlanData();
  }, [projectId]);

  const loadPlanData = async () => {
    const { data: phasesData } = await supabase
      .from('planning_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    const { data: promptsData } = await supabase
      .from('prompts')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true });

    if (phasesData) setPhases(phasesData);
    if (promptsData) setPrompts(promptsData);
  };

  const getPhaseIcon = (type: string) => {
    switch (type) {
      case 'strategy':
        return FileText;
      case 'ux':
        return Layout;
      case 'system':
        return Layers;
      case 'data':
        return Database;
      case 'api':
        return Code;
      case 'ui':
        return Palette;
      case 'prompts':
        return Terminal;
      default:
        return FileText;
    }
  };

  const exportMarkdown = () => {
    let markdown = `# ${projectName} - Implementation Plan\n\n`;
    markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    phases.forEach((phase) => {
      const Icon = getPhaseIcon(phase.phase_type);
      markdown += `## ${phase.phase_type.charAt(0).toUpperCase() + phase.phase_type.slice(1)}\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(phase.output, null, 2)}\n\`\`\`\n\n`;
    });

    markdown += `---\n\n## Implementation Prompts\n\n`;

    const boltPrompts = prompts.filter(p => p.tool === 'bolt');
    if (boltPrompts.length > 0) {
      markdown += `### Bolt Prompts\n\n`;
      boltPrompts.forEach((p, i) => {
        markdown += `#### ${i + 1}. ${p.title}\n\n${p.content}\n\n---\n\n`;
      });
    }

    const cursorPrompts = prompts.filter(p => p.tool === 'cursor');
    if (cursorPrompts.length > 0) {
      markdown += `### Cursor Prompts\n\n`;
      cursorPrompts.forEach((p, i) => {
        markdown += `#### ${i + 1}. ${p.title}\n\n${p.content}\n\n---\n\n`;
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async (promptId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedPrompt(promptId);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const selectedPhaseData = phases.find((p) => p.phase_type === selectedPhase);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{projectName}</h2>
            <p className="text-gray-600 mt-1">Complete Implementation Plan</p>
          </div>
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Markdown
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-6">
          {phases.map((phase) => {
            const Icon = getPhaseIcon(phase.phase_type);
            const isSelected = selectedPhase === phase.phase_type;
            return (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.phase_type)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-gray-600'}`} />
                <span
                  className={`text-xs font-medium ${
                    isSelected ? 'text-blue-900' : 'text-gray-700'
                  }`}
                >
                  {phase.phase_type.charAt(0).toUpperCase() + phase.phase_type.slice(1)}
                </span>
              </button>
            );
          })}
        </div>

        {selectedPhaseData && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedPhaseData.phase_type.charAt(0).toUpperCase() +
                selectedPhaseData.phase_type.slice(1)}{' '}
              Details
            </h3>
            <pre className="bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto text-sm">
              <code>{JSON.stringify(selectedPhaseData.output, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {['bolt', 'cursor'].map((tool) => {
          const toolPrompts = prompts.filter((p) => p.tool === tool);
          if (toolPrompts.length === 0) return null;

          return (
            <div key={tool} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                {tool.charAt(0).toUpperCase() + tool.slice(1)} Prompts
              </h3>
              <div className="space-y-4">
                {toolPrompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-gray-900 text-sm">{prompt.title}</h4>
                      </div>
                      <button
                        onClick={() => copyPrompt(prompt.id, prompt.content)}
                        className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Copy prompt"
                      >
                        {copiedPrompt === prompt.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="pl-8">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {prompt.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
