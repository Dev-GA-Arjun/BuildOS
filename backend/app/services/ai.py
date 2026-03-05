from openai import OpenAI
from app.core.config import get_settings
import json, logging

settings = get_settings()
client = OpenAI(
    api_key=settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1"
)
logger = logging.getLogger(__name__)

# ── System prompts ────────────────────────────────────────────────────────────

EVALUATOR_SYSTEM = """You are BuildOS Evaluator — an honest but encouraging AI mentor for entry-level developers.

Your job is to assess if a developer can realistically complete a project given their current skills and timeline.

FEASIBILITY RULES — follow strictly:
1. Return "feasible": false ONLY for projects requiring deep domain expertise the developer completely lacks:
   - Blockchain / smart contracts / cryptography with zero background
   - AI/ML model training with zero Python/math background
   - Real-time systems, compilers, operating systems level work
   - Complex backend when developer has zero backend knowledge
2. Return "feasible": true if the developer has foundational skills and the gaps are LEARNABLE LIBRARIES or TOOLS (Redux, Tailwind, specific APIs, frameworks) — these are NOT blockers, just things to learn along the way
3. Most web dev projects (React apps, frontends, simple backends, portfolios, clones) should be FEASIBLE for developers with basic skills in that area
4. Be encouraging but honest — entry-level devs learn as they build

SUGGESTED WEEKS RULES:
- Only suggest different weeks if the timeline is genuinely unrealistic (less than half what's needed)
- Never suggest more than 2x the user's original timeline
- If the user's timeline is reasonable, return suggested_weeks as null
- Do NOT keep inflating weeks on re-evaluation

You MUST respond only in valid JSON. No explanations outside the JSON. No markdown. No extra text."""

PLANNER_SYSTEM = """You are BuildOS Planner — an AI mentor that creates precise, realistic execution plans for entry-level developers.

Your job is to break a project into a week-by-week plan with tasks and subtasks that match the developer's skill level.

RULES:
- Week 1 is always setup and environment
- Last week is always testing, polish, and deployment prep
- Tasks must be concrete and actionable, not vague
- Subtasks must be small enough to complete in 1-2 hours
- Match complexity to the developer's actual skill level
- You MUST respond only in valid JSON. No markdown. No extra text."""

VALIDATOR_SYSTEM = """You are BuildOS Validator — an AI that honestly assesses whether a developer truly completed their project.

Your job is to review completed tasks and determine if the project was genuinely built.

RULES:
- Be honest — if critical tasks are missing, return "passed": false
- A project passes if the core features described were built and tested
- You MUST respond only in valid JSON. No markdown. No extra text."""


# ── Core generator ────────────────────────────────────────────────────────────

def _generate(system_prompt: str, user_prompt: str) -> str:
    response = client.chat.completions.create(
        model="arcee-ai/trinity-large-preview:free",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
    )
    text = response.choices[0].message.content.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return text.strip()


# ── AI functions ──────────────────────────────────────────────────────────────

def evaluate_project(
    project_title: str,
    project_description: str,
    skills_input: str,
    deadline_weeks: int,
) -> dict:
    user_prompt = f"""Evaluate this project:

TITLE: {project_title}
DESCRIPTION: {project_description}
DEVELOPER SKILLS: {skills_input}
TIMELINE: {deadline_weeks} weeks (user's chosen timeline — only suggest different if genuinely unrealistic)

Respond ONLY in this exact JSON format:
{{
    "feasible": true or false,
    "evaluation": "2-3 honest sentences. Be encouraging if feasible. If not feasible, clearly state the specific domain knowledge gap.",
    "suggested_weeks": null or a number (only if user timeline is genuinely too short — max {deadline_weeks * 2} weeks),
    "missing_skills": null or "comma separated learnable skills or tools to pick up during the project"
}}"""

    return json.loads(_generate(EVALUATOR_SYSTEM, user_prompt))


def generate_project_plan(
    project_title: str,
    project_description: str,
    skills_input: str,
    deadline_weeks: int,
) -> dict:
    capped_weeks = min(deadline_weeks, 8)

    user_prompt = f"""Generate a {capped_weeks}-week plan for this project:

TITLE: {project_title}
DESCRIPTION: {project_description}
DEVELOPER SKILLS: {skills_input}
WEEKS: {capped_weeks}

Respond ONLY in this exact JSON format:
{{
    "phases": [
        {{
            "title": "Week 1 - Setup",
            "week_number": 1,
            "tasks": [
                {{
                    "title": "Task title",
                    "description": "What to do",
                    "subtasks": [
                        {{"title": "Concrete step 1"}},
                        {{"title": "Concrete step 2"}}
                    ]
                }}
            ]
        }}
    ]
}}

Requirements:
- Exactly {capped_weeks} phases (one per week)
- 2-3 tasks per phase
- 2-3 subtasks per task
- Week 1: project setup and environment
- Last week: testing, polish, deployment prep"""

    return json.loads(_generate(PLANNER_SYSTEM, user_prompt))


def validate_completed_project(
    project_title: str,
    project_description: str,
    completed_tasks: list[str],
) -> dict:
    tasks_summary = completed_tasks[:20]

    user_prompt = f"""Validate this completed project:

TITLE: {project_title}
DESCRIPTION: {project_description}
COMPLETED TASKS:
{chr(10).join(f'- {task}' for task in tasks_summary)}

Respond ONLY in this exact JSON format:
{{
    "passed": true or false,
    "report": "2-3 sentences on what was built, what was achieved, and any gaps",
    "completion_percentage": 0 to 100
}}"""

    return json.loads(_generate(VALIDATOR_SYSTEM, user_prompt))