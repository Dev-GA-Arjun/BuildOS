# BuildOS MVP Scope

## Objective
Ship a portfolio-grade SaaS MVP that validates the core promise: helping users execute consistently toward meaningful goals.

## In-Scope Features
1. **Authentication**
   - Sign up, sign in, and token-based session access.
2. **Goals**
   - Create and manage long-term objectives.
3. **Systems / Plans**
   - Break each goal into repeatable systems/plans.
4. **Tasks**
   - Create tasks under systems and track completion state.
5. **Daily Execution Tracking**
   - Mark daily completion and capture date-based execution.
6. **Progress Analytics**
   - Basic completion rate and goal-level progress indicators.
7. **Streak Tracking**
   - Current and best streak for execution consistency.
8. **Minimal UI**
   - Focused dashboard and task workflow with clean design.

## Out-of-Scope (Phase 2+)
- AI planning assistant and recommendations.
- Weekly review automation.
- Multi-tenant team collaboration.
- Paid subscription management.
- Mobile app.

## MVP Success Criteria
- User can sign up and create at least one goal.
- User can add system(s) and task(s) under that goal.
- User can mark daily execution and see streak updates.
- User can view progress summary at task/system/goal level.
- API and backend structure remain production-friendly and testable.

## Delivery Milestones
1. Backend baseline (FastAPI, config, DB wiring).
2. Core data model and migrations.
3. CRUD endpoints for goals/systems/tasks.
4. Execution and streak logic.
5. Auth hardening and API polish.
6. Frontend integration.
