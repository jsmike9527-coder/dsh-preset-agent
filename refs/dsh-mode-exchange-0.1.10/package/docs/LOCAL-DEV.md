# 本地加载与调试

这份说明假设你就在本仓库根目录：

```
<本仓库的绝对路径>        # 例如 PowerShell 里的 (Get-Location).Path
```

下面所有命令都在这个目录里执行。

---

## 0. 先决条件

| 项 | 值 |
| --- | --- |
| DSH 版本 | 0.2.2-rc.3 以上、0.3.0 以下（`package.json` 的 `engines.dsh`） |
| Node | 22 及以上（只用来跑本地脚本；插件本体在宿主里跑） |
| profile | `desktop`（`%USERPROFILE%\.dsh\profiles\desktop`） |

本插件**没有任何 install 脚本、没有任何运行时依赖**（`dependencies` 为空，
源码里只有 `node:*` 内置模块与相对导入）。因此不存在「装完还要 build」的坑，
也不需要仓库里有 `node_modules` —— 宿主直接 import 本仓库的 `index.js` 即可。

配置 schema 是手写的 standard-schema v1（`Config['~standard'].validate`），
不依赖 `@deepseek-ai/schemastery`：宿主只认 standard-schema 协议，
而且本地 link 安装时 Node 按 realpath 解析，够不到 profile 里的那份 schemastery。

---

## 1. 跑一遍自检

三个脚本，互不依赖，任何时候都能跑：

```powershell
# ① 静态体检：manifest / exports / icon / locale / bundle 产物 / profile 挂载
node scripts/probe.js

# ② 重新生成客户端产物 src/client/bundle.js
node scripts/build-client.mjs

# ③ 只校验产物是否是最新的（不写文件，有不一致就非零退出）
node scripts/build-client.mjs --check
```

`probe.js` 会打印每一项的 `[ok]` / `[FAIL]`，末尾给结论；有 FAIL 时退出码为 1，
可以直接接到 CI 或 pre-commit 上。它会顺带检查 profile 的 `cordis.patch.yml` 里
有没有出现过 `dsh-mode-exchange`，方便确认「装没装」。

> 改了 `src/client/*.js` 之后必须重新跑 `build-client.mjs`。
> 宿主加载的是 `src/client/bundle.js`（见 `package.json` 的 `exports["./client"]`），
> 不是源文件。`probe.js` 会检查产物里 `<id>` 是否等于包名、有没有导出入口函数。

### 语法快查

不启动宿主也能确认所有文件至少能被解析：

```powershell
node --check index.js
Get-ChildItem src/host/*.js, src/client/*.js | ForEach-Object { node --check $_.FullName }
node --check src/client/bundle.js
```

---

## 2. 装进 profile

**不要手改 `%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml`。**
本插件以前在 profile 里出现过手工挂载条目（还留下过 `cordis.patch.yml.corrupt-*.bak`），
那种做法容易把 patch 写坏。正确入口是 `plugin_manager`：

```
plugin_manager({ action: "install_bundle", target: "<本仓库的绝对路径>" })
```

本地目录安装是**把整个 checkout 链接进去**，`files` 数组不生效——
所以工作目录里的东西（包括 `.git`、临时文件）都会被一起链接。想干净，
就单独 clone/copy 到一个只放插件的目录再装。

装完用这些确认：

```
plugin_manager({ action: "list_plugins" })          // 看状态是不是 active
plugin_manager({ action: "list_bundles" })          // 看 bundle 行有没有挂上
```

状态含义：

- `failed` → 有错误，看宿主日志（`apply` 里的 `warn`/`error`）；
- `overridden` → 被更高优先级的配置层盖住了；
- `restart-required` → 改了已安装包的 JS，**必须重启宿主**才生效。

> **替换已安装的包必须重启。** 只改源码再 `install_bundle` 不会换掉已加载的模块世代。

### 2.1 profile 里已经存在同 id 的手工挂载怎么办

如果之前手改过 `cordis.patch.yml`，里面可能已经有一条同 id 的 `insert`：

```yaml
# dsh-mode-exchange manual mount
- insert:
    - id: mode-exchange
      name: '<某个早期的插件目录>'
```

`plugin_manager list_plugins` 里它的 `fiberPhase` 通常是 `null`（别的条目是 `active`），
说明这条挂载**从来没有激活成功**。它和 `install_bundle` 装进来的包同 id，必须先处理掉，
否则会出现「同 id 双挂」或旧目录优先的情况。二选一：

- **推荐**：删掉 profile 里上面这四行，然后只用 `plugin_manager install_bundle`；
- 或者：把 `name` 改成当前仓库的绝对路径，让它就是你的开发挂载，不再额外安装。

改之前备份 `cordis.patch.yml`。

---

## 3. 换个方式：开发期直接挂载

如果只是想边写边测、不走 `install_bundle`，可以在 profile 的 `cordis.patch.yml`
末尾追加一行 `insert`（**改之前先备份**）：

```yaml
- insert:
    - id: mode-exchange
      name: '<本仓库的绝对路径，正斜杠或转义反斜杠都可以>'
      config:
        defaultMode: ''
        deleteOldSession: true
        enableTeam: false
        exportDir: ''
        keepExportCopy: true
        confirmBeforeMigrate: true
        autoOpenTarget: true
```

宿主对本地目录的 `name` 是把它当路径解析的，所以用正斜杠或转义反斜杠都可以。
改完重启宿主。

两种方式二选一，**不要同时挂**同 id 的两行，会导致重复注册报错。

---

## 4. 冒烟测试清单

装好、重启之后，按顺序走一遍。每条都写清了「看什么才算过」。

### 4.1 插件起来了

1. 打开：设置 → 插件，找到「模式交换」（包名 `dsh-mode-exchange`），状态是 active。
2. 侧栏出现「模式迁移」入口，点开能看见三个页签（模式切换 / 迁移重建 / 迁移历史）。
3. 设置 → 找到「模式迁移」，六个字段都在。

### 4.2 能力 A：切换

在新会话里（先发一句话让它有历史）执行：

```
/switch-mode --list
```

- [ ] 列出运行时全部模式（id、名称、当前/默认/装配失败的标记），
      条数与设置里预设列表一致 —— 证明是运行时枚举、没有硬编码。
- [ ] 随便改一个 preset 的显示名再回来执行，列表跟着变。

```
/switch-mode ptc
```

- [ ] 返回「已切换至「PTC」模式，工具集已变更」+ 卸载/补挂明细。
- [ ] 对话流里多出一条说明消息（能看见工具集变了，别再去调已卸载的工具）。
- [ ] 下一轮对话里，模型看不到被卸载的工具（让它列一下可用工具即可验证）。
- [ ] 面板「切换」页签显示当前模式 = ptc，并显示入口快照（from/to/at/denied）。

```
/switch-mode --revert
```

- [ ] 工具与提示词回到切换前。
- [ ] 面板快照消失。

失败路径：

- [ ] 对着一个已归档会话执行 → 报「已归档，无法切换」而不是静默失败。
- [ ] 对着不存在的模式名执行 → 报错并列出可用模式。

### 4.3 能力 B：迁移

```
/migrate-session --mode ptc --delete-old false
```

- [ ] 命令立刻返回「迁移已开始」+ 七步说明（不阻塞）。
- [ ] 面板「迁移」页签看得到步骤在推进、有耗时。
- [ ] 结束后面板出现报告卡片：新旧会话 ID、日志路径、消息数、团队状态、旧会话处置。
- [ ] 打开新会话，历史消息、工具调用记录都在 —— 随便问一句它记得上文。
- [ ] `--delete-old false` 时旧会话仍在列表里，报告写「旧会话未删除 / 保留」。

```
/migrate-session --mode ptc --yes
```

- [ ] 旧会话被归档（从列表消失），报告写「已归档」并在备份路径处给出文件。
- [ ] `backups/` 目录里能看见 `<时间戳>-<短ID>.backup.jsonl`。

幂等：

- [ ] 立刻对同一会话再执行一次 → 不产生第二个新会话，返回「续跑 / 放弃」提示。

续跑：

```
/migrate-session --mode ptc --resume
```

- [ ] 上一次中途失败后，带 `--resume` 能真正越过台账里的未完成记录、
      重新跑一遍七步（台账里会多一条「续跑：沿用已有台账」时间线）。
- [ ] 不带 `--resume` 也不带 `--yes` 时不越过守卫，仍返回续跑/放弃提示。
- [ ] 面板上的「继续」按钮是**重新发起 + 自动确认**（等价于 CLI 的
      `--resume --yes`），不是复用旧任务对象。

团队：

- [ ] `--team on` 时新会话的团队协作是开着的（看会话头部或团队面板）。
- [ ] 若当前宿主探测不到团队能力，面板里的开关是灰的并写明原因，
      报告记「未启用 + 原因」，不会假装成功。

### 4.4 持久化与状态同步

- [ ] 在设置页改「默认目标模式」，重启宿主，值还在。
- [ ] 在设置页改「默认是否归档旧会话」，回到侧栏面板，
      迁移页签的开关默认值同步变了（不用重启）。
- [ ] 关闭「迁移前强制确认」时会弹二次警告；不确认则改不成。

### 4.5 重启无脏状态

- [ ] 做一次切换 → 重启宿主 → 面板仍显示该会话处于切换状态（快照从磁盘读回）。
- [ ] 做一次迁移 → 重启宿主 → 历史列表与报告都还在（台账落盘）。

---

## 5. 数据落在哪

默认根目录是**当前会话 cwd** 下的 `.dsh/mode-exchange/`；设置里填了「日志导出目录」
就整个换到那里。目录结构：

```
<root>/
  exports/     <YYYYMMDD-HHmmss>-<短ID>.jsonl  + 同名 .meta.json（含 sha256）
  backups/     <YYYYMMDD-HHmmss>-<短ID>.backup.jsonl  + .meta.json
  reports/     <jobId>.json                    迁移报告
  migrations/  <源会话ID>.json                 台账（幂等与续跑的依据）
  state/       switches.json                   软切换入口快照
```

想重置：删掉 `state/switches.json` 会让所有软切换「忘记」自己被切换过
（工具和提示词会在下次装配时恢复原样），删掉 `migrations/` 下的某条台账
则可以对该会话重新发起迁移。**`exports/` 与 `backups/` 是唯一的历史副本，
清之前确认新会话已经能正常打开。**

---

## 6. 调试通道

除了界面，还可以直接打 HTTP（面板走的就是这一套）：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/mode-exchange/state?sessionId=<id>` | 面板整页数据 |
| POST | `/api/mode-exchange/switch` | 软切换 |
| POST | `/api/mode-exchange/revert` | 回退 |
| POST | `/api/mode-exchange/migrate` | 发起迁移 |
| GET | `/api/mode-exchange/job?jobId=<id>` | 任务进度 |
| POST | `/api/mode-exchange/cancel` | 取消任务 |
| GET | `/api/mode-exchange/migrations?sessionId=<id>` | 历史列表 |
| GET | `/api/mode-exchange/report?reportId=<jobId>` | 报告详情 |
| POST | `/api/mode-exchange/archive-old` | 只归档旧会话 |
| POST | `/api/mode-exchange/config` | 写设置 |

响应统一是 `{ ok: true, value }` 或 `{ ok: false, error: { code, message } }`。
直接在浏览器控制台里 `fetch('/api/mode-exchange/state?sessionId=...')`
是最快的排障手段。

宿主侧的日志里，本插件的行都带 `mode-exchange` 标签：
`apply` 时会打印一次能力探测结果（哪些可选服务在、哪些不在），
切换与迁移的每一步也会落日志。

---

## 7. 已知会踩的坑

1. **改了 `src/client/*.js` 忘了 build** → 界面上看不到改动。
   先跑 `node scripts/build-client.mjs`，再重启宿主（替换已安装包必须重启）。
2. **`node --check` 过了但界面白屏** → 多半是 bundle 的导出丢了。
   `probe.js` 会检查 `startModeExchangeClient` 在不在；
   沙箱里 `vm.runInNewContext` 加载一遍 bundle 也能快速定位。
3. **手动改了 profile 的 `cordis.patch.yml`** → 格式坏了整个 profile 起不来。
   同目录下出现过 `.corrupt-*.bak` 就是前车之鉴；用 `plugin_manager` 装。
4. **`/switch-mode ptc` 后仍看到旧工具** → 确认目标模式确实不含那个工具；
   再看返回里有没有「只做了提示词层切换」的提示（说明没拿到作用域级注册）。
5. **归档失败 / 报告写「已排期」** → 这是预期行为：命令正跑在被归档的会话里，
   归档被排到回合结束后重试。稍等再刷新列表。
6. **中文乱码** → 本插件源码统一 UTF-8。若编辑器的编码设置不对，
   容易出现 `鈥?`、`鍒?` 之类的乱码并伴随 `SyntaxError`。修好编码后重跑 `build-client.mjs`。
