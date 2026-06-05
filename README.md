# UI Regression Recorder

Turn a human UI operation into a reusable regression capability set instead of leaving it as a one-off recording.

This skill is built around one idea:

> The goal is not to save a screen recording script. The goal is to split manual actions into business capabilities: plan the flow first, match existing scripts second, and execute regression in a visible browser last.

It turns "I want to verify a page behavior" into an automation flow that is reusable, maintainable, and traceable.

## Underlying Principle

The core idea is not "record once, replay forever".

The core idea is:

1. take one complete business flow as source material
2. decompose it into stable business capabilities
3. decompose the script into reusable helpers and specs
4. register those capabilities in a machine-readable map
5. assemble new business flows from old capabilities

In other words, this skill treats UI regression as workflow compilation, not script archiving.

One recording may contain many reusable pieces:

- open module
- search workspace
- create workspace
- create asset
- verify duplicate rejection

Once these pieces exist, a later request does not need a brand new end-to-end script. The skill can plan the new target flow, find matching capabilities, and assemble a new runnable script from them.

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

## Skill Working Principle

This skill works as a four-stage system:

### 1. Business decomposition

The skill first converts the user request into ordered business steps.

Example:

```text
Goal: validate same-space workspace duplicate rejection
Steps:
1. enter target space
2. open UI design
3. create workspace once
4. create same workspace again
5. verify duplicate rejection
```

This happens before selecting any script.

### 2. Capability matching

Each business step is matched against the capability registry in `flows.json`, shared helpers, and known specs.

The skill does not start by picking the most similar full spec. It starts by asking:

- which step already exists as a capability
- which step can be reused with different parameters
- which step is missing and must be recorded

### 3. Script decomposition and assembly

A full recording is never treated as the only final artifact.

The skill splits it into:

- raw recording
- cleaned spec
- shared helpers
- capability metadata

Then, for a new business request, it assembles a new runnable flow from those reusable pieces.

That means the system can do both:

- split one old script into smaller capabilities
- combine several old capabilities into one new script

### 4. Visible execution and feedback

After assembly, the skill runs the smallest valid flow in a headed browser by default. If the run fails, it backtracks through previous capability postconditions instead of blindly patching the current selector.

So the loop is:

```text
record -> split -> register -> reuse -> assemble -> run -> refine
```

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

This is also why the skill can support "new business from old assets":

- old business flow A gives capabilities `a`, `b`, `c`
- old business flow B gives capabilities `c`, `d`, `e`
- new business flow C may be assembled as `a + c + e`

The skill is designed to make that composition possible and maintainable.

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
