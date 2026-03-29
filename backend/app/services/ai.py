from openai import OpenAI
from app.core.config import get_settings
import json, logging
import time

settings = get_settings()
logger = logging.getLogger(__name__)


def _get_client(user_key: str | None = None) -> OpenAI:
    return OpenAI(
        api_key=user_key or settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1"
    )


# services/ai.py
PRIMARY_MODEL = "meta-llama/llama-3.3-70b-instruct:free"
FALLBACK_MODEL = "openrouter/auto"
FALLBACK_MODEL_2 = "openrouter/free"


def _generate(system_prompt: str, user_prompt: str, user_key: str | None = None) -> str:
    client = _get_client(user_key)

    for i, model in enumerate([PRIMARY_MODEL, FALLBACK_MODEL, FALLBACK_MODEL_2]):
        try:
            if i > 0:
                time.sleep(1)  # brief pause before fallback attempt
            response = client.chat.completions.create(
                model=model,
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
            text = text.strip()
            json.loads(text)
            return text
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}, trying fallback...")
            continue

    raise Exception("All models failed to generate valid JSON")

# ── System prompts ─────────────────────────────────────────────────────────────

EVALUATOR_SYSTEM = """You are BuildOS Evaluator — an honest but encouraging AI mentor for entry-level developers.

Your job is to assess if a developer can realistically complete a project given their current skills and timeline.

FEASIBILITY RULES — follow strictly:
1. Return "feasible": false ONLY for projects requiring deep domain expertise the developer completely lacks:
   - Blockchain / smart contracts / cryptography with zero background
   - AI/ML model training with zero Python/math background
   - Real-time systems, compilers, operating systems level work
   - Complex backend when developer has zero backend knowledge
2. Return "feasible": true if the developer has foundational skills and the gaps are LEARNABLE LIBRARIES or TOOLS
3. Most web dev projects should be FEASIBLE for developers with basic skills in that area
4. Be encouraging but honest

SUGGESTED WEEKS RULES:
- Only suggest different weeks if the timeline is genuinely unrealistic
- Never suggest more than 2x the user's original timeline
- If the user's timeline is reasonable, return suggested_weeks as null

You MUST respond only in valid JSON. No explanations outside the JSON. No markdown. No extra text."""


CLARIFICATION_SYSTEM = """You are BuildOS — an AI mentor helping developers clarify their project before planning.

Your job is to ask exactly 3 targeted questions to extract the context needed to generate a precise, code-level project plan.

RULES:
- Questions must be SPECIFIC to the project idea given — never generic
- Never ask about: IDE setup, OS, installing tools, or environment
- Focus on: (1) core features scope, (2) key technical decisions, (3) any constraints or integrations
- Each question gets 3-4 quick-reply option chips — make them realistic and specific to the project
- Always include "I'll decide later" or "Not sure yet" as a last option
- Questions must be under 12 words each
- Options must be under 6 words each

You MUST respond only in valid JSON. No markdown. No extra text."""


PLANNER_SYSTEM = """You are BuildOS Planner — a senior software engineer creating precise execution plans for developers.

Your job is to generate a week-by-week plan with tasks and subtasks that are code-level and specific to the project's actual tech stack and features.

ABSOLUTE RULES — violating these makes the plan useless:
- NEVER include: install dependencies, set up IDE, create GitHub repo, initialize git, install VS Code, install Node, configure linter, set up ESLint, create .env file as a standalone task
- EVERY task must be something the developer writes code for — a component, a function, an API endpoint, a schema, a hook
- EVERY subtask must name the actual file, function, or component being built (e.g. "build `useAuth` hook in hooks/useAuth.js" not "add authentication logic")
- Tech stack must appear explicitly in tasks — if they use React, say React; if they use Express, say Express; if they use PostgreSQL, say PostgreSQL
- Match detail level to experience: beginner = more granular subtasks with more context; advanced = fewer, higher-level tasks
- Week 1 is foundation code — schema design, core data models, auth setup IF the project needs auth. Not environment setup.
- Last week is integration, polish, and deployment
- A task is only valid if removing it would break the project

You MUST respond only in valid JSON. No markdown. No extra text."""


VALIDATOR_SYSTEM = """You are BuildOS Validator — an AI that honestly assesses whether a developer truly completed their project.

RULES:
- Be honest — if critical tasks are missing, return "passed": false
- A project passes if the core features described were built and tested
- You MUST respond only in valid JSON. No markdown. No extra text."""


# ── Step 1: Clarification ──────────────────────────────────────────────────────

def generate_clarifying_questions(
    project_title: str,
    project_description: str,
    tech_stack: str,
    experience_level: str,
    user_key: str | None = None,
) -> dict:
    user_prompt = f"""A developer wants to build this project:

TITLE: {project_title}
DESCRIPTION: {project_description}
TECH STACK MENTIONED: {tech_stack or "not specified"}
EXPERIENCE LEVEL: {experience_level}

Ask exactly 3 questions to understand what they actually want to build.
Make every question and every option specific to THIS project.

Respond ONLY in this exact JSON format:
{{
    "questions": [
        {{
            "id": "q1",
            "text": "question under 12 words",
            "options": ["option 1", "option 2", "option 3", "Not sure yet"]
        }},
        {{
            "id": "q2",
            "text": "question under 12 words",
            "options": ["option 1", "option 2", "option 3", "Not sure yet"]
        }},
        {{
            "id": "q3",
            "text": "question under 12 words",
            "options": ["option 1", "option 2", "option 3", "Not sure yet"]
        }}
    ]
}}"""

    return json.loads(_generate(CLARIFICATION_SYSTEM, user_prompt, user_key))


# ── Step 2: Evaluate ───────────────────────────────────────────────────────────

def evaluate_project(
    project_title: str,
    project_description: str,
    tech_stack: str,
    skills_input: str,
    experience_level: str,
    deadline_weeks: int,
    clarification_answers: dict | None = None,
    user_key: str | None = None,
) -> dict:
    answers_block = ""
    if clarification_answers:
        answers_block = "\nCLARIFICATION ANSWERS:\n" + "\n".join(
            f"- {k}: {v}" for k, v in clarification_answers.items()
        )

    user_prompt = f"""Evaluate this project:

TITLE: {project_title}
DESCRIPTION: {project_description}
TECH STACK: {tech_stack}
DEVELOPER SKILLS: {skills_input}
EXPERIENCE LEVEL: {experience_level}
TIMELINE: {deadline_weeks} weeks{answers_block}

Respond ONLY in this exact JSON format:
{{
    "feasible": true or false,
    "evaluation": "2-3 honest sentences. Be encouraging if feasible.",
    "suggested_weeks": null or a number (only if timeline is genuinely too short — max {deadline_weeks * 2}),
    "missing_skills": null or "comma separated learnable skills to pick up during the project"
}}"""

    return json.loads(_generate(EVALUATOR_SYSTEM, user_prompt, user_key))


# ── Step 3: Plan ───────────────────────────────────────────────────────────────

def generate_project_plan(
    project_title: str,
    project_description: str,
    tech_stack: str,
    skills_input: str,
    experience_level: str,
    deadline_weeks: int,
    clarification_answers: dict | None = None,
    github_readme: str | None = None,
    user_key: str | None = None,
) -> dict:
    capped_weeks = min(deadline_weeks, 8)

    answers_block = ""
    if clarification_answers:
        answers_block = "\nCLARIFICATION ANSWERS (use these to make tasks specific):\n" + "\n".join(
            f"- {k}: {v}" for k, v in clarification_answers.items()
        )

    github_block = ""
    if github_readme:
        github_block = f"\nGITHUB README (already built — do not re-plan these parts):\n{github_readme[:1500]}"

    user_prompt = f"""Generate a {capped_weeks}-week execution plan for this project:

TITLE: {project_title}
DESCRIPTION: {project_description}
TECH STACK: {tech_stack}
DEVELOPER SKILLS: {skills_input}
EXPERIENCE LEVEL: {experience_level}
WEEKS: {capped_weeks}{answers_block}{github_block}

TASK QUALITY CHECK — before writing each task, ask yourself:
1. Does this task name an actual file, component, or endpoint?
2. Does it reference the actual tech stack above?
3. Would a developer know exactly what to open in their editor?
If any answer is no — rewrite the task until it passes.

Respond ONLY in this exact JSON format:
{{
    "phases": [
        {{
            "title": "Week 1 - [what ships this week]",
            "week_number": 1,
            "goal": "one sentence — what the developer can run/demo at end of this week",
            "tasks": [
                {{
                    "title": "specific task title referencing actual tech",
                    "description": "what this achieves in the project",
                    "subtasks": [
                        {{"title": "build X in Y file using Z"}},
                        {{"title": "wire X to Y so that Z works"}}
                    ]
                }}
            ]
        }}
    ]
}}

Requirements:
- Exactly {capped_weeks} phases
- 2-3 tasks per phase
- 2-4 subtasks per task
- Week 1: core data models and schema — NOT environment setup
- Last week: integration, end-to-end testing, deployment"""

    return json.loads(_generate(PLANNER_SYSTEM, user_prompt, user_key))


# ── Validate ───────────────────────────────────────────────────────────────────

def validate_completed_project(
    project_title: str,
    project_description: str,
    completed_tasks: list[str],
    user_key: str | None = None,
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
    "report": "2-3 sentences on what was built and any gaps",
    "completion_percentage": 0 to 100
}}"""

    return json.loads(_generate(VALIDATOR_SYSTEM, user_prompt, user_key))

def match_commit_to_task(
    commit_message: str,
    open_tasks: list[dict],
    user_key: str | None = None,
) -> int | None:
    if not open_tasks:
        return None

    task_list = "\n".join(f"- ID {t['id']}: {t['title']}" for t in open_tasks)

    user_prompt = f"""A developer pushed a commit with this message:
"{commit_message}"

Open tasks:
{task_list}

Which task ID does this commit most likely complete?
Reply with ONLY the task ID number, or null if no match.
Do not explain. Just the number or null."""

    system = "You match git commit messages to project tasks. Reply only with a task ID number or null."

    try:
        result = _generate(system, user_prompt, user_key).strip()
        if result.lower() == "null" or not result:
            return None
        return int(result)
    except (ValueError, Exception):
        return None


def verify_task_completion(
    task_title: str,
    task_description: str | None,
    proof: str,
    user_key: str | None = None,
) -> dict:
    user_prompt = f"""A developer claims to have completed this task:

TASK: {task_title}
DESCRIPTION: {task_description or 'No description'}

THEIR PROOF:
{proof}

Did they actually complete this task based on their proof?
Be lenient — if they show genuine effort or partial completion, accept it.

Respond ONLY in this exact JSON:
{{
    "verified": true or false,
    "feedback": "one sentence — what they built or why it wasn't accepted"
}}"""

    system = "You verify task completion for developers. Be encouraging but honest. Reply only in JSON."
    return json.loads(_generate(system, user_prompt, user_key))