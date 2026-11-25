# dsh-agent-identity

给 DeepSeek Harness（DSH）用的「多 Agent 身份」插件：一个会话可以以**原生助手**身份工作，也可以挂上若干**具名身份**；身份正文作为系统提示词的一段注入，属于会话级的系统提示，因此总是排在项目指令文件（`AGENTS.md` 等）之前。

身份按 **三层** 管理并叠加：全局（所有会话）→ 项目（当前目录）→ 会话（当前对话），越靠后越具体，冲突时后者优先；每一层都可以放多个身份并排序，会话层还有一个「本会话静音」开关，用来一次性退出所有身份。

## 它解决的三件事

| 需求 | 实现 |
| --- | --- |
| 1. 启动时选择空 agent 或可用 agent | 新会话/会话内的身份选择器（`原生（无身份）` + 所有具名身份），按 `sessionId` 持久化，并支持全局/项目/会话三层 |
| 2. 身份内容注入当前项目，或在项目 AGENT 描述之前 | `ctx.systemPrompt.section({ order: -900 })` 注入。DSH 的 `AGENTS.md` 是首轮注入的 **user message**，而任何系统提示 section 都排在它前面，因此天然满足「在项目 AGENT 描述之前」 |
| 3. 支持多 AGENTS 身份创建 | 设置页里的身份库：新建 / 编辑 / 删除，数量不限；同一会话可叠加多个身份 |

额外能力：`delegate_to_identity` 工具可以把子任务派给某个具名身份执行（子代理提示词前缀注入同一份身份），`switch_identity` 允许模型在会话中切换或选择层的身份。

## 注入顺序原理

DSH 的 `@deepseek-ai/dsh-system-prompt` 按 order 升序拼接 section，内置关键档位：

- `HARNESS_IDENTITY` = `-1000`（harness 自身的身份）
- **本插件** = `-900`
- `DEPLOYMENT_PERSONA_PREFIX` = `0`（部署人格）
- `PLAN_POLICY` / `TEAM_POLICY` / 各 `TOOL_*` = `500` 以后
- `DEPLOYMENT_PERSONA_SUFFIX` = `10200`

项目指令文件（`AGENTS.md`、`CLAUDE.md`）不在这张表里——它们由 `@deepseek-ai/dsh-agent-instructions` 作为会话首条持久 user message 注入。所以身份段既在「部署人格」之前，也在「项目指令」之前。

注入文本：只有一个生效身份时保留单数格式（`# Active Agent Identity — <name>`）；多个时按 broad→specific 展开成 `# Active Agent Identities — A (session) + B (project)` 加若干 `## <n>. <name> — <layer>` 小节，并明确「多处冲突时靠后的优先」。

注册方式有两条，指向同一个 section 名（分层同名时 scoped 覆盖 global）：

1. `agent/created` 时用 `agent.ctx.systemPrompt.section(...)` 注册一个**绑定该会话 id 的** scoped section。文本函数从闭包里取 session id，不依赖装配上下文有什么字段。
2. 同时注册一个同名的 global section，用装配上下文的 `context.agent.id` 兜底（`@deepseek-ai/dsh-agent` 的 `assembleContextFor()` 会传 `{ agent, scope: agent, signal }`，所以这条在正常路径下也成立）。

## 安装

走 **bundle 通道**（`dsh-better-sidebar` / `@killmemory8/dsh-agents-md-presets` 等第三方插件用的都是这条）：

1. 包本身自带 `cordis.patch.yml`，内容是 `- insert: - id: agent-identity / name: dsh-agent-identity`（`package.json` 的 `dsh.bundle.patch` 指向它）。
2. 只要把包名写进 profile 的 bundle 栈，profile 启动时就会合并这份 patch，无需手改 profile 的 `cordis.patch.yml`：

```jsonc
// <profile>/package.json
{
  "dependencies": { "dsh-agent-identity": "file:G:/path/to/this/repo" },
  "dsh": { "profile": { "bundles": ["...", "dsh-agent-identity"] } }
}
```

> ⚠️ **不要**同时在 profile 的 `cordis.patch.yml` 里再写一条手动 `- insert:` —— 两处都挂载会产生两个 Node 半边。

开发态（本地目录）安装：

```powershell
# 在 <profile> 目录下用 DSH 自带的 pnpm（版本要与 profile 的 store 一致）
& $node $pnpm install
```

`package.json` 里写 `"dsh-agent-identity": "file:G:/path/to/this/repo"`，pnpm 的 file: 依赖是**复制**而不是软链，所以改了源码要刷新副本：

```powershell
Remove-Item -Recurse -Force node_modules/dsh-agent-identity
& $node $pnpm install
```

然后**完全重启 DSH**：host 侧的 JS 只在启动时导入，`cordis.patch.yml` 与依赖清单的变化虽然会被 loader 识别，但模块内容不会重新求值（实测追加注释也不会触发重载）。前端（`client.js`）改动只需 Ctrl+R。

> 若坚持走手动挂载（不用 bundle 通道），条目必须写在 profile `cordis.patch.yml` 的 `insert:` 列表里；裸写 `- id: x` 会被静默丢弃。

### 诊断

在数据目录里放一个空的 `debug.flag`，本插件会在每次系统提示装配时把装配上下文（`context` 的键、`agent.id`、`scope`）追加进 `debug.log`。这是唯一能确认「身份到底有没有进提示词」的干净办法：

```powershell
New-Item -ItemType File "$env:DSH_HOME/agent-identity/debug.flag" -Force
Get-Content "$env:DSH_HOME/agent-identity/debug.log" -Tail 5
```

会话记录本身也能查：`<DSH_HOME>/sessions/<workspace>/<sessionId>/session.v4.jsonl.zstd` 是多个 zstd 帧拼接的，解出来的 `system/message` 记录里存着完整系统提示词全文。

启动探针：模块被导入时写 `boot.log`（`module-load` / `apply-enter` / `apply-ok` / `apply-error` + 堆栈）。如果重启后看不到工具、也看不到注入，先看这个文件——`apply-error` 意味着 `apply()` 抛错，Cordis 会把该条目整个回滚（section、路由、工具全部消失），而设置页/输入框的客户端界面**仍然正常显示**，所以「UI 在 = 后端通」是错的。

### 工具 schema 的硬限制

`ctx.tools.register()` 会用 `@deepseek-ai/dsh-tools` 的 `assertSupportedJsonSchema` 校验 `output.schema`，只接受 **type / oneOf / properties / required / additionalProperties / items / enum / const** 这些关键字：

- **不接受类型数组**：`{ type: ['string', 'null'] }` 抛 `unsupported JSON schema: … must be a single type string`。
- **不接受 `anyOf`**：抛 `… is not a supported keyword`。
- 可空字段请写 `{ oneOf: [{ type: 'string' }, { type: 'null' }] }`。

另：`apply()` 里任何一处抛错都会连累整个插件条目（注册顺序上排在后面的部分也一起回滚），所以工具注册的 schema 错误会让系统提示注入「看起来像没生效」。

## 使用

- **选身份**：新会话顶部（hero 行）和输入框上方各有一个 `身份` 按钮；点开是三层勾选面板（全局 / 项目 / 本会话），勾中的身份按 ↑/↓ 排序，面板底部的「本会话静音」一次退出全部身份。选择按 `sessionId` / 项目目录持久化，重开会话仍然生效。
- **管理身份**：设置页 → 「Agent 身份」。每个身份有名称、一行简介、以及会被注入的 Markdown 正文。

也可以在对话里让模型代办（注册了 5 个工具）：

| 工具 | 作用 |
| --- | --- |
| `agent_identities` | 列出全部身份 + 当前生效的身份（带层名）与各层内容 |
| `save_identity` | 新建身份，或（带 `identity`）原地更新已有身份 |
| `delete_identity` | 删除身份；所有层里指向它的选择自动清除 |
| `switch_identity` | 改某一层：`identity` 单个 / `identities` 叠加 / `"none"` 静音，`layer` 选 global/project/session（默认会话层） |
| `delegate_to_identity` | 把子任务派给某个身份执行 |

## 数据与配置

数据目录默认 `<DSH_HOME>/agent-identity`（`DSH_HOME` 缺省为 `~/.dsh`）：

```
identities.json   # { version, identities: [{ id, name, description, body, createdAt, updatedAt }] }
selections.json   # { version: 2, global: [ids], projects: { "<项目键>": [ids] }, sessions: { "<sessionId>": [ids] } }
```

`selections.json` 的 v1 形态（`{ version: 1, selections: { "<sessionId>": "<identityId>" | "none" } }`）会在首次读取时自动迁移到 v2，并立即回写。会话层的 `["none"]` 是「本会话静音」哨兵；项目键是会话工作目录的归一化形式（`\` → `/`、去尾斜杠、Windows 下转小写）。

配置项（均为可选）：

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `injectInSystemPrompt` | `true` | 是否把身份注入系统提示词 |
| `defaultIdentity` | `""` | 会话尚未选择时使用的身份（id 或名称） |
| `storeDir` | `""` | 覆盖数据目录 |
| `maxBodyBytes` | `262144` | 身份正文上限 |
| `allowDelegation` | `true` | 是否注册 `delegate_to_identity` |

## HTTP 接口

全部挂在 `/api/agent-identity/` 下，供本插件的前端使用（同一套 `webServer` 鉴权）：

- `GET  state?sessionId=&project=` — 身份列表 + 三层选择 + 当前生效身份
- `GET  get?id=` — 单个身份（含正文）
- `GET  preview?sessionId=&project=` — 当前会话实际会被注入的文本
- `POST select { scope, sessionId?, projectKey?, ids }` — 改某一层（`scope` 省略时等价于会话层单选，`identityId` 是 `ids` 的旧别名）
- `POST save { identity }`
- `POST delete { id }`

## 测试

六套：四套是纯 node 单测，两套必须用 DSH 自带的 Electron 运行时（要 import app.asar 里的真实包，普通 node 读不了 asar）：

```powershell
# 纯 node：存储层 / 客户端 slot 契约 / host 装配（三个假 ctx harness）
npm test

# 真机级：用真实的 @deepseek-ai/dsh-tools 校验器 + 真实 Cordis/SystemPrompt/ToolsService 跑端到端
pwsh -NoProfile -File scripts/test-real.ps1
```

- `test/store.test.mjs` — 存储层断言（含 v1→v2 迁移、三层叠加顺序、项目键归一化、静音、`defaultIdentity` 只在全局层为空时生效、删除清理全层、旧接口兼容）。
- `test/client.test.mjs` — 用假 `window.__ModuleLoader__` 校验客户端导出形状与 4 个 slot 注册。
- `test/host.test.mjs` — 假 ctx 校验 section 名/order、6 条路由、5 个工具（含对话内建/改/删身份）、三层叠加与按会话隔离、静音压制全局层、`defaultIdentity` 兜底。
- `test/render.test.mjs` — 用真 React 19 + `react-dom/server` 把 picker / 三层面板 / 设置页 / 图标真的渲染一遍（`react`、`react-dom` 是本仓库的 devDependencies，只为测试服务）。
- `test/toolschema.test.mjs` — 用真实的 `assertObjectJsonSchema`/`assertSupportedJsonSchema` 校验工具定义与**运行期输出**（正是这条抓出了 `type: [...]` 的致命 schema 错误）。
- `test/cordis-e2e.mjs` — 真实 `Cordis + SystemPrompt + ToolsService + native 执行器` 里挂载插件，断言装配出的系统提示词确实含身份正文、原生身份不注入、按会话隔离。

`scripts/refresh-profile.ps1` 是开发态刷新脚本（删副本 + 用 DSH 自带 pnpm 重装 + 提示重启）。

## 已知限制

- 子代理身份走**提示词前缀**注入（DSH 的 `startActivation` 需要预留 `childId` 才能提前登记身份，当前版本的子代理工具不返回 session id），因此子代理的身份不在系统提示词 section 里，而在任务提示词开头。
- 身份切换在当前轮内生效于下一次系统提示装配（即下一步）。
- 删除身份会清掉所有层里指向它的选择；那些层退回原生身份 / `defaultIdentity`。
- 项目层依赖会话的工作目录（`workingDirectory.get(agent.session)`）；拿不到目录时（极少数早期会话）项目层为空，界面上也不显示该分组。

## License

MIT
