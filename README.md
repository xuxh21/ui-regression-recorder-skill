# UI Page Automation Testing Skill

[![Release](https://img.shields.io/github/v/release/xuxh21/ui-regression-recorder-skill)](https://github.com/xuxh21/ui-regression-recorder-skill/releases)

[中文](./README.zh-CN.md)

Turn one human UI page flow into reusable automation capabilities, then assemble new testing flows from those capabilities instead of recording everything again.

> This skill is not about saving a one-off screen recording script. It decomposes a full business flow into reusable capabilities, splits the script into maintainable parts, and assembles the smallest runnable regression for a new request.
>
> Latest stable release: [v0.1.3](https://github.com/xuxh21/ui-regression-recorder-skill/releases/tag/v0.1.3)
>
> All releases: [GitHub Releases](https://github.com/xuxh21/ui-regression-recorder-skill/releases)

## Overview

UI regression usually breaks down in two places:

- the original recording is too raw to maintain
- every new request starts from a brand new script

This skill is designed to solve both.

It preserves the first complete recording, extracts reusable capabilities from it, registers them in `flows.json`, and later uses those capabilities to assemble new business flows with a visible browser by default.

## Core Idea

The core idea is not "record once, replay forever".

The real idea is:

1. record one complete business flow
2. decompose that flow into stable business capabilities
3. decompose the script into raw recording, cleaned specs, and shared helpers
4. register those capabilities in a machine-readable map
5. assemble new business flows from old capabilities

In other words, this skill treats UI regression as workflow compilation, not script storage.

One recording can contain many reusable pieces:

- open the target module
- open the list page
- create a record
- edit a record
- verify duplicate-name rejection

Once these pieces exist, a later request does not need a brand new end-to-end script. The skill can plan the new target flow, match each step to existing capabilities, and assemble a new runnable flow from them.

## What This Skill Solves

Normal Playwright recording solves only the first question: "can we record clicks?"

Real UI regression work needs more:

- plan from the business goal before choosing a script
- extract reusable capabilities from a full recording
- reuse the same helper repeatedly for duplicate-validation or batch scenarios
- run regression in a headed browser by default so the operator can see what happened
- backtrack failures by checking the previous capability postcondition before patching the current selector

This skill focuses on that full workflow.

## Core Workflow

The working loop is:

1. record one complete business flow
2. preserve the raw Playwright codegen output
3. clean it into stable specs and shared helpers
4. register operations and capabilities in `flows.json`
5. plan later requests from business steps first
6. match each step to existing capabilities
7. record again only when a capability is truly missing or stale
8. run the regression in a visible browser unless the user explicitly wants CI or headless mode

## How The Skill Works

This skill behaves like a four-stage system.

### 1. Business Decomposition

The skill first converts the user request into ordered business steps.

Example:

```text
Goal: validate duplicate-name rejection on a list page
Steps:
1. open target module
2. open the list page
3. create a record once
4. create the same record again
5. verify duplicate rejection
```

This happens before selecting any script.

### 2. Capability Matching

Each business step is matched against the capability registry in `flows.json`, shared helpers, and known specs.

The skill does not start by picking the most similar full spec. It starts by asking:

- which step already exists as a capability
- which step can be reused with different parameters
- which step is missing and must be recorded

### 3. Script Decomposition and Assembly

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

### 4. Visible Execution and Feedback

After assembly, the skill runs the smallest valid flow in a headed browser by default. If the run fails, it backtracks through previous capability postconditions instead of blindly patching the current selector.

The loop is:

```text
record -> split -> register -> reuse -> assemble -> run -> refine
```

## Why It Is Different

This skill does not treat a recorded spec as the final deliverable.

The final deliverable is a capability map:

- `login`
- `open-module`
- `open-list-page`
- `create-record`
- `edit-record`
- `verify-table-row`

Once these are extracted, later flows become compositions of existing capabilities instead of fresh recordings.

This is why the skill can support "new business from old building blocks":

- old business flow A gives capabilities `a`, `b`, `c`
- old business flow B gives capabilities `c`, `d`, `e`
- new business flow C may be assembled as `a + c + e`

## Safe Example

A real refinement thread behind this skill is Codex session `019e8904-5b39-7120-9aa4-48c3fd312123`.

That session pushed the skill toward four concrete rules:

- flow-first planning before script selection
- repeated-capability reuse for duplicate validation
- headed browser by default for human-visible regression
- failure backtracking through previous postconditions

Generic example:

- first run: record `create-record`
- later run: validate `duplicate-name rejection`

The second run is not a brand new flow. It is:

1. plan the target business flow
2. reuse `open-list-page`
3. call `createNamedRecord(... expected: success)`
4. call `createNamedRecord(... expected: duplicate)`
5. run in a visible browser

## Repository Layout

```text
.
├── README.md
├── README.zh-CN.md
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
  Starter helper library for shared Playwright flows such as overlay cleanup, page checks, generic record creation, and current-page actions.

## Quick Install

### Option A. Install with the built-in skill installer

Recommended when the target agent already has the built-in Codex skill installer:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo xuxh21/ui-regression-recorder-skill \
  --ref v0.1.3 \
  --path . \
  --name ui-regression-recorder
```

This keeps the install pinned to a known release instead of drifting with `main`.

### Option B. Give an agent the GitHub link directly

Example prompt:

```text
Use $skill-installer. Install https://github.com/xuxh21/ui-regression-recorder-skill/tree/v0.1.3 as ui-regression-recorder.
```

### Option B2. Copy-and-send prompt

If you want a ready-to-send message for another agent, copy this:

```text
Use $skill-installer.

Install the skill from:
https://github.com/xuxh21/ui-regression-recorder-skill/tree/v0.1.3

Install name:
ui-regression-recorder

After installation, restart Codex and verify the skill is available in a fresh session.
```

### Option C. Manual install

```bash
git clone --branch v0.1.3 --depth 1 https://github.com/xuxh21/ui-regression-recorder-skill.git
mkdir -p ~/.codex/skills
cp -R ui-regression-recorder-skill ~/.codex/skills/ui-regression-recorder
```

### Verify installation

```bash
ls ~/.codex/skills/ui-regression-recorder
sed -n '1,20p' ~/.codex/skills/ui-regression-recorder/SKILL.md
```

After installation or update, restart Codex so it reloads skill metadata.

## Full Setup

This section is intentionally beginner-friendly. If you want to use the skill with both Playwright recording and current Chrome sessions, follow the full sequence below.

### 1. Install Node.js

Check whether Node.js is already available:

```bash
node -v
npm -v
```

If these commands fail, install Node.js 18+ first.

Examples:

- macOS with Homebrew: `brew install node`
- other platforms: install from [nodejs.org](https://nodejs.org/)

### 2. Install the skill

Install the skill itself before configuring Playwright:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo xuxh21/ui-regression-recorder-skill \
  --ref v0.1.3 \
  --path . \
  --name ui-regression-recorder
```

Verify it exists:

```bash
ls ~/.codex/skills/ui-regression-recorder
```

### 3. Install Playwright packages

Install the packages used by this skill:

```bash
npm install -g playwright @playwright/mcp @playwright/cli@latest
```

Verify each command:

```bash
playwright --version
playwright-cli --help
npx @playwright/mcp@latest --help
```

What each package is for:

- `playwright`: provides `playwright codegen`, `playwright test`, and `playwright install`
- `@playwright/mcp`: lets Codex connect to Playwright or Chrome through MCP
- `@playwright/cli`: the official Playwright CLI toolchain, useful when you also want the standalone `playwright-cli` workflow

Optional extra:

```bash
playwright-cli install --skills
```

### 4. Install Playwright browsers

Install at least one Playwright browser runtime:

```bash
playwright install chromium
```

If you want the broadest local compatibility, you can also run:

```bash
playwright install
```

### 5. Install the Playwright Chrome Extension

If you want the skill to reuse your existing Chrome login state, cookies, and open tabs, install the official Playwright Chrome Extension:

- Chrome Web Store: [Playwright Extension](https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm)

Recommended steps:

1. open the Chrome Web Store link
2. click `Add to Chrome`
3. pin the extension so it is easy to find
4. click the extension icon once after installation
5. if you want automatic connections, copy the `PLAYWRIGHT_MCP_EXTENSION_TOKEN` shown by the extension

If you do not configure the token, the browser may ask you to approve each connection manually.

### 6. Configure Codex MCP

Create or edit `~/.codex/config.toml` and add:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest", "--extension"]
env = { PLAYWRIGHT_MCP_EXTENSION_TOKEN = "paste-your-token-here" }
```

If you prefer manual approval and do not want to use a token yet:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest", "--extension"]
```

### 7. Restart Codex

Restart Codex after:

- installing the skill
- installing the MCP server
- editing `~/.codex/config.toml`

Without a restart, the agent may not load the new skill or MCP configuration.

### 8. Smoke-test everything

Open Chrome and keep any normal web page open.

Then start a fresh Codex session and try these checks:

```text
Use Playwright MCP to inspect the current Chrome tab.
```

```text
Use $ui-regression-recorder. Initialize the current project for UI regression.
```

If everything is configured correctly:

- Codex should be able to connect to Chrome
- you may be asked to approve the connection once
- the agent should be able to inspect the current tab structure
- the installed skill should be available in a fresh session

## First Tutorial

### Tutorial A. First full-flow recording

Use this path when you want your first reusable baseline.

1. install the skill
2. install Playwright packages and browsers
3. initialize the current project:

```text
Use $ui-regression-recorder. Initialize the current project for UI regression.
```

4. open the target site
5. start a full recording from the first stable page of the business flow
6. keep `Record` on and `Pick locator` off during recording
7. stop and save the raw recording
8. ask the skill to clean it, extract helpers, and update `flows.json`

### Tutorial B. Continue from the current page

Use this path when login is fragile or you are already on the target page in Chrome.

1. open Chrome manually
2. log into the target site yourself if needed
3. navigate to the exact page you want to validate
4. ask Codex to continue from the current page:

```text
Use $ui-regression-recorder. I am already on the target page. Continue from the current page and do not log in again.
```

This is often the safest mode for single-session SSO environments.

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

### 3. Reuse the same capability repeatedly

If the task is duplicate validation, batch creation, or repeated submit, prefer calling one existing helper multiple times with different expectations instead of building a brand new flow.

### 4. Headed browser by default

For user-facing regression, the browser should be visible.

Headless is only for CI or when the user explicitly wants unattended execution.

### 5. Preserve raw, clean separately

Raw recordings stay untouched.

Cleaned specs and helpers are the maintainable layer.

### 6. Backtrack failures

If step N fails, first validate whether step N-1 actually completed. The visible failure point is often not the root cause.

## Versioning and Upgrade

### Why the install is pinned

Install from a release tag such as `v0.1.3`, not from `main`.

That gives you:

- reproducible installs
- a clear rollback point
- release notes that match the installed files

### How to upgrade safely

The built-in installer does not overwrite an existing destination directory. For upgrades, replace the old skill directory first, then reinstall the new tag.

Safe upgrade example:

```bash
export UI_REG_SKILL_VERSION=v0.1.3
mv ~/.codex/skills/ui-regression-recorder ~/.codex/skills/ui-regression-recorder.bak.$(date +%Y%m%d%H%M%S)
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo xuxh21/ui-regression-recorder-skill \
  --ref "${UI_REG_SKILL_VERSION}" \
  --path . \
  --name ui-regression-recorder
```

Then:

1. restart Codex
2. open a fresh session
3. verify the skill is available

### Where to check versions

- latest stable release: [v0.1.3](https://github.com/xuxh21/ui-regression-recorder-skill/releases/tag/v0.1.3)
- all releases: [GitHub Releases](https://github.com/xuxh21/ui-regression-recorder-skill/releases)

## Typical Use Cases

- initialize a project for UI regression
- record a named business operation
- convert raw Playwright codegen output into stable regression specs
- extract shared helpers from multiple flows
- execute a known flow with new test data
- start from the current logged-in page instead of replaying login
- update only the changed capability after a page revision

## Example Prompts

```text
Use $ui-regression-recorder. Initialize the current project.
```

```text
Use $ui-regression-recorder. I want to record a "create record" operation from the first stable page.
```

```text
Use $ui-regression-recorder. Validate duplicate-name rejection on the list page.
Requirements:
- plan the flow first
- reuse existing helpers if possible
- use a visible browser by default
```

```text
Use $ui-regression-recorder. I am already on the target page. Continue from the current page and do not log in again.
```

## Privacy Notes

This repository intentionally uses generic examples such as:

- module
- list page
- record
- detail page
- duplicate-name rejection

The documentation and templates avoid business-specific nouns so the public repository can be shared safely.

## Status

This repository publishes the current local version of the skill used in real Codex sessions and refined through actual UI regression work, not just a conceptual template.
