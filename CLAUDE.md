# CLAUDE.md — TritonTrace Frontend Refinement

## Project Objective

The current task is to **refine and improve the frontend of TritonTrace**.

The goal is to produce a clean, polished, reliable frontend with well-structured JavaScript and a consistent user experience. Focus on improving the existing frontend rather than rebuilding the application unnecessarily.

## Current Project Structure

```text
TritonTrace/
├── backend/
├── data/
├── docs/
├── frontend/
│   └── Triton_trace/
│       ├── public/
│       ├── src/
│       ├── .env
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       └── ...
├── ml/
├── .gitignore
├── Agents.md
└── TritonTrace_PRD.md
```

The main frontend application is located at:

```text
frontend/Triton_trace/
```

## Data Architecture

For this frontend-refinement phase:

- **All application data will be stored in memory.**
- Data should be seeded from local/static sources as required by the frontend.
- Do not introduce a database dependency for this task.
- Do not introduce persistent storage unless explicitly requested.
- The backend does not need to provide application data for the frontend during this phase.
- The ML layer does not need to provide application data for the frontend during this phase.
- Assume the backend and ML components are effectively placeholders for now.
- Build the frontend so that replacing seeded/in-memory data with real API data later is straightforward.

Prefer clear data boundaries so seeded data can eventually be replaced by API responses without rewriting UI components.

## Primary Task

Refine the TritonTrace frontend.

This includes:

- Improving the overall UI/UX.
- Making layouts consistent and responsive.
- Improving navigation and information hierarchy.
- Making components easier to understand and maintain.
- Improving visual consistency across pages.
- Improving loading, empty, error, and success states where applicable.
- Removing unnecessary UI complexity.
- Keeping interactions intuitive.
- Making the application feel like a finished product rather than a prototype.

Do not change backend or ML functionality unless it is absolutely required to support the frontend.

## Coding Requirements

### JavaScript

Write **JavaScript**, not TypeScript, unless explicitly requested otherwise.

Use modern JavaScript and React conventions.

Prefer:

- Functional React components.
- Hooks where appropriate.
- Small, focused components.
- Descriptive variable and function names.
- Clear component responsibilities.
- Reusable utilities for repeated logic.
- Simple state management where possible.
- Data-driven rendering instead of duplicated markup.

Avoid:

- Giant components.
- Deeply nested conditional logic.
- Duplicate UI code.
- Unnecessary abstractions.
- Unused variables/imports.
- Hard-coded values scattered throughout components.
- Excessive comments that simply restate what the code does.

## Code Quality

Code should be:

- Readable.
- Maintainable.
- Consistent.
- Modular.
- Predictable.
- Easy for another developer to understand.

Before considering a change complete:

1. Check for unused imports and variables.
2. Check that component names are descriptive.
3. Check that state is only stored where necessary.
4. Check that repeated logic has not been duplicated.
5. Check that the UI works at different viewport sizes.
6. Check for obvious console errors and warnings.
7. Check that existing functionality has not been unnecessarily broken.

## Frontend Architecture

Keep the following separation where practical:

```text
src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── data/           # Seeded/in-memory application data
├── hooks/          # Reusable React hooks
├── utils/          # Pure helper functions
├── assets/         # Static frontend assets
└── ...
```

Do not create folders simply for the sake of architecture. Add structure when it makes the code easier to maintain.

## Seeded Data

Seed data should be:

- Centralized where practical.
- Easy to modify.
- Clearly separated from UI components.
- Representative of the data the final application will eventually receive from the backend/ML systems.

Avoid embedding large data objects directly inside JSX components.

Example approach:

```js
// src/data/seedData.js
export const seedData = [
  // application data
];
```

Components should consume this data rather than defining large datasets themselves.

## Backend and ML Boundary

Do not assume that backend or ML services are available during frontend development.

For this phase:

```text
Frontend
   ↓
Seeded / in-memory data
```

Later, the intended architecture can become:

```text
Frontend
   ↓
Backend API
   ↓
ML / processing layer
```

Keep frontend data access sufficiently separated that this transition is easy.

## UI/UX Principles

Prioritize:

1. Clarity
2. Consistency
3. Usability
4. Visual hierarchy
5. Responsive behavior
6. Performance

Avoid adding UI elements merely because they look impressive. Every element should serve a purpose.

Use consistent:

- Spacing.
- Typography.
- Button styles.
- Cards.
- Borders.
- Icons.
- Colors.
- Status indicators.
- Interactive states.

Important states should be explicitly designed:

- Loading.
- Empty.
- Error.
- Success.
- Selected/active.
- Disabled.

## Existing Technology

Work with the existing frontend stack rather than replacing it unnecessarily.

The project currently uses a Vite-based React frontend and includes Tailwind configuration. Inspect the existing implementation before introducing new libraries or changing the styling approach.

Do not add a new UI framework or major dependency unless there is a clear reason and it is explicitly approved.

## Development Rules

Before changing code:

1. Inspect the existing component structure.
2. Understand how the current page works.
3. Reuse existing components and styles when appropriate.
4. Identify the smallest clean change that achieves the requested result.

When modifying an existing component, avoid rewriting unrelated code.

When adding a new component, keep it focused and reusable where reuse is actually likely.

## Git / Branch Context

The current work is being developed on a dedicated branch:

```text
user_model_app
```

The frontend work may later be merged back into the relevant feature branch.

Do not perform Git operations such as merge, reset, rebase, force-push, or branch deletion unless explicitly requested.

## Definition of Done

A frontend change is considered complete when:

- The requested UI behavior is implemented.
- The code is clean and readable.
- JavaScript is used consistently.
- Seeded/in-memory data is used where application data is required.
- Backend/ML dependencies have not been unnecessarily introduced.
- Existing functionality continues to work.
- The UI is responsive.
- Obvious console errors/warnings are resolved.
- The implementation does not contain unnecessary duplication or dead code.

## Working Style for Claude

When working on this project:

- Inspect before editing.
- Make focused changes.
- Prefer simple solutions.
- Preserve working functionality.
- Do not invent backend endpoints when seeded data is sufficient.
- Do not create unnecessary infrastructure.
- Keep the codebase understandable for a developer who will maintain it later.
- If a requirement is ambiguous, inspect the existing code and project documentation first.
- If a change could significantly alter architecture or existing behavior, explain the impact before making it.
