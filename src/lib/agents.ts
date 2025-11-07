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
    | 'qa'
    | 'techwriter'
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
- Follow company engineering standards: layered architecture, async jobs, metrics & logging, observability.
- If competitor inputs are provided, map at least one top opportunity into a Must feature (or state why not).
`;

export const AGENT_PHASES: AgentPhase[] = [
  {
    type: 'competitor',
    name: 'Research Analyst',
    description:
      'Analyze competitor products, user reviews, and market trends to extract structured insights',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Research Analyst. Your goal is to extract structured insight from competitor data and user feedback.
Inputs: project idea, competitor app URLs, reviews, articles, public data.

Analyze:
- Market trends and demand spikes
- User pain points from reviews (tone, sentiment, frequency)
- Competitor strengths, weaknesses, differentiators
- Unmet needs and innovation gaps

Output market signals, competitor matrix, opportunities, and market risk score. JSON only.`,
    schema: {
      type: 'object',
      required: ['marketSignals', 'competitorMatrix', 'userPersonas', 'opportunities', 'marketRiskScore'],
      properties: {
        marketSignals: {
          type: 'array',
          items: {
            type: 'object',
            required: ['signal', 'source', 'trend'],
            properties: {
              signal: { type: 'string' },
              source: { type: 'string' },
              trend: { type: 'string', enum: ['growing', 'stable', 'declining'] },
              sentiment: { type: 'integer', minimum: -2, maximum: 2 }
            }
          }
        },
        competitorMatrix: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'strengths', 'weaknesses', 'differentiators'],
            properties: {
              name: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              differentiators: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        userPersonas: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'painPoints', 'goals', 'tone'],
            properties: {
              name: { type: 'string' },
              painPoints: { type: 'array', items: { type: 'string' } },
              goals: { type: 'array', items: { type: 'string' } },
              tone: { type: 'string' }
            }
          }
        },
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            required: ['idea', 'whyNow', 'impactArea', 'effort'],
            properties: {
              idea: { type: 'string' },
              whyNow: { type: 'string' },
              impactArea: { type: 'string', enum: ['activation', 'retention', 'revenue', 'perf', 'trust'] },
              effort: { type: 'string', enum: ['low', 'medium', 'high'] }
            }
          }
        },
        marketRiskScore: { type: 'string', enum: ['low', 'medium', 'high'] }
      }
    }
  },
  {
    type: 'strategy',
    name: 'Strategy Architect',
    description:
      'Defines market strategy, feature prioritization, risk assessment, and monetization',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Strategy Architect. Using prior research data, output a realistic business and product plan.

Must include:
- Problem statement and user personas from research
- Jobs-to-be-done and market signals
- Priority matrix scoring each feature by impact vs. effort (Must/Should/Could/Won't)
- Risk assessment: top 5 risks with mitigation plans
- Monetization options (subscription, freemium, ads, API)
- Success metrics: activation %, retention %, CAC/LTV goals, North Star metric
- Decision Ledger for platform focus and business model

JSON only.`,
    schema: {
      type: 'object',
      required: [
        'problem',
        'personas',
        'jobsToBeDone',
        'priorityMatrix',
        'riskAssessment',
        'monetization',
        'successMetrics',
        'decisions'
      ],
      properties: {
        problem: { type: 'string' },
        personas: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'goals', 'painPoints'],
            properties: {
              name: { type: 'string' },
              goals: { type: 'array', items: { type: 'string' } },
              painPoints: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        jobsToBeDone: { type: 'array', items: { type: 'string' } },
        marketSignals: { type: 'array', items: { type: 'string' } },
        priorityMatrix: {
          type: 'object',
          required: ['must', 'should', 'could', 'wont'],
          properties: {
            must: {
              type: 'array',
              items: {
                type: 'object',
                required: ['feature', 'impact', 'effort'],
                properties: {
                  feature: { type: 'string' },
                  impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                  effort: { type: 'string', enum: ['low', 'medium', 'high'] }
                }
              }
            },
            should: {
              type: 'array',
              items: {
                type: 'object',
                required: ['feature', 'impact', 'effort'],
                properties: {
                  feature: { type: 'string' },
                  impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                  effort: { type: 'string', enum: ['low', 'medium', 'high'] }
                }
              }
            },
            could: {
              type: 'array',
              items: {
                type: 'object',
                required: ['feature', 'impact', 'effort'],
                properties: {
                  feature: { type: 'string' },
                  impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                  effort: { type: 'string', enum: ['low', 'medium', 'high'] }
                }
              }
            },
            wont: { type: 'array', items: { type: 'string' } }
          }
        },
        riskAssessment: {
          type: 'array',
          items: {
            type: 'object',
            required: ['risk', 'likelihood', 'impact', 'mitigation'],
            properties: {
              risk: { type: 'string' },
              likelihood: { type: 'string', enum: ['low', 'medium', 'high'] },
              impact: { type: 'string', enum: ['low', 'medium', 'high'] },
              mitigation: { type: 'string' }
            }
          }
        },
        monetization: {
          type: 'object',
          required: ['models', 'recommendation', 'rationale'],
          properties: {
            models: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string' },
            rationale: { type: 'string' }
          }
        },
        successMetrics: {
          type: 'object',
          required: ['northStar', 'activation', 'retention', 'cacLtv'],
          properties: {
            northStar: { type: 'string' },
            activation: { type: 'string' },
            retention: { type: 'string' },
            cacLtv: { type: 'string' }
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
    description: 'Defines overall system design, services, infrastructure, and scalability',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a System Architect. Follow company architecture standards: layered service separation, async jobs, metrics & logging, observability via OpenTelemetry, CI/CD hooks.

Define services, responsibilities, data flow, third-party deps, security, and observability fit for a v1 (single-region, low ops).

Include:
- Infrastructure decision matrix: for each component, decide if managed (Supabase, Firebase, Vercel) or self-hosted (Docker, EC2)
- Scalability plan: where and how to scale horizontally, expected limits for MVP vs. full scale
- Providers & Policies (API quotas, caching/attribution, data retention)
- Non-functional requirements (performance, reliability, privacy)

Record all vendor decisions in the Decision Ledger. JSON only.`,
    schema: {
      type: 'object',
      required: [
        'services',
        'dependencies',
        'security',
        'observability',
        'infrastructureDecisions',
        'scalability',
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
        infrastructureDecisions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['component', 'choice', 'rationale'],
            properties: {
              component: { type: 'string' },
              choice: { type: 'string' },
              rationale: { type: 'string' }
            }
          }
        },
        scalability: {
          type: 'object',
          required: ['strategy', 'maxUsersMVP', 'planForScale'],
          properties: {
            strategy: { type: 'string' },
            maxUsersMVP: { type: 'number' },
            planForScale: { type: 'string' }
          }
        },
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
    description: 'Generates comprehensive implementation prompts for Bolt/Cursor covering all phases',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Prompt Engineer. Generate 15-25 actionable prompts following company coding standards.

REQUIRED PROMPT CATEGORIES (must include all):

1. PROJECT SETUP (scaffolding bucket):
   - Initial project scaffolding with framework, build tools, and folder structure
   - Environment configuration (.env setup, API keys placeholders)
   - Git repository initialization and .gitignore

2. DATABASE & BACKEND (backend bucket):
   - Database schema design and migrations
   - Database connection setup and configuration
   - API endpoint implementation (CRUD operations)
   - Authentication and authorization setup
   - Server-side validation and error handling
   - Background jobs/workers if needed

3. FRONTEND FOUNDATION (frontend bucket):
   - UI component library setup
   - Routing configuration
   - State management setup (Context, Redux, Zustand, etc.)
   - API client/service layer
   - Authentication flow (login, signup, logout)

4. CORE FEATURES (frontend bucket):
   - Main user-facing features (based on Must-Have list)
   - Form components with validation
   - Data display components (lists, tables, cards)
   - Search and filtering functionality
   - Real-time updates if needed

5. UX ENHANCEMENTS (frontend bucket):
   - Loading states and skeleton screens
   - Error boundaries and error messages
   - Empty states
   - Toast notifications/alerts
   - Responsive design breakpoints

6. QUALITY & TESTING (qa bucket):
   - Unit tests for critical functions
   - E2E tests for primary flows
   - Accessibility improvements (ARIA labels, keyboard navigation)
   - Performance optimization (code splitting, lazy loading)
   - Security audit (XSS, CSRF protection)

7. DEPLOYMENT & DOCS (docs bucket):
   - Build and deployment configuration
   - Environment-specific configs (dev, staging, prod)
   - README with setup instructions
   - API documentation
   - Release checklist

Each prompt must have:
- Title, detailed prompt with context, files to touch
- Bucket (scaffolding/backend/frontend/qa/docs)
- Owner (backend/frontend/fullstack/devops/docs)
- Constraints and acceptance criteria
- Test requirements (unit/e2e/manual)
- Rollback or idempotency note

Order by dependency. Total: 15-25 prompts covering all categories above.
JSON only.`,
    schema: {
      type: 'object',
      required: ['bolt', 'cursor'],
      properties: {
        bolt: {
          type: 'array',
          minItems: 15,
          maxItems: 25,
          items: {
            type: 'object',
            required: ['title', 'prompt', 'files', 'bucket', 'owner', 'constraints', 'acceptance', 'tests', 'rollback'],
            properties: {
              title: { type: 'string', minLength: 5 },
              prompt: { type: 'string', minLength: 50 },
              files: { type: 'array', items: { type: 'string' } },
              bucket: { type: 'string', enum: ['scaffolding', 'backend', 'frontend', 'qa', 'docs'] },
              owner: { type: 'string' },
              constraints: { type: 'array', items: { type: 'string' }, minItems: 1 },
              acceptance: { type: 'array', items: { type: 'string' }, minItems: 1 },
              tests: { type: 'array', items: { type: 'string' }, minItems: 1 },
              rollback: { type: 'string', minLength: 10 }
            }
          }
        },
        cursor: {
          type: 'array',
          minItems: 15,
          maxItems: 25,
          items: {
            type: 'object',
            required: ['title', 'prompt', 'files', 'bucket', 'owner', 'constraints', 'acceptance', 'tests', 'rollback'],
            properties: {
              title: { type: 'string', minLength: 5 },
              prompt: { type: 'string', minLength: 50 },
              files: { type: 'array', items: { type: 'string' } },
              bucket: { type: 'string', enum: ['scaffolding', 'backend', 'frontend', 'qa', 'docs'] },
              owner: { type: 'string' },
              constraints: { type: 'array', items: { type: 'string' }, minItems: 1 },
              acceptance: { type: 'array', items: { type: 'string' }, minItems: 1 },
              tests: { type: 'array', items: { type: 'string' }, minItems: 1 },
              rollback: { type: 'string', minLength: 10 }
            }
          }
        }
      }
    }
  },
  {
    type: 'qa',
    name: 'QA Manager',
    description: 'Defines quality assurance workflows for CI/CD',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a QA Manager. Define quality assurance workflows for CI/CD.

Include:
- Lint and typecheck requirements
- Unit test coverage goals
- E2E test scenarios
- Accessibility testing (WCAG AA)
- Performance budgets (load time, bundle size)
- Security scanning (OWASP, dependency checks)
- Test environments and data seeding

JSON only.`,
    schema: {
      type: 'object',
      required: ['lintConfig', 'testCoverage', 'e2eScenarios', 'accessibility', 'performanceBudgets', 'security', 'testEnvironments'],
      properties: {
        lintConfig: {
          type: 'object',
          required: ['tool', 'rules'],
          properties: {
            tool: { type: 'string' },
            rules: { type: 'array', items: { type: 'string' } }
          }
        },
        testCoverage: {
          type: 'object',
          required: ['target', 'critical'],
          properties: {
            target: { type: 'string' },
            critical: { type: 'array', items: { type: 'string' } }
          }
        },
        e2eScenarios: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'steps', 'expected'],
            properties: {
              name: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } },
              expected: { type: 'string' }
            }
          }
        },
        accessibility: {
          type: 'object',
          required: ['standard', 'tools', 'checks'],
          properties: {
            standard: { type: 'string' },
            tools: { type: 'array', items: { type: 'string' } },
            checks: { type: 'array', items: { type: 'string' } }
          }
        },
        performanceBudgets: {
          type: 'object',
          required: ['loadTime', 'bundleSize', 'coreWebVitals'],
          properties: {
            loadTime: { type: 'string' },
            bundleSize: { type: 'string' },
            coreWebVitals: { type: 'object' }
          }
        },
        security: {
          type: 'array',
          items: { type: 'string' }
        },
        testEnvironments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'purpose', 'dataSeed'],
            properties: {
              name: { type: 'string' },
              purpose: { type: 'string' },
              dataSeed: { type: 'string' }
            }
          }
        }
      }
    }
  },
  {
    type: 'techwriter',
    name: 'Technical Writer',
    description: 'Generates developer documentation templates',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are a Technical Writer. Generate developer documentation templates.

Create outlines for:
- API Reference (endpoints, auth, examples)
- Setup Guide (prerequisites, installation, configuration)
- Release Checklist (pre-deploy, deploy, post-deploy, rollback)
- Architecture Overview (system diagram description, key components, data flow)

JSON only.`,
    schema: {
      type: 'object',
      required: ['apiReference', 'setupGuide', 'releaseChecklist', 'architectureOverview'],
      properties: {
        apiReference: {
          type: 'object',
          required: ['sections', 'exampleEndpoints'],
          properties: {
            sections: { type: 'array', items: { type: 'string' } },
            exampleEndpoints: { type: 'array', items: { type: 'string' } }
          }
        },
        setupGuide: {
          type: 'object',
          required: ['prerequisites', 'installationSteps', 'configuration'],
          properties: {
            prerequisites: { type: 'array', items: { type: 'string' } },
            installationSteps: { type: 'array', items: { type: 'string' } },
            configuration: { type: 'array', items: { type: 'string' } }
          }
        },
        releaseChecklist: {
          type: 'object',
          required: ['preDeploy', 'deploy', 'postDeploy', 'rollback'],
          properties: {
            preDeploy: { type: 'array', items: { type: 'string' } },
            deploy: { type: 'array', items: { type: 'string' } },
            postDeploy: { type: 'array', items: { type: 'string' } },
            rollback: { type: 'array', items: { type: 'string' } }
          }
        },
        architectureOverview: {
          type: 'object',
          required: ['systemDescription', 'keyComponents', 'dataFlow'],
          properties: {
            systemDescription: { type: 'string' },
            keyComponents: { type: 'array', items: { type: 'string' } },
            dataFlow: { type: 'array', items: { type: 'string' } }
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
    description: 'Merge all artifacts into comprehensive deliverables',
    systemPrompt:
      GLOBAL_GUARDRAILS +
      `You are the Composer. Merge all artifacts into multiple professional deliverables:

1) Business Plan — research insights, strategy, market signals, monetization, risks, go-to-market
2) Technical Architecture — system design, API, data model, infrastructure, scalability
3) Development Sprint Plan — ordered Bolt/Cursor prompts grouped by bucket (scaffolding, backend, frontend, qa, docs) with dependencies
4) Risk Mitigation Strategy — table of top risks with likelihood, impact, mitigation owner
5) Go-to-Market Plan — channels, timeline, budget, early-adopter strategy
6) QA & Documentation Plan — testing strategy, documentation templates

Also output the final Decision Ledger (merged and deduped).
JSON only.`,
    schema: {
      type: 'object',
      required: ['businessPlan', 'technicalArchitecture', 'sprintPlan', 'riskMitigation', 'goToMarket', 'qaDocsPlan', 'decisionLedger'],
      properties: {
        businessPlan: { type: 'string' },
        technicalArchitecture: { type: 'string' },
        sprintPlan: { type: 'string' },
        riskMitigation: { type: 'string' },
        goToMarket: { type: 'string' },
        qaDocsPlan: { type: 'string' },
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
