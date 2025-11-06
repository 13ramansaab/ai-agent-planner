import { supabase, type Project, type PlanningPhase } from './supabase';
import { AGENT_PHASES, type AgentPhase } from './agents';
import {
  callAI,
  parseJSONResponse,
  validateJSON,
  type AIProvider
} from './ai-client';
import { runQualityChecklist } from './quality-checklist';

export type OrchestrationProgress = {
  currentPhase: string;
  completedPhases: string[];
  totalPhases: number;
  error?: string;
};

// Required prompts that should always exist in final tasks
const REQUIRED_PROMPT_TITLES = [
  'Project Scaffolding',
  'Smoke Test + Release Checklist'
];

export class AgentOrchestrator {
  private projectId: string;
  private provider: AIProvider;
  private onProgress?: (progress: OrchestrationProgress) => void;

  constructor(
    projectId: string,
    provider: AIProvider = 'anthropic',
    onProgress?: (progress: OrchestrationProgress) => void
  ) {
    this.projectId = projectId;
    this.provider = provider;
    this.onProgress = onProgress;
  }

  async runAllPhases(): Promise<void> {
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', this.projectId)
      .maybeSingle();

    if (projErr) throw projErr;
    if (!project) {
      throw new Error('Project not found');
    }

    await supabase
      .from('projects')
      .update({ status: 'planning', updated_at: new Date().toISOString() })
      .eq('id', this.projectId);

    const completedPhases: PlanningPhase[] = [];

    // First pass: run every phase once
    for (let i = 0; i < AGENT_PHASES.length; i++) {
      const phase = AGENT_PHASES[i];

      this.notifyProgress({
        currentPhase: phase.name,
        completedPhases: completedPhases.map((p) => p.phase_type),
        totalPhases: AGENT_PHASES.length
      });

      try {
        const result = await this.runPhase(phase, project, completedPhases);
        completedPhases.push(result);
      } catch (error) {
        this.notifyProgress({
          currentPhase: phase.name,
          completedPhases: completedPhases.map((p) => p.phase_type),
          totalPhases: AGENT_PHASES.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await supabase
          .from('projects')
          .update({ status: 'draft' })
          .eq('id', this.projectId);

        throw error;
      }
    }

    // Run quality checklist and apply automatic fixes
    await this.applyQualityChecklist(project, completedPhases);

    // Critic → targeted re-runs → Critic → Composer
    await this.applyCriticRevisions(project, completedPhases);

    // Persist prompts for Bolt/Cursor from the final Prompts phase
    await this.generatePrompts(completedPhases);

    await supabase
      .from('projects')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', this.projectId);

    this.notifyProgress({
      currentPhase: 'Completed',
      completedPhases: AGENT_PHASES.map((p) => p.type),
      totalPhases: AGENT_PHASES.length
    });
  }

  /**
   * Run a single phase with JSON parse/validate/repair loop.
   */
  private async runPhase(
    phase: AgentPhase,
    project: Project,
    previousPhases: PlanningPhase[]
  ): Promise<PlanningPhase> {
    const { data: phaseRecord, error: insertErr } = await supabase
      .from('planning_phases')
      .insert({
        project_id: this.projectId,
        phase_type: phase.type,
        status: 'processing'
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    if (!phaseRecord) {
      throw new Error(`Failed to create phase record for ${phase.type}`);
    }

    try {
      const contextData = {
        projectDescription: project.description,
        competitorLinks: project.competitor_links || [],
        competitorReviews: project.competitor_reviews || [],
        priorArtifacts: this.buildPriorArtifacts(previousPhases),
        decisionLedger: this.extractDecisionLedger(previousPhases)
      };

      const prompt = this.buildContextualPrompt(
        phase,
        contextData,
        previousPhases
      );

      let output: any;
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await callAI(
          [
            { role: 'system', content: phase.systemPrompt },
            { role: 'user', content: prompt }
          ],
          this.provider,
          { temperature: 0.2, maxTokens: 4000 }
        );

        try {
          output = parseJSONResponse(response.content);
        } catch (parseError) {
          if (attempt < maxRetries - 1) {
            continue;
          }
          throw new Error(
            `Failed to parse JSON after ${maxRetries} attempts: ${parseError}`
          );
        }

        const validation = validateJSON(output, phase.schema);

        if (validation.valid) {
          // light cross-phase checks once API/UI/Data are present
          this.crossPhaseChecks(phase.type, output, previousPhases);
          break;
        }

        if (attempt < maxRetries - 1) {
          const repairPrompt = this.buildRepairPrompt(
            response.content,
            validation.errors,
            phase.schema
          );
          const repairResponse = await callAI(
            [
              { role: 'system', content: phase.systemPrompt },
              { role: 'user', content: repairPrompt }
            ],
            this.provider,
            { temperature: 0.1, maxTokens: 4000 }
          );

          try {
            output = parseJSONResponse(repairResponse.content);
            const revalidation = validateJSON(output, phase.schema);
            if (revalidation.valid) {
              break;
            }
          } catch {
            continue;
          }
        } else {
          throw new Error(
            `JSON validation failed after ${maxRetries} attempts: ${validation.errors.join(
              ', '
            )}`
          );
        }
      }

      const { data: updatedPhase, error: updateErr } = await supabase
        .from('planning_phases')
        .update({
          output,
          status: 'completed',
          model_used: this.provider,
          completed_at: new Date().toISOString()
        })
        .eq('id', phaseRecord.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return updatedPhase!;
    } catch (error) {
      await supabase
        .from('planning_phases')
        .update({ status: 'failed' })
        .eq('id', phaseRecord.id);

      throw error;
    }
  }

  private buildPriorArtifacts(previousPhases: PlanningPhase[]): any {
    const artifacts: any = {};
    for (const phase of previousPhases) {
      artifacts[phase.phase_type] = phase.output;
    }
    return artifacts;
  }

  private extractDecisionLedger(previousPhases: PlanningPhase[]): any[] {
    const ledger: any[] = [];
    for (const phase of previousPhases) {
      if (phase.output?.decisions && Array.isArray(phase.output.decisions)) {
        ledger.push(...phase.output.decisions);
      }
    }
    // De-dupe by key, keep last (most recent)
    const map = new Map<
      string,
      { key: string; value: string; reason: string }
    >();
    for (const d of ledger) {
      if (d?.key) map.set(d.key, { key: d.key, value: d.value, reason: d.reason });
    }
    return Array.from(map.values());
  }

  private buildContextualPrompt(
    phase: AgentPhase,
    context: any,
    previousPhases: PlanningPhase[]
  ): string {
    let prompt = `Project Context:\n${JSON.stringify(context, null, 2)}\n\n`;

    if (previousPhases.length > 0) {
      prompt += `Previous Planning Phases:\n`;
      previousPhases.forEach((p) => {
        prompt += `\n${p.phase_type.toUpperCase()}:\n${JSON.stringify(
          p.output,
          null,
          2
        )}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Task: ${phase.description}\n\n`;
    prompt += `Return ONLY valid JSON matching this schema. No prose, no markdown code blocks.\n`;
    prompt += `Schema: ${JSON.stringify(phase.schema, null, 2)}`;

    return prompt;
  }

  private buildRepairPrompt(
    originalResponse: string,
    errors: string[],
    schema: any
  ): string {
    return `Your last JSON failed validation.

Errors:
${errors.join('\n')}

Schema:
${JSON.stringify(schema, null, 2)}

Return corrected JSON matching the schema. No prose, no markdown code blocks.`;
  }

  /**
   * Run quality checklist and apply targeted revisions if issues found.
   */
  private async applyQualityChecklist(
    project: Project,
    completedPhases: PlanningPhase[]
  ): Promise<void> {
    const checklist = runQualityChecklist(completedPhases);

    if (checklist.status === 'pass') {
      console.log('Quality checklist passed');
      return;
    }

    console.log(`Quality checklist failed: ${checklist.failItems.join(', ')}`);
    console.log(`Applying ${checklist.targetedRevisions.length} automatic fixes...`);

    const byType: Record<string, AgentPhase> = {};
    for (const ap of AGENT_PHASES) byType[ap.type] = ap;

    // Re-run phases with issues
    for (const rev of checklist.targetedRevisions) {
      const type = String(rev.phase || '').toLowerCase();
      const phase = byType[type];
      if (!phase) continue;

      console.log(`Re-running ${phase.name} to fix: ${rev.request}`);

      const rerun = await this.runPhase(phase, project, completedPhases);

      const idx = completedPhases.findIndex((p) => p.phase_type === phase.type);
      if (idx >= 0) completedPhases[idx] = rerun;
      else completedPhases.push(rerun);
    }
  }

  /**
   * Reads the first Critic output and, if needed, re-runs only the requested phases,
   * then re-runs Critic and Composer to converge.
   */
  private async applyCriticRevisions(
    project: Project,
    completedPhases: PlanningPhase[]
  ): Promise<void> {
    const critic = completedPhases.find((p) => p.phase_type === 'critic');
    if (!critic?.output) return;

    const revs = Array.isArray(critic.output.revisionRequests)
      ? critic.output.revisionRequests
      : [];
    const severity =
      typeof critic.output.severityIndex === 'number'
        ? critic.output.severityIndex
        : 0;

    if (revs.length === 0 && severity < 0.5) return;

    const byType: Record<string, AgentPhase> = {};
    for (const ap of AGENT_PHASES) byType[ap.type] = ap;

    // Re-run only requested phases (once)
    for (const r of revs) {
      const type = String(r.targetPhase || '').toLowerCase();
      const phase = byType[type];
      if (!phase) continue;

      const rerun = await this.runPhase(phase, project, completedPhases);

      // Replace in-memory result
      const idx = completedPhases.findIndex((p) => p.phase_type === phase.type);
      if (idx >= 0) completedPhases[idx] = rerun;
      else completedPhases.push(rerun);
    }

    // Re-run Critic
    const criticPhase = byType['critic'];
    if (criticPhase) {
      const rerunCritic = await this.runPhase(
        criticPhase,
        project,
        completedPhases
      );
      const idx = completedPhases.findIndex((p) => p.phase_type === 'critic');
      if (idx >= 0) completedPhases[idx] = rerunCritic;
      else completedPhases.push(rerunCritic);
    }

    // Re-run Composer so Build Plan/Prompts get the fixes
    const composerPhase = byType['composer'];
    if (composerPhase) {
      const rerunComposer = await this.runPhase(
        composerPhase,
        project,
        completedPhases
      );
      const idx = completedPhases.findIndex((p) => p.phase_type === 'composer');
      if (idx >= 0) completedPhases[idx] = rerunComposer;
      else completedPhases.push(rerunComposer);
    }
  }

  private async generatePrompts(phases: PlanningPhase[]): Promise<void> {
    const promptPhase = phases.find((p) => p.phase_type === 'prompts');
    if (!promptPhase || !promptPhase.output) {
      return;
    }

    const { bolt = [], cursor = [] } = promptPhase.output;

    // Basic guard: ensure required tasks exist by title
    const allTitles = [...bolt, ...cursor].map(
      (p: any) => (p?.title || '').toLowerCase()
    );
    for (const req of REQUIRED_PROMPT_TITLES) {
      if (!allTitles.includes(req.toLowerCase())) {
        console.warn(`Missing required prompt: ${req}`);
      }
    }

    for (let i = 0; i < bolt.length; i++) {
      const p = bolt[i];
      await supabase.from('prompts').insert({
        project_id: this.projectId,
        tool: 'bolt',
        title: p.title,
        content: this.formatPrompt(p),
        order: i
      });
    }

    for (let i = 0; i < cursor.length; i++) {
      const p = cursor[i];
      await supabase.from('prompts').insert({
        project_id: this.projectId,
        tool: 'cursor',
        title: p.title,
        content: this.formatPrompt(p),
        order: i
      });
    }
  }

  private formatPrompt(prompt: any): string {
    let content = `# ${prompt.title}\n\n`;
    content += `## Instruction\n${prompt.prompt}\n\n`;

    if (prompt.files && prompt.files.length > 0) {
      content += `## Files to Modify\n${prompt.files
        .map((f: string) => `- ${f}`)
        .join('\n')}\n\n`;
    }

    if (prompt.constraints && prompt.constraints.length > 0) {
      content += `## Constraints\n${prompt.constraints
        .map((c: string) => `- ${c}`)
        .join('\n')}\n\n`;
    }

    if (prompt.acceptance && prompt.acceptance.length > 0) {
      content += `## Acceptance Criteria\n${prompt.acceptance
        .map((a: string) => `- ${a}`)
        .join('\n')}\n`;
    }

    if (prompt.tests && prompt.tests.length > 0) {
      content += `\n## Tests\n${prompt.tests.map((t: string) => `- ${t}`).join('\n')}\n`;
    }

    return content;
  }

  private notifyProgress(progress: OrchestrationProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Lightweight cross-phase checks to catch common contradictions early.
   * Throws only for hard conflicts; logs warnings otherwise.
   */
  private crossPhaseChecks(
    currentType: string,
    output: any,
    previous: PlanningPhase[]
  ) {
    const byType: Record<string, any> = {};
    for (const p of previous) byType[p.phase_type] = p.output || {};

    // Auth single source of truth: if UX or System chose Firebase, Data must NOT have password_hash; vice versa.
    if (currentType === 'data' || currentType === 'api' || currentType === 'composer') {
      const uxAuth =
        byType['ux']?.auth?.choice ||
        byType['system']?.decisions?.find((d: any) => d.key === 'auth.choice')
          ?.value;

      if (uxAuth) {
        const entities =
          output?.entities || byType['data']?.entities || [];
        const users = Array.isArray(entities)
          ? entities.find(
              (e: any) =>
                String(e.name || '').toLowerCase() === 'users'
            )
          : null;

        if (users && Array.isArray(users.columns)) {
          const hasPwd = users.columns.some((c: any) => c.name === 'password_hash');
          const hasFirebase = users.columns.some(
            (c: any) => c.name === 'firebase_uid'
          );

          if (String(uxAuth).toLowerCase().includes('firebase') && hasPwd) {
            console.warn('Auth mismatch: Firebase chosen but password_hash present in Data model.');
          }
          if (String(uxAuth).toLowerCase().includes('local') && hasFirebase) {
            console.warn('Auth mismatch: Local auth chosen but firebase_uid present in Data model.');
          }
        }
      }
    }
  }
}
