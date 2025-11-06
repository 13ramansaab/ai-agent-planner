import type { PlanningPhase } from './supabase';

export type ChecklistItem = {
  check: string;
  passed: boolean;
  details?: string;
};

export type ChecklistResult = {
  status: 'pass' | 'fail';
  items: ChecklistItem[];
  failItems: string[];
  targetedRevisions: Array<{ phase: string; request: string }>;
};

export function runQualityChecklist(phases: PlanningPhase[]): ChecklistResult {
  const items: ChecklistItem[] = [];
  const failItems: string[] = [];
  const targetedRevisions: Array<{ phase: string; request: string }> = [];

  const byType: Record<string, any> = {};
  for (const p of phases) {
    byType[p.phase_type] = p.output || {};
  }

  const ux = byType['ux'] || {};
  const system = byType['system'] || {};
  const data = byType['data'] || {};
  const api = byType['api'] || {};
  const ui = byType['ui'] || {};
  const prompts = byType['prompts'] || {};
  const strategy = byType['strategy'] || {};
  const competitor = byType['competitor'] || {};

  // 1. Single source of truth for Auth
  const uxAuthChoice = ux?.auth?.choice || '';
  const systemDecisions = Array.isArray(system?.decisions) ? system.decisions : [];
  const systemAuthDecision = systemDecisions.find((d: any) => d.key?.toLowerCase().includes('auth'));

  const entities = Array.isArray(data?.entities) ? data.entities : [];
  const usersEntity = entities.find((e: any) => String(e.name).toLowerCase() === 'users');
  const userColumns = Array.isArray(usersEntity?.columns) ? usersEntity.columns : [];

  const hasPwdHash = userColumns.some((c: any) => c.name === 'password_hash');
  const hasFirebaseUid = userColumns.some((c: any) => c.name === 'firebase_uid');

  const authConsistent =
    (uxAuthChoice.toLowerCase().includes('firebase') && hasFirebaseUid && !hasPwdHash) ||
    (uxAuthChoice.toLowerCase().includes('local') && hasPwdHash && !hasFirebaseUid) ||
    (!uxAuthChoice.toLowerCase().includes('firebase') && !uxAuthChoice.toLowerCase().includes('local'));

  items.push({
    check: 'Single source of truth for Auth selected and reflected across UX, API, Data',
    passed: authConsistent,
    details: authConsistent ? undefined : `UX auth: ${uxAuthChoice}, Data has password_hash: ${hasPwdHash}, firebase_uid: ${hasFirebaseUid}`
  });

  if (!authConsistent) {
    failItems.push('Auth mismatch across phases');
    targetedRevisions.push({
      phase: 'system',
      request: `Ensure auth choice in decisions matches UX auth.choice: ${uxAuthChoice}`
    });
    targetedRevisions.push({
      phase: 'data',
      request: `Update users table: if Firebase auth, include firebase_uid and remove password_hash; if local auth, include password_hash and remove firebase_uid`
    });
  }

  // 2. Design tokens include motion+loading states
  const hasMotion = ui?.motion && typeof ui.motion.durations === 'object';
  const hasSkeletons = Array.isArray(ui?.skeletons) && ui.skeletons.length > 0;

  items.push({
    check: 'Design tokens include motion+loading states',
    passed: hasMotion && hasSkeletons,
    details: hasMotion && hasSkeletons ? undefined : `Motion: ${hasMotion}, Skeletons: ${hasSkeletons}`
  });

  if (!hasMotion || !hasSkeletons) {
    failItems.push('Missing motion or skeleton patterns in design system');
    targetedRevisions.push({
      phase: 'ui',
      request: 'Add motion durations (fast/base/slow) and skeleton loading patterns'
    });
  }

  // 3. Pagination and error model specified in API
  const hasOpenApi = typeof api?.openApiYaml === 'string' && api.openApiYaml.length > 0;
  const hasPagination = hasOpenApi && api.openApiYaml.includes('cursor');
  const hasErrorModel = hasOpenApi && (api.openApiYaml.includes('error') || api.openApiYaml.includes('4'));

  items.push({
    check: 'Pagination and error model specified in OpenAPI',
    passed: hasPagination && hasErrorModel,
    details: hasPagination && hasErrorModel ? undefined : `Pagination: ${hasPagination}, Error model: ${hasErrorModel}`
  });

  if (!hasPagination || !hasErrorModel) {
    failItems.push('Missing pagination or error model in API spec');
    targetedRevisions.push({
      phase: 'api',
      request: 'Ensure OpenAPI spec includes cursor-based pagination for list endpoints and proper error responses'
    });
  }

  // 4. Non-functional (perf/reliability/privacy) noted
  const hasNonFunctional =
    system?.nonFunctional &&
    Array.isArray(system.nonFunctional.performance) &&
    Array.isArray(system.nonFunctional.reliability) &&
    Array.isArray(system.nonFunctional.privacy);

  items.push({
    check: 'Non-functional (perf/reliability/privacy) noted',
    passed: hasNonFunctional || false,
    details: hasNonFunctional ? undefined : 'Missing nonFunctional requirements in system architecture'
  });

  if (!hasNonFunctional) {
    failItems.push('Missing non-functional requirements');
    targetedRevisions.push({
      phase: 'system',
      request: 'Add nonFunctional requirements covering performance, reliability, and privacy'
    });
  }

  // 5. Providers & Policies list quotas/caching/attribution
  const hasProvidersPolicies =
    system?.providersPolicies &&
    Array.isArray(system.providersPolicies.providers) &&
    typeof system.providersPolicies.quotas === 'string' &&
    typeof system.providersPolicies.caching === 'string';

  items.push({
    check: 'Providers & Policies list quotas/caching/attribution',
    passed: hasProvidersPolicies || false,
    details: hasProvidersPolicies ? undefined : 'Missing providersPolicies in system architecture'
  });

  if (!hasProvidersPolicies) {
    failItems.push('Missing provider policies');
    targetedRevisions.push({
      phase: 'system',
      request: 'Add providersPolicies with quotas, caching, attribution, and data retention'
    });
  }

  // 6. Decision Ledger consistent across all phases
  const allDecisions: any[] = [];
  for (const p of phases) {
    if (p.output?.decisions && Array.isArray(p.output.decisions)) {
      allDecisions.push(...p.output.decisions);
    }
  }

  const decisionKeys = new Set<string>();
  const duplicates = new Set<string>();
  for (const d of allDecisions) {
    if (d?.key) {
      if (decisionKeys.has(d.key)) duplicates.add(d.key);
      decisionKeys.add(d.key);
    }
  }

  items.push({
    check: 'Decision Ledger consistent across all phases',
    passed: duplicates.size === 0,
    details: duplicates.size === 0 ? undefined : `Duplicate decision keys: ${Array.from(duplicates).join(', ')}`
  });

  // 7. Prompts include Scaffolding and Smoke Test
  const bolt = Array.isArray(prompts?.bolt) ? prompts.bolt : [];
  const cursor = Array.isArray(prompts?.cursor) ? prompts.cursor : [];
  const allPromptTitles = [...bolt, ...cursor].map((p: any) => String(p?.title || '').toLowerCase());

  const hasScaffolding = allPromptTitles.some((t) => t.includes('scaffold'));
  const hasSmokeTest = allPromptTitles.some((t) => t.includes('smoke') || t.includes('release'));

  items.push({
    check: 'Prompts include Scaffolding and Smoke Test + Release Checklist',
    passed: hasScaffolding && hasSmokeTest,
    details: hasScaffolding && hasSmokeTest ? undefined : `Scaffolding: ${hasScaffolding}, Smoke test: ${hasSmokeTest}`
  });

  if (!hasScaffolding || !hasSmokeTest) {
    failItems.push('Missing required prompts');
    targetedRevisions.push({
      phase: 'prompts',
      request: 'Add "Project Scaffolding" as first task and "Smoke Test + Release Checklist" as final task'
    });
  }

  // 8. If competitor data present: opportunities reflected in features
  const hasCompetitorData = competitor && (
    (Array.isArray(competitor.opportunities) && competitor.opportunities.length > 0) ||
    (Array.isArray(competitor.topInsights) && competitor.topInsights.length > 0)
  );

  const featuresMustHave = Array.isArray(strategy?.features?.must) ? strategy.features.must : [];
  const opportunitiesReflected = !hasCompetitorData || featuresMustHave.length > 0;

  items.push({
    check: 'If competitor data present: opportunities reflected in features',
    passed: opportunitiesReflected,
    details: opportunitiesReflected ? undefined : 'Competitor opportunities not reflected in strategy features'
  });

  if (hasCompetitorData && !opportunitiesReflected) {
    failItems.push('Competitor insights not incorporated into strategy');
    targetedRevisions.push({
      phase: 'strategy',
      request: 'Incorporate competitor opportunities from competitor phase into Must/Should/Could features'
    });
  }

  const status = failItems.length === 0 ? 'pass' : 'fail';

  return {
    status,
    items,
    failItems,
    targetedRevisions
  };
}
