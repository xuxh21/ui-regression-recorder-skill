---
name: ui-regression-recorder
description: Use when the user says to initialize the current project for UI regression, record an operation, convert Playwright codegen recordings into stable tests, extract shared helpers, run a named UI operation, or execute UI regression tests from the current Chrome/Playwright MCP page.
---

# UI Regression Recorder

Use this skill to turn a human UI flow into a reusable regression test. Prefer Chinese responses unless the repository uses English-only docs.

## Speed Policy

Speed matters. If the automated flow is slower than a human, it is not useful. Default to fast execution after a flow is known.

- For known operations, read `flows.json` and call existing helpers directly. Do not re-analyze the whole page or re-record.
- If a known operation already has a `spec` or `runCommand`, prefer parameterized replay through the script. Change data by env vars or fixtures; do not use MCP to click the same recorded flow step by step.
- Avoid full `browser_snapshot` at every step. Snapshot once at the start for current-page mode, then only on failure or ambiguity.
- Avoid long sleeps. Default waits should be event/control based; if a fixed wait is unavoidable, keep it under 1 second unless the app is known to need more.
- Prefer batched Playwright code (`browser_run_code_unsafe` or a spec/helper) over many individual click tools when executing a known sequence.
- Default UI regression runs are headed so the user can watch the browser. Use headless only when the user explicitly asks for CI, batch, fastest unattended verification, or no visible browser.
- Use `--list` for quick validation, then run the smallest relevant spec or current-page helper.
- In current-page mode, never navigate back to login/home just to satisfy a full E2E script. Start from where the user is.
- After login, check for blocking overlays before clicking the first business entry. If none exist, continue immediately; if they exist, close them through a reusable overlay helper.
- On failure, switch to backtracking diagnosis mode. Validate the previous capability's postcondition before changing the current failing selector.

## Fast Parameterized Replay

This is the default path after a flow has been recorded and cleaned.

When the user asks to repeat a known operation with different data, for example "创建一个资产名为 X" or "再创建一个工作区 Y":

1. Read `tests/e2e/flows.json`.
2. Match the operation/capability.
3. Inspect the registered `spec`, `helpers`, and parameter/env mapping.
4. If the requested change is only test data, do not rewrite the script and do not use MCP clicks. Run the registered command with env vars.
5. If the script is missing a required data parameter, patch the helper/spec to accept that parameter, then run it.
6. If the raw recording is incomplete, do not slowly rediscover the whole page. Identify only the missing capability and either patch it from existing helpers or ask the user to record that missing part.

Example fast replay command:

```bash
UI_REG_WORKSPACE_NAME="工作区A" UI_REG_PROTOTYPE_NAME="原型A" NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/create-prototype-asset.spec.ts --headed --reporter=line
```

Example headless CI replay command:

```bash
UI_REG_WORKSPACE_NAME="工作区A" UI_REG_PROTOTYPE_NAME="原型A" NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/create-prototype-asset.spec.ts --reporter=line
```

Only use Playwright MCP for a known operation when:

- the user explicitly says "从当前页面开始";
- the registered spec/helper failed and needs diagnosis;
- the operation is not yet registered and must be discovered;
- the flow depends on an already-open authenticated tab that a normal Playwright test cannot reuse.

## Operating Modes

Choose the mode from the user's wording:

- **Initialize project**: triggered by "初始化当前工程", "初始化 UI 回归", or "建立回归测试目录".
- **Record operation**: triggered by "录制某某操作", "我要录制", or "从登录开始录制".
- **Clean recording**: triggered by "整理录制脚本", "转成回归测试", or when a raw spec path is provided.
- **Run operation**: triggered by "执行某某操作", "跑某某回归", "验证某某操作".
- **Current-page action**: triggered by "我已经在这个页面", "从当前页面开始", or "不要重新登录".
- **Compose from existing flows**: triggered when the user asks for an operation that was not recorded as a standalone flow but may be contained in previous recordings, for example "去 UI 设计创建工作区并创建原型".
- **Rerecord/update flow**: triggered by "需求变了", "重新录制", "更新某某操作", "页面改版了", or "用新录制更新历史流程".

### Initialize project

When the user says "初始化当前工程":

1. Scan the current project for existing Playwright or E2E structure:
   - `playwright.config.*`
   - `tests/e2e`, `e2e`, `tests/playwright`, `specs`
   - existing `helpers`, `fixtures`, `storageState`, or `auth` files
2. If no suitable structure exists, create this project-local structure:

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
4. Create `tests/e2e/flows.json` if missing by copying `assets/flows.template.json`. Keep it as the operation registry, capability registry, and rerecord history index:

```json
{
  "version": 1,
  "operations": [],
  "capabilities": [],
  "history": []
}
```

5. If `flows.json` already exists, never wipe it. Merge missing top-level keys and preserve all operation/capability history.
6. If there is no Playwright config, do not over-engineer. Add a minimal `playwright.config.ts` only if the user wants runnable project tests; otherwise keep artifacts under `tests/e2e`.
7. After initialization, tell the user to start the first recording from login if they want a full E2E baseline, or from the current page if login is fragile.

### Record operation

When the user says "录制某某操作":

1. Ask for or infer an operation slug, for example `create-prototype`, `search-order`, `edit-profile`.
2. Save raw recording to `tests/e2e/raw/<slug>.raw.spec.ts`.
3. Use direct codegen when the user wants true recording:

```bash
playwright codegen --channel=chrome --target=playwright-test -o tests/e2e/raw/<slug>.raw.spec.ts <url>
```

4. Tell the user: keep `Record` on and turn `Pick locator` off.
5. After recording ends, create or update:
   - `tests/e2e/specs/<slug>.spec.ts`
   - `tests/e2e/helpers/<domain-or-module>.ts` when shared flows are found
   - `tests/e2e/flows.json` with the operation name, files, start mode, reusable capabilities, and run command
6. Extract capabilities from the recording even if the user only named the full operation. Example capabilities:
   - `login`
   - `open-dev-domain`
   - `select-research-space`
   - `open-asset-type-prototype`
   - `open-asset-type-ui-design`
   - `create-workspace`
   - `create-prototype`
   - `verify-created-row`

### Rerecord or update flow

When the user says the page changed or wants to rerecord:

1. Identify the update scope:
   - one capability, for example `create-workspace`
   - one operation, for example `create-prototype`
   - one broad new recording that contains several capabilities
2. Create a new raw version instead of overwriting:

```text
tests/e2e/raw/<slug>.v<next>.raw.spec.ts
```

3. Preserve previous cleaned specs and helpers until the new version is validated.
4. Clean the new raw recording and compare it against the old operation/capabilities:
   - changed selectors
   - changed navigation
   - new required fields
   - removed fields
   - changed assertions
5. Update the smallest reusable helper possible. Do not rewrite unrelated helpers.
6. Traverse `flows.json` dependencies:
   - find operations whose `capabilities` or `dependsOn` include the updated capability
   - mark impacted operations
   - update composed specs if they import the changed helper
7. Run `--list` for impacted specs. Run real execution only for the smallest representative set unless the user asks for all.
8. Update `flows.json` with version and history metadata.
9. Report: what changed, what was updated, what operations are impacted, and which tests were validated.

If the user records one full updated flow, still extract and update each capability inside it. This is often faster than forcing the user to record each small action separately.

### Recommended recording granularity

Prefer capability-first reuse, but do not make the user record every tiny action separately.

Use this strategy:

1. For the first baseline, let the user record a complete business flow, for example "select research space -> choose asset type -> create workspace -> create prototype".
2. Split that full flow into reusable capabilities and register both the full operation and the sub-capabilities in `flows.json`.
3. For small page changes, rerecord only the changed capability when the user can reach that page quickly.
4. For broad or unclear page changes, let the user rerecord one complete flow. Then diff the new full flow against old helpers/specs, update only the changed capabilities, and traverse dependents.
5. Never ask the user to rerecord every operation when one full recording contains the changed evidence.
6. Prefer updating helpers over duplicating new scripts. Specs should usually keep the same business composition and import the patched helper.

### Run operation

When the user says "执行某某操作":

1. Plan the target business flow before choosing scripts. Convert the user's request into ordered business steps, expected outcomes, data inputs, and start mode.
2. Read `tests/e2e/flows.json`.
3. Build a capability coverage table by matching each planned step to existing operations, capabilities, helper exports, cleaned specs, and raw specs.
4. Prefer the shortest reusable composition:
   - exact registered operation with only data changes
   - repeated use of an existing capability
   - composed spec from multiple capabilities
   - one missing capability recording
5. If the plan maps to an exact operation with `spec`/`runCommand`, treat it as executable. Map user-provided data to env vars or fixture fields and run the command directly.
6. If the plan maps to repeated actions, call the same helper multiple times with different data or expected outcomes instead of creating unrelated flows.
7. Do not use `browser_snapshot`, `browser_click`, or MCP step-by-step execution for a planned and registered flow unless the user requested current-page mode or the script failed.
8. If the operation requires current-page mode, inspect the MCP/Chrome page and execute the associated helper from the current page. Do not auto-login.
9. If a planned step has no matching operation or capability, say exactly which capability is missing and offer to record only that missing part.
10. Execute fast: batch the operation through a helper/spec; do not manually click step-by-step unless debugging.

Choose visibility before running:

- For normal user-facing UI regression, use headed mode by default. The user must be able to see the browser.
- If the operation has `headedRunTemplate`, use it. If not, add `--headed` to the command.
- If the user explicitly asks for CI, batch regression, fastest unattended verification, headless, or no visible browser, use `ciRunTemplate`/`headlessRunTemplate` or remove `--headed`.
- If the user wants step-by-step debugging, use `PWDEBUG=1 playwright test ... --debug` instead of silent headless execution.
- When reporting a run, say whether it was headed or headless.

### Repeated capability operations

When the user's request is a duplicate validation, repeated submit, batch create, or "do the same action twice", prefer repeating an existing capability with different expected outcomes instead of inventing a complex new flow.

Use this pattern:

1. Find the existing capability in `flows.json`, for example `create-workspace`.
2. Keep the navigation/setup once, for example login -> open module -> open UI design page.
3. Call the same helper repeatedly with data and expected outcome:
   - first call: create workspace with `expect: success`
   - second call: create the same workspace with `expect: duplicate/rejected`
4. If the existing helper only supports success, extend that helper with an `expected` option. Do not create a second unrelated helper unless the UI action is genuinely different.
5. Register the new operation as a composition/repetition of the same capability, for example `capabilities: ["open-ui-design-for-space", "create-workspace", "create-workspace"]`.
6. Keep the report simple: "used existing create-workspace twice; second call asserted duplicate rejection".

Example:

```ts
await openUiDesignForSpace(page, spaceData);
await createWorkspace(page, workspaceData, { expected: 'success' });
await createWorkspace(page, workspaceData, { expected: 'duplicate', message: /已存在|重复|重名/ });
```

### Failure backtracking

When a run gets stuck at step N, do not assume step N's selector is wrong. First verify whether step N-1 actually completed.

Use this diagnosis order:

1. Identify the failed capability from the test step, stack trace, locator, or `flows.json` capability order.
2. Read `flows.json` and locate the previous capability in `dependsOn`/`capabilities`.
3. Validate the previous capability's `postconditions`:
   - current URL/page title matches expected page
   - expected visible text or row exists
   - popup/new tab was captured and subsequent actions are using the right `Page`
   - blocking overlay/modal/toast is not covering the next click
   - async navigation or list refresh has actually finished
4. If the previous postcondition failed, fix the previous helper or add a missing assertion/wait there. Do not patch the current selector yet.
5. If the previous postcondition passed, then diagnose the current step selector, data, permissions, network, or changed UI.
6. Record the finding in the report as "root cause step" and "failed visible step" when they differ.

Example: if clicking "科研平台开发域" fails after login, first check whether login's postcondition is truly "portal home ready and overlays closed". If the login success modal is still present, the root cause is the login/overlay capability, not the app entry selector.

### Compose from existing flows

When the user asks for a new operation that may be made of existing pieces:

1. Parse the request into intent tokens: module/page, asset type, action, target data, and start mode.
   - Example: "去 UI 设计 创建个工作区，并创建原型" -> `open-asset-type-ui-design`, `create-workspace`, `open-asset-type-prototype` or `create-prototype`.
2. Read `tests/e2e/flows.json`.
3. Search existing helpers and specs if the registry is incomplete:
   - `rg -n "UI设计|原型设计|创建工作区|创建原型|研发空间|工作区|资产" tests/e2e`
4. Build a capability coverage table:
   - available and reusable
   - available but needs parameter changes
   - missing and needs recording
5. Compose the shortest safe plan. Do not duplicate helper code already present.
6. If one part is missing, ask the user to record only that missing part, not the whole flow.

### Flow-first planning

Always plan from the user's business goal before selecting code. Existing scripts are implementation candidates, not the source of truth.

Use this flow planning format internally and, for non-trivial tasks, summarize it briefly to the user:

```text
Goal: validate same-space UI design workspace duplicate rejection
Start mode: full E2E or current page
Data: workspaceName, spaceName, assetType
Planned steps:
1. ensure logged in
2. open target research space
3. open UI design page
4. create workspace with name X, expect success
5. create workspace with name X again, expect duplicate rejection
Capability coverage:
1. login-sms-dynamic-password -> existing
2. open-ui-design-for-space -> existing
3. create-workspace -> existing, repeat twice with different expected outcome
Missing: none
Execution choice: compose/reuse existing helpers, no new recording
```

Rules:

- Do not start by picking the most similar full spec. First define what must happen.
- If a full spec contains the needed capability but the exact operation is different, reuse the capability, not the whole spec.
- If one planned step appears twice, prefer a loop or repeated helper call.
- If an existing helper needs only a new expected outcome, patch that helper instead of creating a duplicate helper.
- Only record after planning proves a capability is missing or stale.
- Keep the final composed script aligned with the planned steps so future failures can backtrack cleanly.

## Workflow

1. Preserve the raw recording first.
   - If the user asks for direct recording, run `playwright codegen --channel=chrome --target=playwright-test -o <raw.spec.ts> <url>`.
   - Tell the user: keep `Record` on and turn `Pick locator` off. Pick locator selects elements but may block real clicks.
   - Never overwrite a non-empty raw recording without creating a timestamped backup.

2. Identify the intent of the flow.
   - Split the raw recording into business steps, for example login, enter module, search record, create asset, verify result.
   - Remove trial actions: duplicate navigation, wrong fills, copy/paste attempts, repeated Enter, repeated clicks, and cleanup-only navigation.
   - Keep the raw file unchanged; create a cleaned file such as `<name>.cleaned.spec.ts`.
   - Extract both the full operation and reusable sub-capabilities. A long flow should produce multiple helper functions, not just one large test.
   - For rerecording, compare new raw/cleaned output with the previous helper/spec before editing. Update the smallest stable unit.

3. Stabilize selectors.
   - Prefer `getByRole`, `getByPlaceholder`, `getByLabel`, exact visible text, and stable URL assertions.
   - Avoid brittle selectors like `locator('div').nth(...)` unless no better locator exists.
   - For repeated visible text, scope with a region or use exact text. If still ambiguous, inspect the current DOM/snapshot before choosing.
   - For internal apps with Chinese labels, preserve the visible Chinese text in selectors.

4. Make the test reusable.
   - Put test data near the top as constants, or use env vars for real secrets.
   - Keep test steps with `test.step(...)`.
   - Add assertions after major transitions: URL changed, title exists, success toast appears, table row appears, or popup URL opens.
   - If the operation creates data, prefer unique names with timestamps unless the user asks for a fixed name.
   - Extract shared flows before producing multiple cleaned tests. Common candidates: login, close safety dialogs, enter a product/module, select workspace, open a menu page, fill common create dialogs, and verify table rows.
   - Prefer `tests/helpers/*.ts` or `outputs/helpers/*.ts` helpers when the workspace has no test structure yet. Use `assets/playwright-common-flows.template.ts` as a starter template.
   - Each capability helper should have a clear postcondition assertion. This makes failures debuggable by backtracking to the previous capability.
   - For login success, onboarding, cookie, tour, or security notice dialogs, create/use a shared overlay helper and call it after login and before the first app/module click.
   - Keep this helper platform-neutral: use configurable close texts/patterns, role-based buttons, and short retries. Do not hard-code one platform's modal as a mandatory step.
   - If the raw recording contains close actions such as `OK`, `Got it`, `我知道了`, `跳过`, `Close`, `关闭`, or modal text that blocks the page, register it as an optional blocking overlay capability.
   - The overlay helper should exit quickly when no overlay exists. A single `clickIfVisible(..., 2000)` is too fragile, but a long mandatory wait is also wrong for platforms without login popups.

5. Support current-page mode.
   - If the user says "从当前页面开始", "我已经登录好了", or "在这个页面跑回归", do not generate a login step.
   - Start from the current MCP/Chrome page, identify the page by URL/title/key visible controls, then run only the remaining business steps.
   - For a reusable script, model this as a focused test or helper such as `createPrototypeFromCurrentPage(page, data)`.
   - For a full end-to-end regression, compose helpers: `loginIfNeeded`, `openModule`, `selectWorkspace`, `createAsset`.
   - Keep current-page actions separate from full-login tests so single-session SSO does not get invalidated.

6. Run safely.
   - First run `playwright test <spec> --list`.
   - Do not repeatedly run login automation against single-session SSO accounts. It may invalidate the user's active session.
   - If login/session is fragile, ask the user to login manually in Chrome, then use Playwright MCP or Chrome extension to continue from the current page.
   - When using MCP with an existing login, do not auto-login unless the user explicitly asks.
   - After a successful login, make one fast optional overlay cleanup pass before entering the business module. If the first business click fails, inspect for overlays before changing selectors.
   - On any failure, inspect the previous capability's postcondition before editing the current failed step. A visible failure at step N is often caused by an incomplete step N-1.
   - Use short waits only around known async transitions. Prefer waiting for visible controls or URL changes over long sleeps.
   - For known flows, prefer fast helper/spec execution over interactive tool-by-tool execution.

7. Report clearly.
   - State whether the raw recording, cleaned test, and actual run succeeded.
   - If run failed, include the exact step and next fix. Do not claim creation succeeded unless the page shows the created row, success toast, or target URL.

## Public Flow Reuse

When two or more recordings share setup or navigation, create or update a helper file instead of duplicating those lines. A good cleaned test should read like business intent:

```ts
await loginIfNeeded(page);
await openDevDomainFromPortal(page);
await openSpace(page, '设计管理0330版本测试1');
await openPrototypeDesign(page);
await createPrototype(page, { name: prototypeName, product: '城市大数据中心', system: 'BBSSSBB', project: '测试2401' });
await expectPrototypeVisible(page, prototypeName);
```

Use this split:

- `*.raw.spec.ts`: untouched Playwright codegen recording.
- `*.cleaned.spec.ts`: readable regression using helpers.
- `helpers/*.ts`: shared UI operations and assertions.
- `fixtures/*.ts`: login/session, storage state, test data, browser context.
- `flows.json`: registry that maps human operation names to specs/helpers.
- `capabilities` in `flows.json`: reusable subflows that can be composed into new operations.
- `dependsOn` in `flows.json`: dependency links so updates can find impacted operations.
- `preconditions`/`postconditions` in `flows.json`: checkpoints used to backtrack failures.
- `history` in `flows.json`: version notes for rerecords and page changes.

Only keep login inside a helper when the app supports repeated automated login. For single-session SSO, use a helper that checks login state and otherwise instructs manual login.

For a long recording such as "select research space -> choose asset type -> create workspace -> create asset", extract at least these capability-level helpers when possible:

```ts
await openResearchSpace(page, spaceName);
await openDesignAssetType(page, '原型设计');
await openDesignAssetType(page, 'UI设计');
await createWorkspace(page, { name, description });
await createPrototype(page, prototypeData);
```

Then future prompts can compose them:

```ts
await openResearchSpace(page, '设计管理0330版本测试1');
await openDesignAssetType(page, 'UI设计');
await createWorkspace(page, { name: workspaceName });
await openDesignAssetType(page, '原型设计');
await createPrototype(page, prototypeData);
```

## Flow Registry

Maintain `tests/e2e/flows.json` so the user can later say "执行某某操作". Keep it small and machine-readable:

```json
{
  "version": 1,
  "operations": [
    {
      "slug": "create-prototype",
      "name": "创建原型",
      "aliases": ["创建资产", "创建原型资产"],
      "mode": "current-page-or-e2e",
      "rawSpec": "tests/e2e/raw/create-prototype.raw.spec.ts",
      "spec": "tests/e2e/specs/create-prototype.spec.ts",
      "helpers": ["tests/e2e/helpers/prototype.ts", "tests/e2e/helpers/common-flows.ts"],
      "capabilities": ["open-research-space", "open-asset-type-prototype", "create-workspace", "create-prototype"],
      "dependsOn": ["open-research-space", "create-workspace", "create-prototype"],
      "version": 2,
      "startPage": "原型设计页",
      "preconditions": ["用户已登录或允许自动登录"],
      "postconditions": ["原型列表出现新资产或打开设计页 URL"],
      "runCommand": "NODE_PATH=$(npm root -g) playwright test tests/e2e/specs/create-prototype.spec.ts --headed --reporter=line",
      "notes": "SSO 单会话时优先从当前页面执行，不要重复自动登录。",
      "history": [
        {
          "version": 1,
          "rawSpec": "tests/e2e/raw/create-prototype.v1.raw.spec.ts",
          "createdAt": "2026-06-03",
          "note": "initial recording"
        },
        {
          "version": 2,
          "rawSpec": "tests/e2e/raw/create-prototype.v2.raw.spec.ts",
          "createdAt": "2026-06-10",
          "note": "rerecorded after page change"
        }
      ]
    }
  ],
  "capabilities": [
    {
      "slug": "open-research-space",
      "name": "选择研发空间",
      "aliases": ["进入研发空间", "选择空间"],
      "helper": "tests/e2e/helpers/space.ts",
      "export": "openResearchSpace",
      "sourceOperations": ["create-prototype"],
      "parameters": ["spaceName"],
      "version": 1,
      "startPage": "科研平台开发域首页或研发空间页",
      "endPage": "空间概览页",
      "preconditions": ["已进入科研平台开发域"],
      "postconditions": ["空间名称可见", "设计管理入口可见"]
    },
    {
      "slug": "create-workspace",
      "name": "创建工作区",
      "aliases": ["新建工作区"],
      "helper": "tests/e2e/helpers/design.ts",
      "export": "createWorkspace",
      "sourceOperations": ["create-prototype"],
      "parameters": ["name", "description"],
      "version": 2,
      "startPage": "设计资产类型页面",
      "endPage": "工作区列表出现新工作区",
      "preconditions": ["已进入目标资产类型页"],
      "postconditions": ["工作区名称可见"]
    }
  ]
}
```

When cleaning a second recording, check `flows.json` and existing helpers before writing new helper code. Reuse first; create new only when the business action is truly different. If an old recording contains a useful step but it is not registered yet, register it as a capability before composing new tests.

## Dependency Update Strategy

When a helper/capability changes, update dependents quickly and safely:

1. Build an impacted list from `flows.json`:
   - operation uses updated capability
   - operation imports updated helper
   - operation's spec text references changed labels/selectors
2. Patch helper first.
3. Patch specs only if their business composition changed.
4. Run `--list` for all impacted specs.
5. Run one representative real flow. Run all impacted real flows only when user asks or risk is high.
6. If current-page mode can validate the changed capability faster than full E2E, prefer current-page validation.

## Current Page Regression Mode

Use this mode when the user wants to begin from an already-open page:

1. Inspect current tab URL/title and visible controls with MCP snapshot.
2. Confirm the starting page matches the requested flow, for example "原型设计页".
3. Run only the local action, for example create asset, edit row, delete draft, or verify table.
4. Turn the action into a helper function that receives `page` and test data.
5. Optionally create a separate full E2E wrapper that navigates to the same page, but do not force it into the current-page test.

Current-page test naming examples:

- `prototype-create.current-page.spec.ts`
- `prototype-create.e2e.spec.ts`
- `prototype-create.helpers.ts`

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
NODE_PATH=$(npm root -g) playwright test outputs/recorded-direct.cleaned.spec.ts --list
```

Run a cleaned test:

```bash
NODE_PATH=$(npm root -g) playwright test outputs/recorded-direct.cleaned.spec.ts --headed --reporter=line
```

Headless CI run:

```bash
NODE_PATH=$(npm root -g) playwright test outputs/recorded-direct.cleaned.spec.ts --reporter=line
```

Step debug run:

```bash
PWDEBUG=1 NODE_PATH=$(npm root -g) playwright test outputs/recorded-direct.cleaned.spec.ts --debug --reporter=line
```

Run from current Chrome/MCP page:

```text
我已经登录并停在目标页面。使用 Playwright MCP 从当前页面执行后半段，不要重新登录。
```

Initialize current project:

```text
使用 $ui-regression-recorder。初始化当前工程。
```

Record a named operation:

```text
使用 $ui-regression-recorder。我要录制“创建原型”操作，从登录开始录制。
```

Rerecord after page changes:

```text
使用 $ui-regression-recorder。页面改版了，重新录制“创建原型”操作，并更新依赖它的历史流程。
```

Run a named operation:

```text
使用 $ui-regression-recorder。执行“创建原型”操作。我已经登录并停在原型设计页，从当前页面开始。
```

## New Session Prompt Template

Use this prompt when starting a new Codex session:

```text
使用 $ui-regression-recorder。

目标：把我刚录制的 Playwright codegen 脚本整理成可复用回归测试，并在必要时用 Playwright MCP/Chrome 当前登录态执行验证。

输入：
- 原始录制文件：<填 raw spec 路径>
- 目标业务流程：<例如 登录 -> 进入科研平台开发域 -> 原型设计 -> 创建资产>
- 期望结果：<例如 页面列表出现资产名 xiaoxu创建的原型>
- 是否允许自动登录：<允许/不允许；如果是单会话 SSO，默认不允许>
- 测试数据策略：<固定名称/时间戳唯一名称/从环境变量读取>
- 是否从当前页面开始：<是/否；如果是，不要生成登录和前置导航>

要求：
1. 不要覆盖原始录制文件，先备份。
2. 产出 `<原文件名>.cleaned.spec.ts`。
3. 清理试错步骤、重复点击、错误填值和无意义导航。
4. 抽取公共流程 helper，避免每个脚本重复登录、进模块、关弹窗、选空间。
5. selector 优先用 role/label/placeholder/精确文本，不要直接依赖坐标。
6. 用 `test.step` 分业务步骤，并在关键跳转后加断言。
7. 先执行 `--list` 验证脚本能被识别。
8. 如果需要跑真实创建动作，先确认是否会重复登录踢掉会话；能用 Chrome 当前登录态就不要自动登录。
9. 如果我说从当前页面开始，只写/跑后半段动作，并把它沉淀成可复用 helper。
10. 最后告诉我：原始脚本路径、清理后脚本路径、公共 helper 路径、验证结果、还有后续回归执行命令。
```

## Practical Advice

- For single-session SSO systems, use two modes:
  - Script cleanup mode: transform recordings without running login.
  - Live action mode: user logs in manually, Codex uses MCP from the current page.
- Do not mix direct recording and MCP observation in the same artifact. Treat `codegen` output as source material, and MCP observations as verification evidence.
- If a button does not respond during recording, check whether `Pick locator` is enabled before changing the script.
- When a dropdown option is ambiguous, prefer the exact option observed in the existing table row or ask for the intended option.
- If a second recording repeats a known setup path, refactor the first cleaned script before adding the second one.
- If the current page already satisfies preconditions, do not navigate away just to make the script look like full E2E.

## Resources

- `assets/playwright-common-flows.template.ts`: copy this into a repo or outputs helper file when creating shared Playwright flows.
- `assets/flows.template.json`: copy this into `tests/e2e/flows.json` when initializing a project.
