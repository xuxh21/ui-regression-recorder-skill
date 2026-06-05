---
name: ui-regression-recorder
description: Use when the user says to initialize the current project for UI regression, record an operation, convert Playwright codegen recordings into stable tests, extract shared helpers, compose a new flow from existing capabilities, run a named UI operation, or execute UI regression from the current Chrome or Playwright MCP page.
---

# UI Regression Recorder

Use this skill to turn a human UI flow into a reusable regression system. Prefer Chinese responses unless the repository uses English-only docs.

## Skill Model

This skill is not a recorder-only workflow. It is a planner plus capability registry plus script assembler.

Use this mental model:

1. The user gives a business goal.
2. The skill decomposes that goal into ordered business steps.
3. The skill matches each step against existing capabilities, helpers, specs, and raw recordings.
4. The skill assembles the shortest runnable flow from reusable pieces.
5. The skill records only the missing or stale capability when reuse is insufficient.

Think in three layers:

- **Business layer**: what the user wants to validate
- **Capability layer**: reusable actions such as open page, create record, edit record, verify row
- **Script layer**: raw specs, cleaned specs, helpers, and run commands

One complete recording should usually produce both:

- one full operation
- several reusable capabilities

Later, new business flows should be composed from existing capabilities whenever possible instead of copied from one large historical script.

## Environment Baseline

Assume this working baseline unless the user says otherwise:

- Node.js 18+ is available
- `playwright` is available for `codegen`, `test`, and `install`
- `@playwright/mcp` is available when the task needs the current Chrome or MCP page
- `@playwright/cli` may be available but is optional
- if Chrome state reuse is required, prefer the Playwright Chrome Extension with MCP `--extension`

If any of these are missing, repair the environment first or tell the user exactly which dependency is blocking the run.

## Assembly Principle

The core method is:

1. decompose one complete business flow into ordered capabilities
2. decompose the script into raw recording, cleaned spec, and shared helpers
3. register the capability map in `flows.json`
4. assemble future business flows from existing capabilities whenever possible
5. record only the missing or stale capability when reuse is insufficient

Always think in this order:

- business goal
- capability coverage
- shortest safe composition
- minimal new recording

## Speed Policy

Speed matters. If the automated path is slower than a human, it is not useful. Default to fast execution after a flow is known.

- For known operations, read `flows.json` and call existing helpers directly. Do not re-analyze the whole page or re-record.
- If a known operation already has a `spec` or `runCommand`, prefer parameterized replay through the script. Change data by env vars or fixtures; do not use MCP to click the same recorded flow step by step.
- Avoid full `browser_snapshot` at every step. Snapshot once at the start for current-page mode, then only on failure or ambiguity.
- Avoid long sleeps. Default waits should be event- or control-based; if a fixed wait is unavoidable, keep it under 1 second unless the app truly needs more.
- Prefer batched Playwright code or specs over many individual click tools when executing a known sequence.
- Default UI regression runs are headed so the user can watch the browser. Use headless only when the user explicitly asks for CI, batch, fastest unattended verification, or no visible browser.
- Use `--list` for quick validation, then run the smallest relevant spec or current-page helper.
- In current-page mode, never navigate back to login or home just to satisfy a full E2E script. Start from where the user already is.
- After login, check for blocking overlays before clicking the first business entry. If none exist, continue immediately; if they exist, close them through a reusable overlay helper.
- On failure, switch to backtracking diagnosis mode. Validate the previous capability postcondition before changing the current failing selector.

## Operating Modes

Choose the mode from the user's wording:

- **Initialize project**: triggered by "初始化当前工程", "初始化 UI 回归", or "建立回归测试目录".
- **Record operation**: triggered by "录制某某操作", "我要录制", or "从登录开始录制".
- **Clean recording**: triggered by "整理录制脚本", "转成回归测试", or when a raw spec path is provided.
- **Run operation**: triggered by "执行某某操作", "跑某某回归", or "验证某某操作".
- **Current-page action**: triggered by "我已经在这个页面", "从当前页面开始", or "不要重新登录".
- **Compose from existing flows**: triggered when the user asks for a new operation that may be made of previously extracted capabilities.
- **Rerecord or update flow**: triggered by "需求变了", "重新录制", "更新某某操作", "页面改版了", or "用新录制更新历史流程".

## Flow-First Planning

Always plan from the user's business goal before selecting code. Existing scripts are implementation candidates, not the source of truth.

Use this planning shape internally and summarize it briefly to the user for non-trivial tasks:

```text
Goal: validate duplicate-name rejection on a list page
Start mode: full E2E or current page
Data: recordName, pageName, moduleName
Planned steps:
1. ensure logged in if needed
2. open target module
3. open the list page
4. create record with name X, expect success
5. create record with name X again, expect duplicate rejection
Capability coverage:
1. login-if-needed -> existing
2. open-module -> existing
3. open-list-page -> existing
4. create-record -> existing, repeat twice with different expected outcome
Missing: none
Execution choice: compose and reuse existing helpers
```

Rules:

- Do not start by picking the most similar full spec. First define what must happen.
- If a full spec contains the needed capability but the exact operation is different, reuse the capability, not the whole spec.
- If one planned step appears twice, prefer a loop or repeated helper call.
- If an existing helper needs only a new expected outcome, patch that helper instead of creating a duplicate helper.
- Only record after planning proves a capability is missing or stale.
- Keep the final composed script aligned with the planned steps so future failures can backtrack cleanly.

## Initialize Project

When the user says "初始化当前工程":

1. Scan the current project for existing Playwright or E2E structure:
   - `playwright.config.*`
   - `tests/e2e`, `e2e`, `tests/playwright`, `specs`
   - existing `helpers`, `fixtures`, `storageState`, or `auth` files
2. If no suitable structure exists, create this project-local layout:

```text
tests/e2e/
  raw/
  specs/
  helpers/
  fixtures/
  .generated/
  flows.json
```

3. Copy `assets/playwright-common-flows.template.ts` into `tests/e2e/helpers/common-flows.ts` if a similar helper does not exist.
4. Create `tests/e2e/flows.json` if missing by copying `assets/flows.template.json`.
5. If `flows.json` already exists, never wipe it. Merge missing top-level keys and preserve operation and capability history.
6. If there is no Playwright config, do not over-engineer. Add a minimal config only if the user wants runnable project tests; otherwise keep artifacts under `tests/e2e`.
7. After initialization, recommend starting the first recording from the first stable page of a complete business flow.

## Record Operation

When the user says "录制某某操作":

1. Ask for or infer an operation slug, such as `create-record`, `search-order`, or `edit-profile`.
2. Save raw recording to `tests/e2e/raw/<slug>.raw.spec.ts`.
3. Use direct codegen when the user wants true recording:

```bash
playwright codegen --channel=chrome --target=playwright-test -o tests/e2e/raw/<slug>.raw.spec.ts <url>
```

4. Tell the user: keep `Record` on and turn `Pick locator` off.
5. After recording ends, create or update:
   - `tests/e2e/specs/<slug>.spec.ts`
   - `tests/e2e/helpers/<module>.ts` when shared flows are found
   - `tests/e2e/flows.json` with operation name, files, start mode, reusable capabilities, and run command
6. Extract capabilities even if the user named only the full operation. Common capability examples:
   - `login-if-needed`
   - `open-module`
   - `open-list-page`
   - `create-record`
   - `edit-record`
   - `delete-record`
   - `verify-row`

## Clean Recording

When the user asks to clean a recording:

1. Preserve the raw file first. Never overwrite a non-empty raw recording without a backup.
2. Split the raw recording into business steps and remove trial actions:
   - duplicate navigation
   - wrong fills
   - repeated Enter presses
   - repeated clicks
   - cleanup-only navigation
3. Keep the raw file untouched and create a cleaned spec.
4. Extract both:
   - a full operation
   - reusable sub-capabilities
5. Stabilize selectors with:
   - `getByRole`
   - `getByLabel`
   - `getByPlaceholder`
   - exact visible text
   - stable URL assertions
6. Add assertions after major transitions.
7. Extract shared helpers before producing multiple cleaned tests.

## Compose From Existing Capabilities

When the user asks for a new operation that may be made of existing pieces:

1. Parse the request into intent tokens: module or page, action, target data, and start mode.
2. Read `tests/e2e/flows.json`.
3. Search helpers and specs if the registry is incomplete:

```bash
rg -n "创建|编辑|删除|列表|详情|保存|提交|查询" tests/e2e
```

4. Build a capability coverage table:
   - available and reusable
   - available but needs parameter changes
   - missing and needs recording
5. Compose the shortest safe plan. Do not duplicate helper code already present.
6. If one part is missing, record only that missing part, not the whole flow.

## Run Operation

When the user says "执行某某操作":

1. Plan the target business flow before choosing scripts.
2. Read `tests/e2e/flows.json`.
3. Match each planned step to existing operations, capabilities, helper exports, cleaned specs, or raw specs.
4. Prefer the shortest reusable composition:
   - exact registered operation with only data changes
   - repeated use of an existing capability
   - composed spec from multiple capabilities
   - one missing capability recording
5. If the plan maps to an exact operation with `spec` or `runCommand`, treat it as executable.
6. If the plan maps to repeated actions, call the same helper multiple times with different data or expected outcomes instead of creating unrelated flows.
7. Do not use MCP step-by-step execution for a planned and registered flow unless the user requested current-page mode or the script failed.
8. If a planned step has no matching capability, say exactly which capability is missing and offer to record only that part.

Choose visibility before running:

- For normal user-facing regression, use headed mode by default.
- If the user explicitly asks for CI, batch regression, fastest unattended verification, headless, or no visible browser, use a headless path.
- If the user wants step-by-step debugging, use `PWDEBUG=1`.

## Repeated Capability Operations

When the user's request is duplicate validation, repeated submit, batch create, or "do the same action twice", prefer repeating an existing capability with different expected outcomes instead of inventing a complex new flow.

Use this pattern:

1. Find the existing capability in `flows.json`, for example `create-record`.
2. Keep navigation or setup once.
3. Call the same helper repeatedly:
   - first call: expect success
   - second call: expect duplicate or rejected
4. If the helper only supports success, extend it with an `expected` option.
5. Register the new operation as a composition or repetition of the same capability.
6. Keep the report simple: reused the same helper twice, changed only expected outcome.

Example:

```ts
await openListPage(page, 'Example List');
await createNamedRecord(page, { name: recordName }, { expected: 'success' });
await createNamedRecord(page, { name: recordName }, { expected: 'duplicate', duplicateMessage: /already exists|duplicate/i });
```

## Failure Backtracking

When a run gets stuck at step N, do not assume step N's selector is wrong. First verify whether step N-1 actually completed.

Use this order:

1. Identify the failed capability from the test step, stack trace, locator, or `flows.json` order.
2. Locate the previous capability in `dependsOn` or `capabilities`.
3. Validate the previous capability postconditions:
   - URL or title matches expected page
   - expected visible text or row exists
   - popup or new tab was captured correctly
   - blocking overlay is not covering the next click
   - async navigation or list refresh has actually finished
4. If the previous postcondition failed, fix the previous helper or add a missing assertion there. Do not patch the current selector yet.
5. If the previous postcondition passed, then diagnose the current step selector, data, permissions, network, or changed UI.

## Current-Page Mode

Use this mode when the user wants to begin from an already-open page:

1. Inspect current tab URL, title, and visible controls with MCP snapshot or browser state.
2. Confirm the starting page matches the requested flow.
3. Run only the local action from the current page.
4. Turn that action into a helper that receives `page` and test data.
5. Keep current-page actions separate from full-login tests so fragile login sessions are not invalidated.

## Rerecord or Update Flow

When the page changed or the user wants to rerecord:

1. Identify the update scope:
   - one capability
   - one operation
   - one broad recording that contains several capabilities
2. Create a new raw version instead of overwriting:

```text
tests/e2e/raw/<slug>.v<next>.raw.spec.ts
```

3. Preserve previous cleaned specs and helpers until the new version is validated.
4. Compare the new raw or cleaned output against the previous helper or spec:
   - changed selectors
   - changed navigation
   - new required fields
   - removed fields
   - changed assertions
5. Update the smallest reusable helper possible.
6. Traverse `flows.json` dependencies and mark impacted operations.
7. Run `--list` for impacted specs, then run the smallest representative real flow.
8. Update `flows.json` version and history metadata.

## Flow Registry

Maintain `tests/e2e/flows.json` so the user can later say "执行某某操作". Keep it small and machine-readable.

Recommended operation fields:

- `slug`
- `name`
- `aliases`
- `mode`
- `rawSpec`
- `spec`
- `helpers`
- `capabilities`
- `dependsOn`
- `version`
- `startPage`
- `preconditions`
- `postconditions`
- `runCommand`
- `history`

Recommended capability fields:

- `slug`
- `name`
- `aliases`
- `helper`
- `export`
- `sourceOperations`
- `parameters`
- `version`
- `startPage`
- `endPage`
- `preconditions`
- `postconditions`

## Recommended Commands

Direct recording:

```bash
playwright codegen --channel=chrome --target=playwright-test -o outputs/recorded-direct.spec.ts <url>
```

Project recording:

```bash
playwright codegen --channel=chrome --target=playwright-test -o tests/e2e/raw/<slug>.raw.spec.ts <url>
```

List tests without executing:

```bash
NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/<slug>.spec.ts --list
```

Run a cleaned test in a visible browser:

```bash
NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/<slug>.spec.ts --headed --reporter=line
```

Headless CI run:

```bash
NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/<slug>.spec.ts --reporter=line
```

Debug run:

```bash
PWDEBUG=1 NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/<slug>.spec.ts --debug --reporter=line
```

Initialize current project:

```text
使用 $ui-regression-recorder。初始化当前工程。
```

Record a named operation:

```text
使用 $ui-regression-recorder。我要录制一个“创建记录”操作，从第一个稳定页面开始录。
```

Run a named operation:

```text
使用 $ui-regression-recorder。验证列表页上的重名拒绝。先规划流程，再复用已有 helper，默认打开可见浏览器。
```

Run from current page:

```text
使用 $ui-regression-recorder。我已经在目标页面上了，从当前页面继续，不要重新登录。
```

## New Session Prompt Template

Use this prompt when starting a fresh Codex session:

```text
使用 $ui-regression-recorder。

目标：把我刚录制的 Playwright codegen 脚本整理成可复用回归测试，并在必要时用 Playwright MCP 或 Chrome 当前登录态执行验证。

输入：
- 原始录制文件：<填 raw spec 路径>
- 目标业务流程：<例如 登录 -> 打开模块 -> 打开列表页 -> 创建记录>
- 期望结果：<例如 列表里出现新记录，或重复名称被拒绝>
- 是否允许自动登录：<允许/不允许；单会话 SSO 默认不允许>
- 测试数据策略：<固定名称/时间戳唯一名称/从环境变量读取>
- 是否从当前页面开始：<是/否；如果是，不要生成登录和前置导航>

要求：
1. 不要覆盖原始录制文件，先备份。
2. 产出 cleaned spec。
3. 清理试错步骤、重复点击、错误填值和无意义导航。
4. 抽取公共流程 helper，避免每个脚本重复登录、重复导航、重复关弹窗。
5. selector 优先用 role、label、placeholder 和精确文本。
6. 用 `test.step` 分业务步骤，并在关键跳转后加断言。
7. 先执行 `--list` 验证脚本能被识别。
8. 如果需要跑真实创建动作，先确认是否会重复登录踢掉会话；能用 Chrome 当前登录态就不要自动登录。
9. 如果我说从当前页面开始，只写或只跑后半段动作，并把它沉淀成可复用 helper。
10. 最后告诉我：原始脚本路径、清理后脚本路径、公共 helper 路径、验证结果、以及后续回归执行命令。
```

## Practical Advice

- For single-session SSO systems, separate script cleanup mode and live action mode.
- Do not mix direct recording and MCP observation in the same artifact. Treat codegen output as source material and MCP observations as verification evidence.
- If a button does not respond during recording, check whether `Pick locator` is enabled before changing the script.
- If a second recording repeats a known setup path, refactor the first cleaned script before adding the second one.
- If the current page already satisfies preconditions, do not navigate away just to make the script look like full E2E.
- Keep generated examples and helper names generic when documentation or public templates are involved. Prefer names such as `open-list-page`, `create-record`, and `verify-row`.

## Resources

- `assets/playwright-common-flows.template.ts`: starter helper library for shared Playwright flows
- `assets/flows.template.json`: starter registry for operations and capabilities
