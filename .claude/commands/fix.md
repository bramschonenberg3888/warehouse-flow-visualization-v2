---
name: fix
description: Run typechecking and linting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check

This command runs all linting and typechecking tools for this project, collects errors, groups them by domain, and spawns parallel agents to fix them.

## Step 1: Run Linting and Typechecking

Run ALL of the following commands and collect their output:

```bash
bun run lint
bun run type-check
bun run format:check
```

## Step 2: Collect and Parse Errors

Parse the output from the linting and typechecking commands. Group errors by domain:

- **Type errors**: Issues from `tsc --noEmit` (type-check)
- **Lint errors**: Issues from `eslint` (lint)
- **Format errors**: Issues from `prettier --check` (format:check)

Create a list of all files with issues and the specific problems in each file.

## Step 3: Spawn Parallel Agents

For each domain that has issues, spawn an agent in parallel using the Task tool:

**IMPORTANT**: Use a SINGLE response with MULTIPLE Task tool calls to run agents in parallel.

Example prompt for each agent:

### Type Error Fixer Agent

"Fix the following TypeScript type errors in this project. After fixing, run `bun run type-check` to verify all type errors are resolved. Here are the errors: [LIST OF TYPE ERRORS]"

### Lint Error Fixer Agent

"Fix the following ESLint errors in this project. After fixing, run `bun run lint` to verify all lint errors are resolved. Here are the errors: [LIST OF LINT ERRORS]"

### Format Error Fixer Agent

"Fix the following Prettier formatting issues by running `bun run format` to auto-format all files. Then run `bun run format:check` to verify all formatting issues are resolved. Here are the files with formatting issues: [LIST OF FILES]"

Each agent should:

1. Receive the list of files and specific errors in their domain
2. Fix all errors in their domain
3. Run the relevant check command to verify fixes
4. Report completion

## Step 4: Verify All Fixes

After all agents complete, run the full check again to ensure all issues are resolved:

```bash
bun run lint && bun run type-check && bun run format:check
```

If any issues remain, report them to the user.
