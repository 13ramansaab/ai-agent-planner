export type AgentPhase = {
  type:
    | 'competitor'
    | 'strategy'
    | 'ux'
    | 'system'
    | 'data'
    | 'api'
    | 'ui'
    | 'prompts'
    | 'critic'
    | 'composer';
  name: string;
  description: string;
  systemPrompt: string;
  schema: any;
};

const GLOBAL_GUARDRAILS = `
GLOBAL SYSTEM GUARDRAILS:
- Output VALID JSON only, matching the schema provided for your phase. No prose.
- If a decision is ambiguous, choose a sensible default, record it in the Decision Ledger (key/value/reason), and continue.
- Never contradict earlier phases. If you must change something, emit a Correction note and update the Decision Ledger.
- Keep v1 shippable in 6–8 weeks with minimal dependencies; note stretch items separately.
- Respect privacy/compliance and avoid vendor lock-in where feasible.
- If competitor inputs are provided, map at least one top opportunity into a Must feature (or state why not).
`;

export const AGENT_PHASES: AgentPhase[] = [
  {
    type: 'competitor',
    name: 'Competitor & Review Miner',
    description:
      'Parse competitor sites & user reviews to extract jobs, pains, gaps, requests',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Competitor & Review Miner. Analyze provided competitor links and/or user reviews.
Extract: recurring user jobs, pain points, requested features, and perceived gaps. Cluster findings,
estimate frequency (low/med/high), sentiment (−2..+2), and impact on activation, retention, or revenue.
Propose high-leverage opportunities and risks for our v1. JSON only.`,
    schema: {
      type: 'object',
      required: ['themes', 'topInsights', 'opportunities', 'risks'],
      properties: {
        themes: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'signals'],
            properties: {
              name: { type: 'string' },
              signals: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['quote', 'freq', 'sentiment'],
                  properties: {
                    quote: { type: 'string' },
                    freq: { type: 'string', enum: ['low', 'medium', 'high'] },
                    sentiment: { type: 'integer', minimum: -2, maximum: 2 }
                  }
                }
              }
            }
          }
        },
        topInsights: { type: 'array', items: { type: 'string' } },
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            required: ['idea', 'whyNow', 'impactArea'],
            properties: {
              idea: { type: 'string' },
              whyNow: { type: 'string' },
              impactArea: {
                type: 'string',
                enum: ['activation', 'retention', 'revenue', 'perf', 'trust']
              }
            }
          }
        },
        risks: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    type: 'strategy',
    name: 'Product Strategist',
    description:
      'Defines market need, personas, features, and success metrics',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Product Strategist. Combine the idea with Competitor & Review Miner output.
Produce a strategy that is feasible for a 6–8 week v1.

Must include: problem, personas, jobs-to-be-done, market signals,
feature set categorized Must/Should/Could, success metrics (North Star + 3 guardrails),
and a Decision Ledger update for monetization & platform focus.
JSON only.`,
    schema: {
      type: 'object',
      required: [
        'problem',
        'personas',
        'jobsToBeDone',
        'features',
        'successMetrics',
        'decisions'
      ],
      properties: {
        problem: { type: 'string' },
        personas: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'goals'],
            properties: {
              name: { type: 'string' },
              goals: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        jobsToBeDone: { type: 'array', items: { type: 'string' } },
        marketSignals: { type: 'array', items: { type: 'string' } },
        features: {
          type: 'object',
          required: ['must', 'should', 'could'],
          properties: {
            must: { type: 'array', items: { type: 'string' } },
            should: { type: 'array', items: { type: 'string' } },
            could: { type: 'array', items: { type: 'string' } }
          }
        },
        successMetrics: {
          type: 'object',
          required: ['northStar', 'guardrails'],
          properties: {
            northStar: { type: 'string' },
            guardrails: { type: 'array', items: { type: 'string' } }
          }
        },
        decisions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['key', 'value', 'reason'],
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              reason: { type: 'string' }
            }
          }
        }
      }
    }
  },
  {
    type: 'ux',
    name: 'UX Architect',
    description: 'Designs information architecture, user flows, and auth strategy',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a UX Architect. Design the experience using IA and 3–5 primary flows with step lists,
plus edge cases. Propose a single auth choice with rationale (e.g., email+magic-link, OAuth providers).
Include accessibility notes and empty/error states. JSON only.`,
    schema: {
      type: 'object',
      required: [
        'informationArchitecture',
        'primaryFlows',
        'auth',
        'edgeCases',
        'a11yNotes',
        'emptyStates'
      ],
      properties: {
        informationArchitecture: { type: 'array', items: { type: 'string' } },
        primaryFlows: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'steps'],
            properties: {
              name: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        auth: {
          type: 'object',
          required: ['choice', 'rationale'],
          properties: {
            choice: { type: 'string' },
            rationale: { type: 'string' }
          }
        },
        edgeCases: { type: 'array', items: { type: 'string' } },
        a11yNotes: { type: 'array', items: { type: 'string' } },
        emptyStates: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    type: 'system',
    name: 'System Architect',
    description: 'Defines overall system design, services, and infrastructure',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a System Architect. Define services, responsibilities, data flow, third-party deps,
security, and observability fit for a v1 (single-region, low ops).
Add a Providers & Policies block (API quotas, caching/attribution, data retention),
and record any vendor decisions in the Decision Ledger. JSON only.`,
    schema: {
      type: 'object',
      required: [
        'services',
        'dependencies',
        'security',
        'observability',
        'providersPolicies',
        'nonFunctional',
        'decisions'
      ],
      properties: {
        services: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'responsibilities'],
            properties: {
              name: { type: 'string' },
              responsibilities: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        dependencies: { type: 'array', items: { type: 'string' } },
        security: { type: 'array', items: { type: 'string' } },
        observability: { type: 'array', items: { type: 'string' } },
        providersPolicies: {
          type: 'object',
          required: ['providers', 'quotas', 'caching', 'attribution', 'dataRetention'],
          properties: {
            providers: { type: 'array', items: { type: 'string' } },
            quotas: { type: 'string' },
            caching: { type: 'string' },
            attribution: { type: 'string' },
            dataRetention: { type: 'string' }
          }
        },
        nonFunctional: {
          type: 'object',
          required: ['performance', 'reliability', 'privacy'],
          properties: {
            performance: { type: 'array', items: { type: 'string' } },
            reliability: { type: 'array', items: { type: 'string' } },
            privacy: { type: 'array', items: { type: 'string' } }
          }
        },
        decisions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['key', 'value', 'reason'],
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              reason: { type: 'string' }
            }
          }
        }
      }
    }
  },
  {
    type: 'data',
    name: 'Data Modeler',
    description: 'Designs database schema, entities, and relationships',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Data Modeler. Output DB choice and entities with columns & constraints, migrations list,
and explicit indices/uniques. Include audit fields (created_at, updated_at, created_by).
Mark forward-compatibility: which tables are append-only vs mutable, and any denormalized snapshots for durability.
JSON only.`,
    schema: {
      type: 'object',
      required: ['dbChoice', 'entities', 'migrations', 'dataEvolution'],
      properties: {
        dbChoice: { type: 'string' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'columns'],
            properties: {
              name: { type: 'string' },
              columns: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'type'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    constraints: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        },
        migrations: { type: 'array', items: { type: 'string' } },
        dataEvolution: {
          type: 'object',
          required: ['appendOnly', 'denormalizedSnapshots'],
          properties: {
            appendOnly: { type: 'array', items: { type: 'string' } },
            denormalizedSnapshots: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  },
  {
    type: 'api',
    name: 'API Designer',
    description: 'Creates API specification and endpoint design',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are an API Designer. Produce an OpenAPI 3.1 YAML as a string field,
with authentication (bearer or session), pagination (cursor), error model,
and versioning strategy. Include webhook shapes if async jobs exist.
JSON only.`,
    schema: {
      type: 'object',
      required: ['openApiYaml', 'webhooks', 'rateLimits'],
      properties: {
        openApiYaml: { type: 'string' },
        webhooks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['event', 'payload'],
            properties: {
              event: { type: 'string' },
              payload: { type: 'object' }
            }
          }
        },
        rateLimits: { type: 'string' }
      }
    }
  },
  {
    type: 'ui',
    name: 'UI Design System',
    description: 'Defines design tokens, components, and visual system',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a UI/UX Designer. Produce a light-theme AA design system: color tokens,
typography scale, spacing, radii, elevations, and core components with props and states.
Include loading/skeleton patterns and motion durations. Avoid purple/indigo unless requested. JSON only.`,
    schema: {
      type: 'object',
      required: ['tokens', 'components', 'motion', 'skeletons'],
      properties: {
        tokens: {
          type: 'object',
          required: ['color', 'space', 'radius', 'typography', 'elevation'],
          properties: {
            color: { type: 'object' },
            space: { type: 'object' },
            radius: { type: 'object' },
            typography: { type: 'object' },
            elevation: { type: 'object' }
          }
        },
        components: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'props', 'states'],
            properties: {
              name: { type: 'string' },
              props: { type: 'array', items: { type: 'string' } },
              states: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        motion: {
          type: 'object',
          required: ['durations', 'easing'],
          properties: {
            durations: {
              type: 'object',
              required: ['fast', 'base', 'slow'],
              properties: {
                fast: { type: 'number' },
                base: { type: 'number' },
                slow: { type: 'number' }
              }
            },
            easing: { type: 'string' }
          }
        },
        skeletons: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    type: 'prompts',
    name: 'Prompt Engineer',
    description: 'Generates implementation prompts for Bolt/Cursor',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Prompt Engineer. Generate 6–12 tightly-scoped Bolt/Cursor prompts.
Each item: title, prompt (with context), files to touch, constraints, acceptance criteria, and test notes.
Order by dependency, and include a "Project Scaffolding" task first.
JSON only.`,
    schema: {
      type: 'object',
      required: ['bolt', 'cursor'],
      properties: {
        bolt: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'prompt', 'files', 'constraints', 'acceptance', 'tests'],
            properties: {
              title: { type: 'string' },
              prompt: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } },
              acceptance: { type: 'array', items: { type: 'string' } },
              tests: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        cursor: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'prompt', 'files', 'constraints', 'acceptance', 'tests'],
            properties: {
              title: { type: 'string' },
              prompt: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } },
              acceptance: { type: 'array', items: { type: 'string' } },
              tests: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  },
  {
    type: 'critic',
    name: 'Critic/QA',
    description:
      'Check cross-phase consistency, catch missing edge cases, and request targeted revisions',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Critic/QA. Compare all artifacts for contradictions, missing edge cases, and unrealistic assumptions.
Score overall risk 0..1. List specific revision requests that can be addressed by exactly one target phase.
JSON only.`,
    schema: {
      type: 'object',
      required: ['issues', 'severityIndex', 'revisionRequests'],
      properties: {
        issues: { type: 'array', items: { type: 'string' } },
        severityIndex: { type: 'number', minimum: 0, maximum: 1 },
        revisionRequests: {
          type: 'array',
          items: {
            type: 'object',
            required: ['targetPhase', 'request'],
            properties: {
              targetPhase: { type: 'string' },
              request: { type: 'string' }
            }
          }
        }
      }
    }
  },
  {
    type: 'composer',
    name: 'Composer',
    description: 'Merge all artifacts into build plan and prompts markdown files',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are the Composer. Merge all artifacts into two markdown files:
1) Build Plan.md — strategy, UX, architecture, data model, API (excerpt), design system, risks, decisions.
2) Prompts.md — ordered Bolt/Cursor tasks with acceptance criteria.

Also output the final Decision Ledger (merged and deduped).
JSON only.`,
    schema: {
      type: 'object',
      required: ['buildPlanMd', 'promptsMd', 'decisionLedger'],
      properties: {
        buildPlanMd: { type: 'string' },
        promptsMd: { type: 'string' },
        decisionLedger: {
          type: 'array',
          items: {
            type: 'object',
            required: ['key', 'value', 'reason'],
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              reason: { type: 'string' }
            }
          }
        }
      }
    }
  }
];

export function buildAgentPrompt(
  phase: AgentPhase,
  projectContext: string,
  previousPhases: any[] = []
): string {
  let prompt = `Project Brief:\n${projectContext}\n\n`;

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
