# Kiro AI Steering Rules & Preferences

## 1. Response Style & Formatting
- **Conciseness:** Keep all text responses extremely brief, direct, and focused. Avoid unnecessary intros, chatter, conversational filler, or verbose summary descriptions after completing a task.
- **Task Summaries:** When a task is complete, output only a minimal checklist or bulleted list of modified files/actions without lengthy explanations.

## 2. Interaction & Execution Rules
- **Direct Questions First:** If the user asks a question, answer it directly in text. **DO NOT** write, generate, or execute any code until the user explicitly requests implementation or approves a plan.
- **Architectural Consistency:** Always adhere strictly to the project's existing folder structure, patterns, coding conventions, and architectural choices.

## 3. Documentation Constraints
- **ARCHITECTURE.md Updates:** Whenever files are created, modified, or refactored, update `ARCHITECTURE.md` as the **final step** of the task execution process.