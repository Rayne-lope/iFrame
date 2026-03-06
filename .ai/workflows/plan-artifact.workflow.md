# AFinity Plan Artifact Workflow

## Purpose
Ensure planning outputs are consistently captured as artifacts that can be detected and reviewed.

## Delimiter Contract (Required)
When generating a plan artifact, output exactly one markdown plan block wrapped with:

<<<PLAN_MD>>>
...plan markdown...
<<<END_PLAN_MD>>>

## Minimum Plan Structure
The markdown plan should include these sections:
- Title
- Context
- Goals
- Non-Goals
- Steps
- Risks
- Validation

## Artifact Rules
- Keep plan concise, implementation-ready, and decision-complete.
- Avoid multiple plan blocks in one response.
- Prefer stable, explicit file references when proposing changes.
