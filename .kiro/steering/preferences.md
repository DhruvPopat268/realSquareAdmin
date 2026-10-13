# Kiro AI Steering Rules & Preferences

## 1. Response Style & Formatting
- **Conciseness:** Keep all text responses extremely brief, direct, and focused. Avoid unnecessary intros, chatter, conversational filler, or verbose summary descriptions after completing a task.
- **Task Summaries:** When a task is complete, output only a minimal checklist or bulleted list of modified files/actions without lengthy explanations.

## 2. Interaction & Execution Rules
- **Direct Questions First:** If the user asks a question, answer it directly in text. **DO NOT** write, generate, or execute any code until the user explicitly requests implementation or approves a plan.
- **Architectural Consistency:** Always adhere strictly to the project's existing folder structure, patterns, coding conventions, and architectural choices.
- **Frontend UI Consistency:** Before implementing or changing UI, inspect comparable existing pages. When the user points to a page or layout that already exists, reuse that layout and its established components and styling directly instead of introducing a new pattern.
- **Backend Architectural Consistency:** Before implementing or changing backend behavior, inspect comparable existing modules and follow the established route, controller, model, validation, middleware, and shared-helper patterns. Reuse existing services and helpers where appropriate; do not introduce a parallel architecture for the same kind of feature.
- **Keep API Tests in Sync:** Whenever a controller or API endpoint is changed, find its related existing test file(s) and update the tests to cover the changed behavior and response contract. If no relevant tests exist, add them in the project's established test location and style. Do not leave stale assertions for the previous behavior.

## 3. Documentation Constraints
- **ARCHITECTURE.md Updates:** Whenever files are created, modified, or refactored, update `ARCHITECTURE.md` as the **final step** of the task execution process.
