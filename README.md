# AI Agent Planning System

A multi-agent AI system that transforms product ideas into comprehensive, production-ready implementation plans. Using 9 specialized AI agents working in sequence, it generates complete technical specifications, architecture designs, and ready-to-use prompts for tools like Bolt and Cursor.

## Features

- **9 Specialized AI Agents** working collaboratively
- **Competitor Analysis** - Extract insights from competitor products and user reviews
- **Strategic Planning** - Define personas, features, and success metrics
- **UX Architecture** - Design user flows, information architecture, and auth strategy
- **System Design** - Plan services, dependencies, security, and observability
- **Data Modeling** - Generate database schemas with proper constraints and migrations
- **API Design** - Produce OpenAPI 3.1 specifications with webhooks and pagination
- **UI Design System** - Create complete design tokens, components, and motion patterns
- **Implementation Prompts** - Generate step-by-step tasks for Bolt and Cursor
- **Automatic Quality Control** - Critic agent reviews all work and triggers targeted revisions
- **Composer Agent** - Merges all artifacts into cohesive Build Plan and Prompts markdown files

## Architecture

### Agent Workflow

```
User Input → Competitor Miner → Strategy → UX → System → Data → API → UI → Prompts
                                                                              ↓
                                                              Quality Checklist
                                                                              ↓
                                                              Critic/QA Review
                                                                              ↓
                                                          Targeted Revisions (if needed)
                                                                              ↓
                                                              Re-run Critic
                                                                              ↓
                                                              Composer
                                                                              ↓
                                                          Build Plan + Prompts
```

### Global Guardrails

Every agent follows these rules:
- Output valid JSON only, matching strict schemas
- Record all decisions in a shared Decision Ledger
- Never contradict earlier phases
- Keep v1 shippable in 6-8 weeks
- Respect privacy/compliance and avoid vendor lock-in

### Quality Control

The system automatically validates:
1. **Auth consistency** across UX, System, and Data phases
2. **Design system completeness** (motion tokens, skeletons)
3. **API specification quality** (pagination, error models)
4. **Non-functional requirements** (performance, reliability, privacy)
5. **Provider policies** (quotas, caching, attribution)
6. **Decision ledger consistency** (no duplicates or conflicts)
7. **Required prompts** (scaffolding, smoke tests)
8. **Competitor insights** integrated into strategy

If issues are found, affected phases are automatically re-run with targeted fix requests.

### JSON Validation & Repair

Each agent output is validated against its schema using Ajv. If validation fails:
1. System extracts specific errors
2. Sends repair prompt with error details
3. Retries up to 3 times
4. Throws error if validation still fails

This ensures 100% schema compliance in final outputs.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini (via Supabase Edge Function proxy)
- **Validation**: Ajv (JSON Schema validator)
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/          # React components
│   ├── ProjectForm.tsx     # Input form with competitor research fields
│   ├── PlanningProgress.tsx # Real-time progress indicator
│   └── PlanResults.tsx      # Display final results
├── lib/
│   ├── agents.ts           # 9 agent definitions with schemas
│   ├── orchestrator.ts     # Phase execution and revision logic
│   ├── ai-client.ts        # AI API calls with retry logic
│   ├── quality-checklist.ts # Automatic validation rules
│   └── supabase.ts         # Database client and types
supabase/
├── migrations/          # Database schema migrations
└── functions/
    └── ai-proxy/        # Edge function for AI API calls
```

## Database Schema

### Tables

**projects**
- Project metadata (name, description, competitor data)
- Tracks overall planning status

**planning_phases**
- Stores output from each agent (JSON)
- Tracks phase status (pending, processing, completed, failed)
- Records which AI model was used

**prompts**
- Final implementation tasks for Bolt/Cursor
- Organized by tool and execution order

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-agent-planner.git
cd ai-agent-planner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Add your credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase:
- Create a new Supabase project
- Run migrations from `supabase/migrations/`
- Deploy the AI proxy edge function
- Add your OpenAI API key as a Supabase secret

5. Start development server:
```bash
npm run dev
```

## Usage

1. **Enter Project Details**
   - Project name and description
   - Optional: Competitor URLs
   - Optional: User reviews or feedback

2. **Watch the Planning Process**
   - Each agent runs in sequence
   - Progress shown in real-time
   - Automatic quality checks and revisions

3. **Review Results**
   - Strategy and features
   - UX flows and architecture
   - System design and data model
   - API specification
   - UI design system
   - Implementation prompts

4. **Export for Implementation**
   - Copy Bolt prompts for Bolt.new
   - Copy Cursor prompts for Cursor IDE
   - Download Build Plan markdown

## Agent Details

### 1. Competitor & Review Miner
Analyzes competitor products and user reviews to extract:
- Recurring user jobs and pain points
- Feature requests and gaps
- Sentiment analysis
- High-leverage opportunities

### 2. Product Strategist
Defines:
- Problem statement
- User personas and jobs-to-be-done
- Must/Should/Could features
- Success metrics (North Star + guardrails)
- Key decisions (monetization, platform)

### 3. UX Architect
Designs:
- Information architecture
- 3-5 primary user flows
- Authentication strategy
- Edge cases and empty states
- Accessibility requirements

### 4. System Architect
Plans:
- Services and responsibilities
- Third-party dependencies
- Security and observability
- Provider policies (quotas, caching)
- Non-functional requirements

### 5. Data Modeler
Creates:
- Database choice and rationale
- Entity schemas with typed columns
- Constraints (PK, FK, indexes, unique)
- Migration strategy
- Data evolution plan (append-only, snapshots)

### 6. API Designer
Produces:
- OpenAPI 3.1 YAML specification
- RESTful endpoints with auth
- Cursor-based pagination
- Error model and codes
- Webhooks for async operations
- Rate limiting policy

### 7. UI Design System
Defines:
- Color tokens (AA accessible)
- Typography scale
- Spacing and border radius
- Elevation system
- Motion durations and easing
- Component library with props/states
- Loading skeletons

### 8. Prompt Engineer
Generates:
- 6-12 focused implementation tasks
- Ordered by dependency
- Files to modify
- Constraints and acceptance criteria
- Test requirements
- Includes scaffolding + smoke test tasks

### 9. Critic/QA
Reviews:
- Cross-phase contradictions
- Missing edge cases
- Unrealistic assumptions
- Risk severity (0-1 scale)
- Targeted revision requests

### 10. Composer
Merges:
- All artifacts into Build Plan markdown
- Implementation tasks into Prompts markdown
- Deduplicated Decision Ledger

## Development

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Supabase](https://supabase.com/)
- AI by [OpenAI](https://openai.com/)
- Icons by [Lucide](https://lucide.dev/)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built to help developers ship better products faster.
