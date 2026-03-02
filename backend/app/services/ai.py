from google import genai
from google.genai import types

from app.core.config import get_settings

settings = get_settings()
client = genai.Client(api_key=settings.gemini_api_key)


def _generate(prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt,
    )
    text = response.text.strip()
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
    prompt = f"""
You are BuildOS, an AI that helps entry-level developers complete their projects.

A user wants to build a project. Evaluate if they can complete it with their current skills and timeline.

PROJECT TITLE: {project_title}
PROJECT DESCRIPTION: {project_description}
USER'S CURRENT SKILLS: {skills_input}
TIMELINE GIVEN: {deadline_weeks} weeks

Respond ONLY in this exact JSON format, nothing else:
{{
    "feasible": true or false,
    "evaluation": "2-3 sentences explaining your assessment honestly",
    "suggested_weeks": null or a number (if timeline is too short, suggest realistic weeks),
    "missing_skills": null or "comma separated list of skills they need to learn first"
}}

Rules:
- If skills are too low for the project, set feasible to false and list missing_skills
- If skills match but timeline is too short, set feasible to true but set suggested_weeks
- If both skills and timeline are good, set feasible to true, suggested_weeks to null, missing_skills to null
- Be honest but encouraging
- Think from the perspective of an entry-level developer mentor
"""

    text = _generate(prompt)

    import json
    result = json.loads(text)
    return result


def generate_project_plan(
    project_title: str,
    project_description: str,
    skills_input: str,
    deadline_weeks: int,
) -> dict:
    prompt = f"""
You are BuildOS, an AI that helps entry-level developers complete their projects.

Generate a detailed week-by-week project plan for this project.

PROJECT TITLE: {project_title}
PROJECT DESCRIPTION: {project_description}
USER'S CURRENT SKILLS: {skills_input}
TIMELINE: {deadline_weeks} weeks

Respond ONLY in this exact JSON format, nothing else:
{{
    "phases": [
        {{
            "title": "Week 1 - Project Setup",
            "week_number": 1,
            "description": "What this week focuses on",
            "tasks": [
                {{
                    "title": "Task title",
                    "description": "What to do",
                    "subtasks": [
                        {{"title": "Specific step 1"}},
                        {{"title": "Specific step 2"}}
                    ]
                }}
            ]
        }}
    ]
}}

Rules:
- Create exactly {deadline_weeks} phases, one per week
- Each week should have 2-4 tasks
- Each task should have 2-5 subtasks
- Tasks should be specific and actionable, not vague
- Build complexity gradually — setup first, features later, testing/polish last
- Match the complexity to entry-level skills: {skills_input}
- Last week should always include testing and final polish
"""

    text = _generate(prompt)

    import json
    result = json.loads(text)
    return result


def validate_completed_project(
    project_title: str,
    project_description: str,
    completed_tasks: list[str],
) -> dict:
    prompt = f"""
You are BuildOS, an AI that validates completed projects by entry-level developers.

A developer claims to have completed this project. Review what they built.

PROJECT TITLE: {project_title}
PROJECT DESCRIPTION: {project_description}
COMPLETED TASKS:
{chr(10).join(f'- {task}' for task in completed_tasks)}

Respond ONLY in this exact JSON format, nothing else:
{{
    "passed": true or false,
    "report": "2-3 sentences validating what was built and any gaps",
    "completion_percentage": a number from 0 to 100
}}

Rules:
- Be fair but honest
- If most core tasks are done, passed should be true
- If major features are missing, passed should be false
- Encourage the developer regardless
"""

    text = _generate(prompt)

    import json
    result = json.loads(text)
    return result