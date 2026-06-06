# UI 页面自动化测试 Skill

[![Release v0.1.4](https://img.shields.io/badge/release-v0.1.4-blue)](https://github.com/xuxh21/ui-regression-recorder-skill/releases/tag/v0.1.4)

[English](./README.md)

把一次人工 UI 页面操作沉淀成可复用的自动化能力，再基于这些能力组装新的测试流程，而不是每来一个需求就重录一遍。

> 这个 skill 的目标不是保存一段一次性的录屏脚本，而是把完整业务流程拆成可复用能力，把脚本拆成可维护的部分，并为新的请求组装出最小可运行的回归流程。
>
> 当前稳定版本：[v0.1.4](https://github.com/xuxh21/ui-regression-recorder-skill/releases/tag/v0.1.4)
>
> 所有版本入口：[GitHub Releases](https://github.com/xuxh21/ui-regression-recorder-skill/releases)

## Overview

UI 回归通常会在两个地方出问题：

- 原始录制太粗糙，后面难以维护
- 每个新需求都从一份全新的脚本开始

这个 skill 的设计目标就是同时解决这两个问题。

它会保留第一条完整录制，把里面的公共动作抽成可复用 capability，登记到 `flows.json`，后续再用这些能力去组装新的业务流程，并且默认用可见浏览器执行。

## Core Idea

这套方案的核心不是“录一次，以后一直重放”。

真正的核心是：

1. 先录一条完整业务流程
2. 再把这条流程拆成稳定的业务能力
3. 把脚本拆成 raw recording、cleaned spec 和 shared helper
4. 用机器可读的方式把这些能力登记起来
5. 后续再用老能力去组装新业务流程

换句话说，这个 skill 把 UI 回归看成“流程编译”，而不是“脚本存档”。

一条录制里往往包含很多可复用片段：

- 打开目标模块
- 打开列表页
- 创建一条记录
- 编辑一条记录
- 校验重名拒绝

这些片段一旦存在，后续新需求就不需要再新建一条完整 E2E 脚本。skill 会先规划目标流程，再把每一步匹配到已有 capability，最后自动组装出新的可执行回归流程。

## What This Skill Solves

普通 Playwright 录制只解决了第一步：“能不能把点击录下来？”

真正的 UI 回归还需要：

- 先按业务目标规划流程，再决定用哪份脚本
- 从完整录制中抽取可复用能力
- 遇到重名校验、批量验证这类场景时，重复调用同一个 helper
- 默认用 `headed` 可见浏览器，让测试人员能看见发生了什么
- 某一步失败时，先检查上一 capability 的 postcondition，而不是直接改当前 selector

这个 skill 的重点就是把这些一起解决掉。

## Core Workflow

完整工作闭环是这样的：

1. 先录一条完整业务流程
2. 保留原始 Playwright codegen 输出
3. 清理成稳定 spec 和共享 helper
4. 把 operation 和 capability 登记进 `flows.json`
5. 后续新需求先按业务步骤规划
6. 再把每一步映射到已有 capability
7. 只有 capability 真缺失或已过期时才重录
8. 除非用户明确要求 CI 或 headless，否则默认用可见浏览器执行

## How The Skill Works

这个 skill 本质上是一个四阶段系统。

### 1. Business Decomposition

skill 会先把用户需求拆成有顺序的业务步骤。

例如：

```text
目标：验证列表页上的重名拒绝
步骤：
1. 打开目标模块
2. 打开列表页
3. 第一次创建记录
4. 第二次创建同名记录
5. 验证重复名称被拒绝
```

这一步发生在选择脚本之前。

### 2. Capability Matching

每一个业务步骤都会去匹配 `flows.json`、共享 helper 和已有 spec。

它不会一上来就找“最像的完整脚本”，而是先问：

- 哪一步已经有 capability
- 哪一步只是换个参数就能复用
- 哪一步是真的缺失，必须补录

### 3. Script Decomposition and Assembly

一条完整录制永远不会被当作唯一最终产物。

skill 会把它拆成：

- raw recording
- cleaned spec
- shared helpers
- capability metadata

然后当新业务需求进来时，再用这些可复用零件去组装出一条新的可运行流程。

也就是说，这套系统同时具备两种能力：

- 把一条旧脚本拆成多个小 capability
- 把多个旧 capability 重新组合成一条新脚本

### 4. Visible Execution and Feedback

组装完成后，skill 默认用 `headed` 浏览器跑最小可验证流程。如果运行失败，它会先回溯上一个 capability 的 postcondition，而不是盲改当前 selector。

这套闭环是：

```text
record -> split -> register -> reuse -> assemble -> run -> refine
```

## Why It Is Different

这个 skill 不把录制好的 spec 当成最终产物。

真正的最终产物是 capability map：

- `login`
- `open-module`
- `open-list-page`
- `create-record`
- `edit-record`
- `verify-table-row`

这些 capability 一旦被提取出来，后续新流程就可以通过组合旧能力来完成，而不是每次都从零录。

这也是它能支持“拿旧业务拼新业务”的原因：

- 旧业务流程 A 产出能力 `a`、`b`、`c`
- 旧业务流程 B 产出能力 `c`、`d`、`e`
- 新业务流程 C 完全可能由 `a + c + e` 组装出来

## Safe Example

这个 skill 的一个真实演进会话是 Codex session `019e8904-5b39-7120-9aa4-48c3fd312123`。

那次实践最终把 skill 收敛成四条核心规则：

- 先按业务目标规划流程，再选脚本
- 重名校验优先重复调用同一个 capability
- 默认使用可见浏览器执行人工回归
- 失败时先回溯上一 capability 的 postcondition

通用化示例：

- 第一轮：录制 `create-record`
- 第二轮：验证 `duplicate-name rejection`

第二轮不是一条全新的流程，而是：

1. 先规划目标业务流程
2. 复用 `open-list-page`
3. 调用 `createNamedRecord(... expected: success)`
4. 再调用 `createNamedRecord(... expected: duplicate)`
5. 在可见浏览器里执行回归

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
  完整的工作说明，覆盖初始化、录制、清洗、组合、复跑和排障。

- `agents/openai.yaml`
  skill 的基础展示元数据。

- `assets/flows.template.json`
  operation、capability、history 的起始 registry 模板。

- `assets/playwright-common-flows.template.ts`
  通用 Playwright helper 模板，包含遮罩清理、页面断言、通用记录创建和从当前页继续执行等能力。

## Quick Install

### Option A. Install with the built-in skill installer

如果目标 agent 已经有内置的 Codex skill installer，推荐直接用：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo xuxh21/ui-regression-recorder-skill \
  --ref v0.1.4 \
  --path . \
  --name ui-regression-recorder
```

这样安装会固定在一个明确 release 上，不会随着 `main` 漂移。

### Option B. Give an agent the GitHub link directly

示例提示词：

```text
使用 $skill-installer。安装 https://github.com/xuxh21/ui-regression-recorder-skill/tree/v0.1.4 这个 skill，名称设为 ui-regression-recorder。
```

### Option B2. Copy-and-send prompt

如果你想直接复制一段话发给另一个 agent，可以用这段：

```text
使用 $skill-installer。

从这里安装 skill：
https://github.com/xuxh21/ui-regression-recorder-skill/tree/v0.1.4

安装后的名称：
ui-regression-recorder

安装完成后，重启 Codex，并在新会话里确认 skill 已经可用。
```

### Option C. Manual install

```bash
git clone --branch v0.1.4 --depth 1 https://github.com/xuxh21/ui-regression-recorder-skill.git
mkdir -p ~/.codex/skills
cp -R ui-regression-recorder-skill ~/.codex/skills/ui-regression-recorder
```

### Verify installation

```bash
ls ~/.codex/skills/ui-regression-recorder
sed -n '1,20p' ~/.codex/skills/ui-regression-recorder/SKILL.md
```

安装或更新完成后，请重启 Codex，让它重新加载 skill 元数据。

## Full Setup

这一节故意写得比较细。如果你既想用 Playwright 录制，又想复用当前 Chrome 登录态，请完整按下面步骤来。

### 1. Install Node.js

先检查机器上有没有 Node.js：

```bash
node -v
npm -v
```

如果这两个命令报错，先安装 Node.js 18+。

常见方式：

- macOS + Homebrew：`brew install node`
- 其他平台：去 [nodejs.org](https://nodejs.org/) 安装

### 2. Install the skill

先把 skill 本身装好，再继续配置 Playwright：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo xuxh21/ui-regression-recorder-skill \
  --ref v0.1.4 \
  --path . \
  --name ui-regression-recorder
```

确认目录已经存在：

```bash
ls ~/.codex/skills/ui-regression-recorder
```

### 3. Install Playwright packages

安装这个 skill 会用到的几个包：

```bash
npm install -g playwright @playwright/mcp @playwright/cli@latest
```

逐个验证命令：

```bash
playwright --version
playwright-cli --help
npx @playwright/mcp@latest --help
```

每个包的作用：

- `playwright`：提供 `playwright codegen`、`playwright test` 和 `playwright install`
- `@playwright/mcp`：让 Codex 通过 MCP 连接 Playwright 或 Chrome
- `@playwright/cli`：官方 Playwright CLI 工具链，适合你也想用独立的 `playwright-cli` 工作流时一起装上

可选附加步骤：

```bash
playwright-cli install --skills
```

### 4. Install Playwright browsers

至少安装一个 Playwright 浏览器运行时：

```bash
playwright install chromium
```

如果你想把本地环境一次配全，也可以执行：

```bash
playwright install
```

### 5. Install the Playwright Chrome Extension

如果你希望 skill 能复用当前 Chrome 的登录态、Cookie 和已有标签页，请安装官方 Playwright Chrome 扩展：

- Chrome 商店地址：[Playwright Extension](https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm)

推荐步骤：

1. 打开上面的 Chrome 商店链接
2. 点击 `Add to Chrome`
3. 把扩展固定到工具栏，方便后续找到
4. 安装完成后点开扩展一次
5. 如果你希望后续自动连接，把扩展里显示的 `PLAYWRIGHT_MCP_EXTENSION_TOKEN` 复制出来

如果你暂时不配置 token，后续每次连接浏览器时，Chrome 可能会要求你手动确认。

### 6. Configure Codex MCP

创建或编辑 `~/.codex/config.toml`，加入：

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest", "--extension"]
env = { PLAYWRIGHT_MCP_EXTENSION_TOKEN = "把你的 token 粘贴到这里" }
```

如果你想先手动确认连接、暂时不配 token，也可以这样写：

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest", "--extension"]
```

### 7. Restart Codex

以下任意一步做完后，都建议重启一次 Codex：

- 安装 skill
- 安装 MCP server
- 修改 `~/.codex/config.toml`

不重启的话，agent 可能看不到新 skill 或新 MCP 配置。

### 8. Smoke-test everything

先打开 Chrome，并随便停留在一个普通网页上。

然后新开一个 Codex 会话，试这两句最简单的话：

```text
使用 Playwright MCP 查看当前 Chrome 标签页。
```

```text
使用 $ui-regression-recorder。初始化当前工程的 UI 回归目录。
```

如果一切配置正确：

- Codex 应该能连上 Chrome
- 第一次可能需要你手动批准连接
- agent 应该能读到当前标签页结构
- 新会话里应该能直接看到刚安装的 skill

## First Tutorial

### Tutorial A. First full-flow recording

当你要建立第一条可复用基线时，用这条路径。

1. 安装 skill
2. 安装 Playwright 包和浏览器
3. 初始化当前工程：

```text
使用 $ui-regression-recorder。初始化当前工程的 UI 回归目录。
```

4. 打开目标站点
5. 从一条稳定的业务起点开始录制完整流程
6. 录制过程中保持 `Record` 打开、`Pick locator` 关闭
7. 停止并保存 raw recording
8. 再让 skill 帮你清洗、抽 helper、更新 `flows.json`

### Tutorial B. Continue from the current page

如果登录脆弱，或者你已经在 Chrome 里停在目标页面上，用这条路径最安全。

1. 手动打开 Chrome
2. 如果需要登录，自己先登录
3. 手动进入你要验证的目标页面
4. 再告诉 Codex：

```text
使用 $ui-regression-recorder。我已经在目标页面上了，从当前页面继续，不要重新登录。
```

这通常是单会话 SSO 场景下最稳妥的工作方式。

## Operating Principles

### 1. Plan before replay

不要先找一条“最像的脚本”。

应该先回答：

- 当前要验证的业务结果是什么
- 这件事拆成哪些顺序步骤
- 哪些步骤已经有 capability
- 哪一步是真的缺失

### 2. Reuse capabilities, not whole scripts

如果历史脚本里已经有需要的动作，就提取并复用对应 helper，不要整条 spec 复制一份。

### 3. Reuse the same capability repeatedly

如果任务本质上是重名校验、批量创建或重复提交，优先多次调用同一个已有 helper，只改变期望结果，不要重新造一条大流程。

### 4. Headed browser by default

面向人工观察的回归，浏览器应该是可见的。

只有 CI 或用户明确要求后台跑时，才切 headless。

### 5. Preserve raw, clean separately

原始录制必须保留。

真正可维护的是 cleaned spec 和 shared helper。

### 6. Backtrack failures

如果第 N 步失败，先检查第 N-1 步是不是真的完成了。页面上看到的失败点，经常不是根因点。

## Versioning and Upgrade

### Why the install is pinned

安装时请固定到 release tag，比如 `v0.1.4`，不要直接装 `main`。

这样做的好处是：

- 安装结果可复现
- 回滚点清晰
- release notes 和实际安装内容能对应上

### How to upgrade safely

内置安装脚本不会覆盖一个已经存在的目标目录。所以升级时，要先替换旧 skill 目录，再安装新的 tag。

安全升级示例：

```bash
export UI_REG_SKILL_VERSION=v0.1.4
mv ~/.codex/skills/ui-regression-recorder ~/.codex/skills/ui-regression-recorder.bak.$(date +%Y%m%d%H%M%S)
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo xuxh21/ui-regression-recorder-skill \
  --ref "${UI_REG_SKILL_VERSION}" \
  --path . \
  --name ui-regression-recorder
```

然后：

1. 重启 Codex
2. 新开一个会话
3. 验证 skill 已经可用

### Where to check versions

- 当前稳定版本：[v0.1.4](https://github.com/xuxh21/ui-regression-recorder-skill/releases/tag/v0.1.4)
- 所有版本入口：[GitHub Releases](https://github.com/xuxh21/ui-regression-recorder-skill/releases)

## Typical Use Cases

- 初始化一个项目的 UI 回归目录结构
- 录制一条具名业务操作
- 把 raw Playwright codegen 输出整理成稳定 spec
- 从多条流程里提取共享 helper
- 用新测试数据执行已有流程
- 从当前登录页面继续执行后半段动作
- 页面改版后，只更新真正变化的 capability

## Example Prompts

```text
使用 $ui-regression-recorder。初始化当前工程。
```

```text
使用 $ui-regression-recorder。我要录制一个“创建记录”操作，从第一个稳定页面开始录。
```

```text
使用 $ui-regression-recorder。验证列表页上的重名拒绝。
要求：
- 先规划流程
- 优先复用已有 helper
- 默认打开可见浏览器
```

```text
使用 $ui-regression-recorder。我已经在目标页面上了，从当前页面继续，不要重新登录。
```

## Privacy Notes

这个仓库故意只使用通用示例，例如：

- module
- list page
- record
- detail page
- duplicate-name rejection

文档和模板都避免出现具体业务名词，这样公开仓库才能安全分享。

## Status

这个仓库发布的是一套已经在真实 Codex 会话里打磨过的 skill 当前版本，而不是一个纯概念模板。
