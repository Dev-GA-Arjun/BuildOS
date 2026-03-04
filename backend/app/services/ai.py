from openai import OpenAI
from app.core.config import get_settings
import json, logging

settings = get_settings()
client = OpenAI(
    api_key=settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1"
)
logger = logging.getLogger(__name__)


def _generate(prompt: str) -> str:
    response = client.chat.completions.create(
        model="arcee-ai/trinity-large-preview:free",  # ✅
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()

def evaluate_project(
    project_title: str,
    project_description: str,
    skills_input: str,
    deadline_weeks: int,
) -> dict:
    prompt = f"""You are BuildOS, an AI mentor for entry-level developers.

Evaluate if this developer can complete their project.

TITLE: {project_title}
DESCRIPTION: {project_description}
SKILLS: {skills_input}
TIMELINE: {deadline_weeks} weeks

Respond ONLY in this exact JSON format:
{{
    "feasible": true or false,
    "evaluation": "2-3 sentences assessing honestly",
    "suggested_weeks": null or a number,
    "missing_skills": null or "comma separated skills"
}}"""

    return json.loads(_generate(prompt))


def generate_project_plan(
    project_title: str,
    project_description: str,
    skills_input: str,
    deadline_weeks: int,
) -> dict:
    # Cap weeks to avoid massive outputs hitting rate limits
    capped_weeks = min(deadline_weeks, 8)

    prompt = f"""You are BuildOS, an AI mentor for entry-level developers.

Generate a week-by-week plan for this project.

TITLE: {project_title}
DESCRIPTION: {project_description}
SKILLS: {skills_input}
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
                        {{"title": "Step 1"}},
                        {{"title": "Step 2"}}
                    ]
                }}
            ]
        }}
    ]
}}

Rules:
- Exactly {capped_weeks} phases
- 2-3 tasks per week (keep it concise)
- 2-3 subtasks per task
- Week 1: setup. Last week: testing and polish."""

    return json.loads(_generate(prompt))


def validate_completed_project(
    project_title: str,
    project_description: str,
    completed_tasks: list[str],
) -> dict:
    # Only send first 20 tasks to avoid huge prompts
    tasks_summary = completed_tasks[:20]

    prompt = f"""You are BuildOS, validating a completed project.

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

    return json.loads(_generate(prompt))