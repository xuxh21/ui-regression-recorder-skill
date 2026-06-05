# UI Regression Recorder

Turn a human UI operation into a reusable regression capability set instead of leaving it as a one-off recording.

This skill is built around one idea:

> The goal is not to save a screen recording script. The goal is to split manual actions into business capabilities: plan the flow first, match existing scripts second, and execute regression in a visible browser last.

It turns "I want to verify a page behavior" into an automation flow that is reusable, maintainable, and traceable.

## What This Skill Solves

Normal Playwright recording solves only the first step: "can we record clicks?"

Real UI regression work needs more:

- plan from the business goal before choosing a script
- extract reusable capabilities from a full recording
- reuse the same helper repeatedly for duplicate-validation or batch scenarios
- run regression in a headed browser by default so the operator can see what happened
- backtrack failures by checking the previous capability postcondition before patching the current selector

This skill focuses on that full workflow.

## Core Method

The workflow is:

1. Record one complete business flow.
2. Preserve the raw Playwright codegen output.
3. Clean it into stable specs and shared helpers.
4. Register operations and capabilities in `flows.json`.
5. For later requests, plan the business steps first.
6. Match each step to existing capabilities.
7. Only record again when a capability is truly missing or stale.
8. Run the regression in a visible browser unless the user explicitly wants CI/headless mode.

## Why It Is Different

This skill does not treat a recorded spec as the final asset.

The final asset is a capability map:

- `login`
- `open target space`
- `open asset type`
- `create workspace`
- `create prototype`
- `verify created row`

Once these are extracted, later flows become compositions of existing capabilities instead of fresh recordings.

## Practical Example

A real refinement thread behind this skill is Codex session `019e8904-5b39-7120-9aa4-48c3fd312123`.

That session pushed the skill toward four concrete rules:

- flow-first planning before script selection
- repeated-capability reuse for duplicate validation
- headed browser by default for human-visible regression
- failure backtracking through previous postconditions

Example:

- First run: record `create prototype asset`
- Later run: validate `UI design workspace duplicate rejection`

The second run is not a brand new flow. It is:

1. plan the target business flow
2. reuse `open-ui-design-for-space`
3. call `createWorkspace(... expected: success)`
4. call `createWorkspace(... expected: duplicate)`
5. run in a visible browser

That is the core of this skill.

## Repository Layout

```text
.
├── README.md
├── SKILL.md
├── agents/
│   └── openai.yaml
└── assets/
    ├── flows.template.json
    └── playwright-common-flows.template.ts
```

## Included Files

- `SKILL.md`
  The full operating guide for initialize, record, clean, compose, rerun, and debug workflows.

- `agents/openai.yaml`
  Basic display metadata for the skill.

- `assets/flows.template.json`
  Starter registry for operations, capabilities, and history.

- `assets/playwright-common-flows.template.ts`
  Starter helper library for shared Playwright flows such as overlay cleanup, page checks, workspace creation, and current-page actions.

## Operating Principles

### 1. Plan before replay

Do not start by picking the most similar script.

Start by answering:

- what business outcome is being validated
- what the ordered steps are
- which capabilities already exist
- which step is missing

### 2. Reuse capabilities, not whole scripts

If a full script contains the needed behavior, extract and reuse the relevant helper instead of cloning the whole spec.

### 3. Headed browser by default

For user-facing regression, the browser should be visible.

Headless is only for CI or when the user explicitly wants unattended execution.

### 4. Preserve raw, clean separately

Raw recordings stay untouched.

Cleaned specs and helpers are the maintainable layer.

### 5. Backtrack failures

If step N fails, first validate whether step N-1 actually completed. The visible failure point is often not the root cause.

## Typical Use Cases

- Initialize a project for UI regression
- Record a named business operation
- Convert raw Playwright codegen output into stable regression specs
- Extract shared helpers from multiple flows
- Execute a known flow with new test data
- Start from the current logged-in page instead of replaying login
- Update only the changed capability after a page revision

## Example Prompts

```text
使用 $ui-regression-recorder。初始化当前工程。
```

```text
使用 $ui-regression-recorder。我要录制“创建原型资产”操作，从登录开始录制。
```

```text
使用 $ui-regression-recorder。验证同一研发空间下 UI 设计工作区不允许重名。
要求：先规划流程，再找已有脚本；默认打开可见浏览器。
```

```text
使用 $ui-regression-recorder。我已经登录并停在目标页面，从当前页面开始执行后半段，不要重新登录。
```

## Installation Notes

This repository contains the skill source itself. To use it as a local Codex skill, place it under your global skill directory, for example:

```text
~/.agents/skills/ui-regression-recorder/
```

If you are using a project-specific workflow, copy the templates into the target repo and let the skill initialize:

- `tests/e2e/raw/`
- `tests/e2e/specs/`
- `tests/e2e/helpers/`
- `tests/e2e/fixtures/`
- `tests/e2e/.generated/`
- `tests/e2e/flows.json`

## Recommended Tooling

- Playwright CLI
- `@playwright/mcp`
- Chrome or Playwright MCP current-page execution when login state must be reused

## Status

This repository publishes the current local version of the skill used in real Codex sessions and refined through actual UI regression work, not just a conceptual template.
