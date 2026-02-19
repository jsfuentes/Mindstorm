General
## Making New Files
- Over 200 lines in a new file is a sign the file should be split up especially on Frontend
- Over 100 lines in a function is a good sign the function should be split up
- Use *.type.ts for type files unless there is a better existing place for it to go
- Put the most high level function that the file is named after at the top. Then you scroll to see the inner parts of that function. 

## Imports & Exports
- Never import something then reexport it in the file, always use direct imports unless its a package that already has a practice of exporting from an index
- No barrel exports. No re-exports of types. Always import directly from the source package where the type/function is defined.
- Import types from their actual source package (e.g. Prisma types from `@latent/database`, not from a package that re-exports them)

## Naming
- Non-component files must use kebab-case (e.g. `autofill-entry.ts` not `autofillEntry.ts`). Only `.tsx` React component files use PascalCase.
- When renaming something, apply the rename consistently across the entire codebase

## Types & Code Style
- Before writing custom implementations or utilities, check to see if any packages are already installed to use it or packages to do the same thing are installed elsewhere in the project and install and use those. For example, lodash `uniq`, `groupBy`, etc.
- Don't create unnecessary intermediate types or wrapper types. If an existing type works, use it directly.
- Minimize TypeScript `as` assertions. Use proper typing, generics, or type guards instead.
- Make components generic and reusable, not domain-specific (e.g. `CollapsibleRow` not `MedicationRow`)

## Code Organization
- Use folder structure to organize code by context (e.g. `content/` and `background/` subdirectories) instead of adding comments explaining where code runs

## Worktree Workflow

When the user asks to use a worktree (e.g., "use a worktree", "develop in a worktree"):

1. Create a worktree: `git worktree add ../mindstorm-dev -b dev-<feature>`
2. Install deps: `npm install --prefix ../mindstorm-dev`
3. Make all code changes in `../mindstorm-dev/` (not the main worktree)
4. Run tests: `npx playwright test` from the worktree
5. Run VLM validation if screenshots were taken
6. Only if all tests pass, merge into main:
   - `git -C /Users/jorge/Projects2/mindstorm-claude merge dev-<feature>`
   - `npm run build --prefix /Users/jorge/Projects2/mindstorm-claude`
7. Clean up: `git worktree remove ../mindstorm-dev && git branch -d dev-<feature>`
8. Tell the user to restart the server to pick up changes

The user runs the app with `npm run build && npm start` on port 4000 (production mode, no HMR).