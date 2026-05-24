# Contributing to Clotient

Welcome! We are excited that you want to contribute to **Clotient**. As an open-source project, we rely on community contributions to make it better.

Please review these guidelines before submitting a Pull Request.

---

## Code of Conduct

We expect all contributors to maintain respectful and collaborative communication. Avoid aggressive, dismissive, or inappropriate language.

---

## Coding Guidelines

### Frontend (React & TypeScript)
- Use functional components with TypeScript interfaces defined in `src/types/index.ts`.
- Ensure components are modular and keep state management clean.
- Use Tailwind CSS v4 utility classes and CSS variables for theming.
- Do not use direct DOM manipulations; rely on React state.

### Backend (Rust)
- Follow standard Rust style practices (`cargo fmt`).
- Avoid `unwrap()` calls on options/results in Tauri commands. Use `.map_err(...)` or structured error handling to bubble failures up to the frontend UI cleanly.
- Document Rust structs and commands.

---

## Contribution Workflow

1. **Fork and Clone** the repository.
2. **Create a local branch** describing your feature or fix (e.g. `feature/postman-export-fix` or `bugfix/env-parser-edgecase`).
3. **Commit your changes** using clean commit descriptions (e.g., `feat: add raw text payload support` or `fix: handle empty headers list in parser`).
4. **Push your changes** to your fork and submit a Pull Request.

---

## Getting Help

If you encounter any bugs, feel free to open a detailed issue in the repository tracking system. Ensure you include:
- System OS info
- Step-by-step reproduction instructions
- Expected vs. actual outcomes
- Relevant console logs or screenshot details
