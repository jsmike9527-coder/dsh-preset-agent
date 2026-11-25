# Changelog

本项目的所有重要变更都会记录在此文件中。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.10] - 2026-11-23

### 修复
- **迁移失败的报告终于带原因**：失败原因同时写进报告的 `error` 字段与
  `remainingSteps` 第一条（「失败原因：…」），面板在失败徽章下方用错误色条直接显示。
  此前 `error.message` 只进内存里的任务状态与 console，迁移一结束就没了，用户打开报告
  只看到「中止在第 4 步」，不知道到底为什么。
- **写入来源标记不再可能中断迁移**：`appendProvenance` 整体进 try（含 `liveAgent` 与
  `session.append` 判定），调用点再包一层；写不上来历只记一条时间线，不影响迁移结论。
  上一版这处是裸 await，宿主返回的 agent 形状一变就会在「导入」成功之后把整次迁移判失败。
- 插槽注册逐项兜底（`safeSlot`）：`main` / `sidebar.panellist` / `settings.section` /
  `settings.section.icon` 任一处抛错只记 console，不再中断整个 `apply()`
  —— 之前一处失败就会「插件显示已启动，侧栏图标和设置分节却都不见了」。
  语言包注册、样式注入、右键菜单挂载同样各自兜住。

### 新增
- **迁移成功后自动停在新建会话**：客户端在任务转为 `done` 且报告成功时调
  `uiWorkspace.openSession(target)` 把主视图切过去（每个任务只做一次），宿主侧同时用
  `workspaceRegistry.pinSession` 把新会话置顶；置顶结果写进报告的 `target.pinned`。
  新增设置项**「迁移后自动打开新会话」**（`autoOpenTarget`，默认开），关掉就仍停在原会话。
  配置项由 6 个变 7 个。

### 界面
- 面板与设置页统一成「行列表」卡片：卡片本身不再内衬，字段 / 开关 / 选择器各占一行，
  行与行用 .5px 分隔线串联（对齐宿主 GeneralSection 的行式列表），消除了「R20 卡片 →
  内衬 → R16 选择器」的三层边框。
- 卡片内的提示条改为通栏色带，不再画自己的左右边框；相邻两个选择器之间补一条分隔线。
- 主区面板不再在页面里浮一张带阴影的卡片，改为按页面排版（内容列 760px、页签宽度封顶），
  设置页与主区共用同一套内容列宽度。
- 修 .dsh-me-toggle 自带 padding: 2px 0 压过卡片行内衬、导致开关行贴边的问题。

### 开源准备
- `docs/market/dasuda13__dsh-mode-exchange.yml`：提交到 awesome-dsh-plugin 收录列表的
  条目文件（市场读 `awesome-dsh-plugin.com/plugins.json`，收录靠往该仓库提 PR 加这一个
  YAML，没有上传接口）。`README.md` 的文档索引与目录树已同步。

- 新增 `.gitignore`：排除 `node_modules/`、本地取证目录（`.verify/`、`.refs/`、
  `.dsh-vision-router/`，含桌面截图与宿主安装包转储）、运行期数据目录与临时文件。
- 新增 `LICENSE`（MIT），`package.json` 的 `private` 改为 `false` 并补 `license` 字段。
- 清除源码与文档中写死的开发机绝对路径：
  `scripts/smoke-seed.mjs` 改为相对导入，`scripts/smoke-host.mjs` 用 `import.meta.url` 解析，
  `scripts/probe.js` 改为优先读 `DSH_APP_ASAR`、否则按 `LOCALAPPDATA` 推断，
  `README.md` / `docs/LOCAL-DEV.md` 的安装示例改为 `<本仓库的绝对路径>` 占位符。
- 统一面板/设置页名称说明（侧栏与设置页标签是「模式迁移」，插件列表名是「模式交换」）。
- `package.json` 补 `repository` / `homepage` / `bugs` / `author`，LICENSE 署名对齐仓库所有者。
- 新增 `scripts/push-git.ps1`：一键 `init → add → commit → branch -M → remote add → push`，
  自动在 PATH 之外查找 `git.exe`（刚装完 git 没重开终端时也能跑），默认带 `--force`
  （远端 Initial commit 与本地无共同历史），支持 `-DryRun` / `-NoForce` / 身份参数。
- 新增 `docs/PUBLISH.md`：三条发布路径（REST 推送器 / git 脚本 / 网页上传）、PAT 权限、
  认证方式与本机特有的 schannel、代理、换行符等报错对照表。
- 新增 `scripts/publish-npm.ps1`：一键发布到 npm registry。六步（定位 npm → 检查登录 →
  构建与冒烟 → `npm pack --dry-run --json` 校验真实打包清单与 icon 体积 → 版本查重 →
  `npm publish --access public`），支持 `-Version` / `-Tag` / `-Otp` / `-DryRun` / `-SkipTests`。
  定位 npm 时优先 `npm.cmd`（避免 `npm.ps1` 包装器的 stderr 噪声），读 JSON 时强制 UTF-8
  （PS 5.1 的 `Get-Content` 会按 ANSI 解码，把中文 description 读成乱码）。
- `docs/PUBLISH.md` 增补「方案 D：发布到 npm」：`npm login`、脚本六步对照表、手敲版命令、
  发布后验证、升级版本、发布报错对照表，以及可选的插件索引源（`format: 1` JSON）示例。
- `README.md` 安装章节区分「从 npm 装」与「从本地目录装」。
- `scripts/publish-npm.ps1` 修三处首次真发暴露的问题：
  ① npm 的 `notice` 走 stderr，PS 5.1 把 `2>&1` 重定向的每条 stderr 都渲染成
  `NativeCommandError` 刷屏、真实报错被淹没 —— 改为临时 `.cmd` 包裹 + 文件重定向再按 UTF-8 读回，
  成功时只打印 `+ pkg@version` 之类的关键行；
  ② 失败提示按真实原因分支，把「E403 + 2FA」从「包名被占用」里拆出来，给出验证码与
  bypass-2fa token 两条具体路径；
  ③ 撞上 2FA 错误后当场 `Read-Host` 问 6 位验证码（验证码 30 秒过期，先问再发必然过期），
  拿到就立即重试一次；
  另修中文输出在 GBK 控制台显示成「浜х墿鏄渶鏂扮殑」的乱码（`[Console]::OutputEncoding = UTF8`）。
- `docs/PUBLISH.md` 新增「6.5 开了 2FA 怎么发」：报错原文、办法 A（脚本当场问码 /
  `-Otp`）、办法 B（granular access token 勾 Bypass 2FA 的五步 + 安全提醒），
  并把报错对照表里 `E403` 拆成「2FA」与「名称/版本冲突」两行。
- 新增 `scripts/publish-npm.cmd`：`publish-npm.ps1` 的免策略包装器。Windows 默认
  `RemoteSigned` 会拦下未签名的本地 `.ps1`（报「未对文件 … 进行数字签名」），
  包装器用 `-ExecutionPolicy Bypass` 起一次性子进程，参数原样透传，不改系统策略。
  文件内容保持纯 ASCII —— cmd.exe 按 OEM 代码页（中文系统是 936）读批处理，
  UTF-8 中文注释会被拆成可执行行的错误输出。
- `docs/PUBLISH.md` 补「别直接敲 `.\scripts\publish-npm.ps1`」的提示与 `.cmd` 用法，
  报错对照表新增「未对文件 … 进行数字签名 / `UnauthorizedAccess`」一行。
- `scripts/publish-npm.ps1` 新增 `-Bump`：当前版本已在 npm 上时自动升一个补丁号
  （`0.1.0 → 0.1.1`，预发布版先落回正式号）再发，省掉「发布→被拦→手动 `npm version`→再发」
  的一轮往返；不加该开关时仍只打印三选一提示、不改 `package.json`。
- `docs/PUBLISH.md` 的「升级版本」与参数示例补 `-Bump`，六步表中的 5/6 说明同步。
- 新增 `scripts/push-retry.ps1` + `push-retry.cmd`：`git push` 被中间设备间歇性重置时
  自动重试（默认 6 次，退避 2/4/6/8/8/8 秒）。只对「Recv failure / Connection reset /
  Could not connect / timed out / early EOF / RPC failed」重试，遇到认证或分叉错误立刻停并给出处置建议；
  推送前先看 `rev-list --count`，已同步就直接退出。
- `docs/PUBLISH.md` 新增「网络不稳怎么办」：用 `ls-remote` / `-c http.sslBackend=openssl` /
  假凭据 push 三种探针区分「链路瞬断」「TLS 后端」「真的没登录」，并给出换 SSH 通道与
  网页上传两条退路；报错表补 `Recv failure: Connection was reset` 一行。
- `scripts/push-retry.ps1` 定位到失败的真因并自愈：本机的 DNS 会在几个地址间轮换，
  其中有些地址能完成 TCP 握手却卡住 TLS 握手，git 于是等 ~21 秒后报
  `Recv failure: Connection was reset`。脚本现在每次重试前先 `ipconfig /flushdns`
  再打印新的解析结果（新增 `Get-RemoteHost` / `Get-ResolvedAddress` / `Reset-DnsCache`），
  清缓存失败时提示需要管理员权限而不是硬报错。
- `docs/PUBLISH.md` 的「网络不稳怎么办」新增「先查 DNS」小节：怎么查当前解析、
  `ipconfig /flushdns` 前后 `git ls-remote` 从 21 秒超时变成 1.7 秒成功的实测，
  以及两个别再试的方向（`http.curloptResolve` 在本机 git 上直接报
  `Unsupported SSL backend`；hosts 需要管理员记事本，沙箱写不了）。
  报错表里的 `Recv failure` 一行也从「链路过载」改成 DNS 的解释。
- `scripts/push-retry.ps1` 补上真正管用的那条路：**走本地代理**。实测解析到的
  GitHub 边缘节点 `20.6.7.17`（确属 GitHub 官方网段 `20.6.7.16/28`）TCP 能连、
  TLS 握手一直超时，连清 6 次 DNS 缓存都没换地址；而 `127.0.0.1:7897` 的 Clash
  代理 1 秒内就让 `git ls-remote` 成功。脚本现在依次探测
  `7897` / `7890` / `10809` / `10808` / `1080` / `8889` / `8080`，找到就自动
  `-c http.proxy=<代理>` 推送；新增 `-Proxy` 指定与 `-NoProxy` 禁用两个开关，
  `-DryRun` 会一并打印会用哪个代理。
- `docs/PUBLISH.md` 的「网络不稳」一节改写成「先判断是地址不对还是这条路不通」：
  给出三个边缘节点的握手实测对照表、代理验证命令、假凭据探针，并写明
  `http.curloptResolve` 与 `http.proxy` 不能同时用（会报 `Unsupported SSL backend`）。
- `scripts/push-retry.ps1` 改为**优先用 git config 里的 `http.proxy`**（显示 `(git config)`），
  没有再自动探测端口；`-NoProxy` 现在会用 `-c http.proxy=` 真正覆盖掉仓库级配置（之前只是不探测，
  配置里的代理仍然生效）；`-Proxy` 指定的端口没人监听时给出提醒。
- `docs/PUBLISH.md` 新增「一劳永逸：把代理写进 git config」：`git config --local http.proxy`
  的配法、验证、撤销，以及「代理客户端必须开着」「临时直连用 `-NoProxy`」两个注意事项。

### 新增

- **插件素材与商店信息**：新增 `assets/` —— 图标 PNG（`icon.png` 180×180、
  `icon-512.png` 512×512，均由 `icon.svg` 的几何重绘在品牌蓝渐变底上）与四张界面截图
  （模式切换 / 迁移重建 / 迁移历史 / 设置页，由真实组件渲染，非手绘）。
  新增 `screenshots.json`（四个相对路径，供插件市场按清单取图）。
  `package.json` 的 `icon` 改为 `./assets/icon.png`：宿主 `iconOf()` 支持
  SVG / PNG / JPEG / WebP 且上限 256 KiB，而社区插件列表只接受 GitHub 托管的位图；
  `exports` 保留 `./icon`（现在指向 PNG）并补 `./icon.svg` 以兼容旧引用。
  `files` 补 `assets` 与 `screenshots.json`，`npm pack` 由 37 文件涨到 44 文件。
- `README.md` 新增「界面预览」区（图标 + 四张截图的两行表格）与目录结构里的
  `assets/` / `screenshots.json` 说明。
- `scripts/publish-npm.ps1` 的发布前校验同步：必需文件清单补 `assets/icon.png` 与
  `screenshots.json`，图标体积检查从只看 `icon.svg` 改成 `icon.svg` 与 `assets/icon.png`
  两个都查（宿主 `iconOf()` 现在读的是 PNG）。
- `docs/PUBLISH.md` 的「方案 C 网页拖拽上传」文件清单补 `assets/` 与 `screenshots.json`。

- **右键菜单也能「迁移重建」**（0.1.7）：之前右键只有软切换，而「没有活着的 Agent」「已归档」
  这类会话恰恰是软切换做不了、只能迁移重建的 —— 用户只能先点进面板、切到「迁移重建」页签、
  选模式、再确认一次。现在会话右键菜单里多了一条「迁移重建」二级菜单，展开就是所有模式，
  点一下直接发起迁移，不用离开左侧会话列表。
  - 与「切换模式」并列成两条独立贡献（`mode-exchange.migrate`，order 351），
    同样覆盖 `session` 与 `sessionHeader` 两个 target，所以会话行和标题「更多」菜单里都能看到。
  - **不看 `switchable`**：切换入口在「没有活 Agent / 已归档 / 子代理」时会全部置灰，
    迁移入口在这些情况下仍然可点 —— 这正是它存在的意义。只有模式本身装配失败（`broken`）才置灰。
  - **当前模式也可选**：迁移的常见用法是「同一个模式重建一遍」（清掉坏的运行态），
    所以不像切换那样把当前模式标灰，只在标签后加「（当前）」。
  - 菜单里没法弹二次确认框，所以点模式即视为确认（`confirmDelete: true` 越过台账对同一会话的
    幂等拦截）；其余参数一律取设置页里配好的默认值（归档旧会话 / 团队协作 / 保留导出副本），
    不在菜单里另开入口。
  - 发起后把 `jobId` 写进面板 store（新增 `jobSessionId` 记住归属会话），面板一打开就自动
    切到这条会话的「迁移重建」页签并接着轮询进度；提示条还带一个「查看进度」按钮，
    点了直接选中本插件面板（`layout.selectPanel('mode-exchange')`），布局服务缺席时静默降级。
  - 迁移进行中所有模式叶子置灰并多一条「迁移进行中…」说明，防止重复点发起第二次。
    标记写进菜单快照而不是模块级变量，这样 `observe` 会触发重新解析，菜单下次打开就是灰的。
  - `scripts/smoke-menu.mjs` 扩到 A–H 十组场景（新增迁移参数取配置、`jobId` 交接、
    「查看进度」跳转、迁移中禁用与恢复、不可切换的会话仍可迁移两段）；
    `scripts/smoke-render.mjs` 的断言改为「两个入口 × 两个 target = 四条贡献」。
  - 新增 `scripts/smoke-handoff.mjs`（并入 `npm run smoke`，现共九套）：菜单与面板之间只靠
    store 里的 `{ job, jobSessionId }` 交接，这里用真实面板组件 + 手写 React 桩把整条链路跑一遍 ——
    面板停在 A 会话、菜单在 B 会话发起迁移时，面板要先切到 B 再接管任务，
    自动落到「迁移重建」页签开始轮询，任务跑完后清掉待接管标记。
    桩里 `setInterval` 换成了手动队列，否则定时器会把进程吊住、也测不到多轮轮询后的状态。

- **在会话上右键即可切换模式**（0.1.6）：宿主左侧会话列表的右键菜单里新增「切换模式」二级菜单，
  展开就是所有可用 Agent 模式，当前模式标「（当前）」并置灰、加载失败的 preset 置灰、
  点一下即完成软切换（等价于面板里的「应用切换」），结果通过宿主菜单的 toast 反馈
  （「已切换到「X」模式」/「切换失败：原因」）。会话不可切换时菜单里直接写出原因
  （没有活着的 Agent、已归档、子代理会话等），不再让人点进面板才发现点不动。
  - 实现是新模块 `src/client/menu.js`：向宿主的 `contextMenus` 服务注册两个 target ——
    `session`（会话行）与 `sessionHeader`（会话标题的「更多」菜单，带分隔线），
    order 取 350，正好落在宿主的「创建分支」(300) 与「复制会话 ID」(450) 之间；
    id 用 `mode-exchange.switch`，不会和宿主内置菜单撞名。
  - **解析必须是同步的**：宿主给每个菜单贡献 1000ms 的解析超时，超时就弹「加载失败」。
    所以模式清单与会话状态都在后台预取进闭包缓存（15 秒内复用），
    `resolve` 只读缓存拼菜单；冷启动时先给一条禁用的「正在读取模式…」占位项，
    刷新完成后下次打开右键菜单就变成可用列表。
  - **降级不拖垮插件**：`contextMenus` 没有写进 `inject` 列表，而是用
    `ctx.inject(['contextMenus'], …)` 等它就绪 —— 这是宿主 `dsh-client-ui-file-actions` 的官方写法。
    服务缺席（旧宿主 / 精简构建）时面板、设置页、命令照常工作，只是没有右键菜单。
  - 切换成功后会同步面板 store：如果改的正是面板当前打开的会话，
    面板上的「生效模式」立刻跟着变，不用重新拉一遍。
  - 注册失败不会连累插件：宿主对同一 target+id 抛 `Duplicate menu contribution`，
    这里把 `register` 包在 try/catch 里 —— 菜单缺席，但面板、设置页、命令照常。
  - 新增 `scripts/smoke-menu.mjs`（A–H 八组场景）并并入 `npm run smoke`：
    用与宿主 `registry.ts` 同构的桩跑「注册 → 解析 → 选中 → 执行」，
    覆盖常规、不可切换、切换失败、缺 contextMenus、就绪后补注册、状态接口失败、
    重复挂载幂等、宿主拒绝注册八条路径，并断言 `resolve` 不许返回 Promise。
  - `scripts/smoke-render.mjs` 补 `contextMenus` 桩与断言：
    `apply()` 之后必须注册 `session` 与 `sessionHeader` 两个 target。
- **面板不再只显示一串 session 编码**：用户无法从 `session-01a4…` 认出这是哪个对话。
  现在「当前会话状态」卡片的第一行是**会话标题**，短 id 退到第二行「会话 ID」并保留等宽字体；
  标题取自宿主客户端的 `sessions.list` 快照（`SessionSummary.displayTitle`），
  也就是左侧会话列表用的同一套回退链（durable title → 项目目录名 → id），和用户看到的名字完全一致。
  后端 `GET /state` 一直有返回 `title`，但面板从未把它写进 store —— 本条一并补上。
- **「模式切换」与「迁移重建」新增可折叠的「选择会话」窗口**：
  原本面板只能操作「当前打开的那个会话」，想切别的会话得先在左侧列表点进去。
  现在两个页签顶部各有一个 `details` 折叠选择器，展开后列出会话清单，
  每行是「标题 + 所属工作区名 · 短 id（· 运行中 / 已归档）」三级信息，当前项高亮并可一键关闭。
  默认值就是用户点进面板前最后停留的会话（宿主主视图会话），**不会把人从当前对话挪走**；
  只有宿主给不出主视图会话时才退回清单第一条。换会话会清掉上一个会话的切换/迁移结果，
  避免把旧结论套到新会话上。
- **「迁移重建」新增可折叠的「选择工作区」窗口**：新会话默认加入目标会话所在的工作区；
  会话没有归属时退回工作区清单第一条。选择器显示「工作区名 + 磁盘路径」，
  用户手动选过之后就不再被自动推断覆盖。
- **迁移目标工作区真正落到宿主侧**：新增 `src/host/roster.js` 聚合会话与工作区清单；
  `POST /migrate` 接受 `workspaceId`，`startMigration` 用它解析出目标 `cwd`（优先于源会话 cwd），
  `attachToWorkspace` 先按 id 精确挂载、失败再退回 0.1.4 的「按目录猜」逻辑；
  报告里 `target.workspaceId` / `target.workspaceTitle` 只在用户选了工作区时出现，
  没选时报告形状与 0.1.4 完全一致。
- **两条新 HTTP 路由**：`GET /api/mode-exchange/sessions`（会话清单：id / 标题 / cwd /
  所属工作区 / 运行态 / 归档态，默认最多 60 条，可选 `?limit=`）与
  `GET /api/mode-exchange/workspaces`（工作区清单：id / 标题 / 路径 / 会话列表）。
  两条都先做同源校验，服务缺失时降级为空清单而不是报错。
- `src/host/services.js` 的 `sessionTitleOf` 修正：宿主 `sessionTitle.get()` 要的是
  **Session 实例而不是 sessionId**，此前传 id 进去永远拿到 `undefined`，
  这才是面板只能显示短 id 的根因。现在先 `sessions.get(id)` 再 `sessionTitle.get(session)`，
  并兼容返回 `string` 与 `{ title }` 两种形状。
- 新增 `SessionBrief` / `WorkspaceBrief` 类型声明；`MigrateRequest` 与 `MigrationReport.target`
  补上可选的 `workspaceId` / `workspaceTitle`。
- `scripts/smoke-inject.mjs` / `scripts/smoke-apply.mjs` 的路由数断言同步到 12 条，
  `smoke-inject` 的裸服务名扫描列表补上 `workspaces`。
### 修复

- **进度卡的状态徽标显示成英文裸词**：面板 `statusLabel()` 只认 `in-progress`，
  而宿主 job 状态用的是 `running` / `pending` / `done` / `failed` / `cancelled`，
  于是迁移进行中时徽标直接渲染成 `running`。现在 `running` 与 `pending` 都映射到
  新增的 `history.statusRunning`（中文「进行中」/ 英文「Running」）。
- **四个标签把 i18n 占位符当字面量显示**：`switch.snapshotFrom` / `snapshotTo` /
  `snapshotAt` / `migrate.confirmMessages` 的值里带 `{from}` `{to}` `{at}` `{count}`，
  但调用点是把它们当**静态标签**传给 `Field` 的 `label`，界面上直接出现
  「切换前模式：{from}」。现在这四个键的值改为不含占位符的纯标签，数值仍由
  `Field` 的 `value` 单独渲染。

- **本地 link 安装的插件在重启后完全加载不起来**（0.1.4）：
  现象是插件管理器里显示「启用中」、组件却「未运行」，侧栏面板、设置页、命令、路由
  全部消失，红字只写「启动时没能加载」而不给原因。根因与业务代码无关：
  `src/host/config.js` 顶层 `import z from '@deepseek-ai/schemastery'`，
  而插件是以**符号链接**装进 profile 的（`dependencies` 里是
  `link:C:/.../plugin-create-mode`）。Node 按 realpath 解析，于是从仓库目录往上找
  `node_modules`，永远看不到 profile 里那份 schemastery；仓库一旦没有 `node_modules`
  （它本来就在 `.gitignore` 里），`import` 期即抛 `ERR_MODULE_NOT_FOUND`，
  `apply` 根本没执行。
  - 现在彻底删掉这条依赖：`Config` 改为手写的 standard-schema v1 对象
    （`{ '~standard': { version: 1, vendor: 'dsh-mode-exchange', validate } }`），
    带六个字段的类型校验与中文报错（如 `enableTeam 必须是布尔值`），通过后仍走
    `normalizeConfig` 补默认值。宿主 `resolveConfig` 只认 standard-schema
    （见 `.refs/cordis-fiber.ts` 的 `runtime.Config['~standard'].validate(config)`），
    不要求是 schemastery；代价仅是 `cordis_inspect` 的 JSON Schema 投影显示
    `unsupported`，不影响激活、`apply` 与配置校验。
  - `package.json` 删掉整个 `dependencies` 块（现在是零第三方运行时依赖），
    同步删除 `pnpm-lock.yaml` 与两个已无用的解析钩子
    （`scripts/schemastery-loader.mjs` / `scripts/schemastery-register.mjs`），
    四个 smoke 脚本里的 `import './schemastery-register.mjs'` 一并去掉。
  - `scripts/smoke-apply.mjs` 的断言跟着改：不再要求 `Config` 是函数，改为校验它是
    standard-schema 且 `validate` 会拒绝类型错误的字段、补齐六个默认值。
  - 新增 `scripts/smoke-imports.mjs`（已并入 `npm run smoke` 第一项）：静态扫描
    `index.js` 与 `src/host/*.js`，宿主侧代码只允许相对导入与 `node:` 内置模块，
    把「符号链接安装 + 裸包名」这个故障挡在提交前；扫描器自带自检
    （能抓到动态 `import()` 的裸包名、不误报注释与 URL），避免「恒空即通过」。
  - 验证方式是按宿主的真实加载路径复现：从 profile 的符号链接位置 import
    `index.js`，修前 `ERR_MODULE_NOT_FOUND`、修后
    `IMPORT OK [ 'Config', 'apply', 'describeSession', 'inject' ]`。
  - `docs/LOCAL-DEV.md` 的先决条件段与 `README.md` 的许可段同步写明
    「没有第三方运行时依赖、不需要仓库里有 `node_modules`」。

- **迁移的「导入」复核会撒谎，也会在慢盘上误杀**（0.1.3）：
  `verifyImport` 原来有两个隐患，一个报假成功、一个报假失败：
  - 拿不到 `sessionPersistence` 时直接 `return { ok: true, eventCount: expectedEventCount }`，
    报告里于是写着「1865 条原生事件已落盘」，而其实一个字都没读回来过 —— 这就是
    历史报告全是「第 4 步失败但 `imported: true` / `importedEventCount: 1865`」的来源；
    现在没有持久层一律判 `ok: false`，理由写清「无法确认新会话是否真的落盘」。
  - 宿主的 jsonl 后端是**惰性物化**的：`persistence.create()` 只在内存里登记，
    真正的文件要到首次 append/flush 才出现；命中的还是未物化句柄时，
    `read()` 会回 `{ eventState: 'detached', events: [] }`。旧代码把这 0 条当成
    「落盘失败」立刻判死。现在先看 `eventState`，再用 `stat()` 是否给出
    `location` / `sizeBytes` 区分「真落盘」与「只是登记」，并最多重试 3 次
    （间隔 `yieldToLoop(150)`）；只有始终没物化才判失败，且理由写明「尚未物化」。
  - `scripts/smoke-migrate.mjs` 相应补三个场景：D 前两次读回 detached、重试后仍成功；
    E 一直不物化必须判失败（不许假成功）；F 持久层没有 `open` 必须判失败。
- **迁移卡在第 4 步：`cannot get property "workspaceRegistry" without inject`**：
  迁移的四步（导入日志为历史上下文）已经成功、新会话也建好了，但紧接着的「挂载到工作区」
  在读取 `ctx?.workspaceRegistry` 时抛错 —— Cordis 的 `ctx` 是 Proxy，服务只要没写在本插件的
  `inject` 里，**属性访问本身**就抛异常，可选链 `?.` 挡不住（它只拦 null/undefined）。
  异常沿 `runJob` 冒到 catch，整次迁移被判失败（`target.attachedToWorkspace` 仍是 false），
  用户于是看到「第 4 步失败」却有一个已创建的新会话。现在：
  - 所有「可选服务」统一走 `serviceOf(ctx, name)`（非 strict 读 store + try/catch 包住属性访问）：
    `migrate.js` 的 `agents` / `agentPresets` / `sessionPersistence` / `agentDefaultModel` /
    `workspaceRegistry` / `agentTeams`，`export.js` 的 `sessionQuery` / `sessionPersistence`，
    `modes.js` 与 `switch.js` 的 `agentPresets`，`guard.js` 的 `tools`；
  - `migrate.js` 的「挂载工作区 / 启用团队 / 归档旧会话」三步各自再包一层 try/catch，
    失败只把对应 timeline 项标为未完成，**不再把整次迁移判失败**（新会话已经可用）；
  - `index.js` 新增 `installGuardWhenReady`：`tools` 就绪就直接装 guard，
    没就绪就 `ctx.inject(['tools'], …)` 等它出现 —— 此前 `installGuard` 在真实宿主里
    每次都在属性访问处抛错、被 catch 吞成空操作，**`tools.guard` 实际上从未装上**，
    软切换的工具拦截一直是失效的；
  - `probeCapabilities` 只缓存「五项能力全为真」的正结果：`apply` 阶段 `tools` /
    `agentTeams` / `workspaceRegistry` 常常还没就绪，负结果一旦被 WeakMap 记住，
    插件就会永远停在降级路径上。
- 新增 `scripts/smoke-migrate.mjs`：用「像 Cordis」的 mock ctx（未写在 inject 里的服务，
  属性访问一律抛错）真跑七步迁移，覆盖三种情形 —— 一切正常 / 挂载工作区失败 / 团队与归档失败，
  断言后两种仍然 `ok: true`。脚本开头先自检 mock 会抛错、`serviceOf` 能安全读到，
  避免模型失真导致「假通过」。
- `scripts/smoke-inject.mjs` 新增「场景 5：服务都已提供、但没写进 inject」与静态反模式扫描：
  逐行扫 `src/host/*.js`，出现 `ctx.<服务名>` / `ctx?.<服务名>`（除注释与 `agent.ctx` 外）即失败；
  扫描器自带正例/反例自检，防止规则写坏了恒为空。
- `package.json` 增加 `npm run smoke`（依次跑六个冒烟脚本），版本升到 `0.1.2`、`0.1.3`。
- **`scripts/publish-npm.ps1` 编辑后整篇报语法错**：文件原本带 UTF-8 BOM，用文本编辑工具
  改写时 BOM 被丢掉，PowerShell 5.1 于是按 ANSI(936) 解码中文注释，报出一串
  「表达式或语句中包含意外的标记 `}`」这类与内容无关的错误。已恢复 BOM，
  并在文档里记下「改带中文的 `.ps1` 后要检查文件头仍是 `EF BB BF`」。
- **插件在宿主里被标成「异常」：`cannot get property "connection" without inject`**：
  `src/host/routes.js` 用 `ctx.get('connection') ?? ctx.connection` 取 Web 宿主服务。
  真实 Cordis 里，服务只要没在本插件的 `inject` 里声明，属性访问就会直接抛
  `cannot get property "connection" without inject`；而 `ctx.get(name)` 默认 strict，
  服务提供方 fiber 尚未激活时同样返回 `undefined`。Connection 由 Web 组合在启动过程中
  较晚提供，于是 `??` 走到右侧就抛错，整个 `apply` 失败、插件卡显示「异常」，
  侧栏面板与命令一起消失。现在：
  - 统一改用 `serviceOf(ctx, name)`（非 strict 读 store + try/catch 包住属性访问），
    `routes.js` 的 `connection` / `configEditor`、`switch.js` 的 `systemPrompt` 都走它；
  - `connection` 还没就绪时交给 `ctx.inject(['connection'], …)`，服务可用后再注册路由；
    插件本身不等服务，命令照常可用；
  - 新增 `scripts/smoke-inject.mjs`：按真实 Cordis 语义（注入检查 + strict `get`）建模，
    复现「connection 晚到」并断言 `apply` 不抛错、服务就绪后 10 条路由全量注册。
- **设置页与面板白屏**：`src/client/ui.js` 里的共享组件原先写成「首参是 React」的工厂签名
  （如 `PanelHead(React, { title })`），而 `panel.js` / `settings.js` 用
  `h(PanelHead, props)` 把它们当普通 React 组件渲染 —— React 调用函数组件只传
  `(props, context)`，第二个形参解构 undefined 直接 TypeError，渲染即崩，
  宿主错误边界把内容吞掉，于是「设置 → 模式迁移」和侧栏面板都是空白。
  现在组件改为标准的 `(props)` 签名，React 实例由 `bindUiReact(React)` 在
  `entry.js` 入口处一次性绑定；未绑定时抛明确错误而不是静默白屏。
- 新增 `scripts/smoke-render.mjs`（`npm test`）：像宿主那样加载 `bundle.js`，
  用最小 React 桩把设置页、中央面板、图标真渲染一遍并断言关键文案，
  拦住「组件签名与调用方式不匹配」这类构建期发现不了的回归。

## [0.1.0] - 2026-11-19

首个可运行版本：从零实现，能力 A（运行时软切换）与能力 B（迁移重建）全部打通。

### 新增

#### 能力 A —— 运行时模式切换

- `/switch-mode <模式名>`：在当前会话内软切换 Agent 模式。
  - 通过 `system-prompt/assemble` 瀑布替换系统提示词 section；
  - 通过 `agent.ctx.tools.restrict({ deny })` 把「当前模式有、目标模式没有」的工具
    从声明与派发两侧一起移除；
  - 通过 `agent.ctx.tools.register()` + `when` 门控补挂「目标模式有、当前没有」的工具；
  - 全部改动挂在会话作用域上，不影响全局 profile 与其它会话。
- `/switch-mode --revert`：按切换前的入口快照回退（工具限制、补挂、提示词一起撤销）。
- `/switch-mode --list`：运行时枚举全部可用模式（来自 `agentPresets.list()`，零硬编码），
  标出当前模式、运行时默认模式与装配失败（broken）的模式。
- 切换快照落盘到 `<数据目录>/state/switches.json`，因此改设置触发插件重建后
  （`apply` 重新执行）软切换状态会被读回并重建。
- 会话级 `tools.guard` 兜底：即使有路径绕开 schema 直接派发，也会按会话被拒绝。
- 对不可切换的会话（不存在、已归档、子代理来源、无活 Agent、无作用域）给出具体中文原因，
  不静默失败。

#### 能力 B —— 迁移重建

- `/migrate-session --mode <模式> [--delete-old true|false] [--team on|off] [--note <备注>] [--yes] [--resume]`：
  严格按七步执行，每步可观测（面板显示当前步骤、耗时与逐步时间线）。
  1. 导出：`<导出目录>/exports/<YYYYMMDD-HHmmss>-<短ID>.jsonl` + `.meta.json`（含 sha256）。
  2. 校验：逐行可解析、事件数一致、`seq` 从 0 连续、sha256 匹配；失败即中止并保留现场。
  3. 创建：以目标模式作为 `agentPreset` 创建新会话，并在 `setup` 里 `agentPresets.mount()`
     装配该模式的插件组合。
  4. 导入：把导出的**原生事件序列**作为新会话的 constructor seed 写入
     （`seed = 源事件前缀 + session/end-seed{inherited:true} + 收尾事件`，
     `inheritedEventCount` 只计源事件），未闭合的 turn/step 自动补 `step/end`、`turn/end`，
     未拿到结果的工具调用补 `isError` 的 `tool/result`（`TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED`）。
  5. 团队：`--team on` 时对新会话的根 Agent 调 `agentTeams.setEnabled(true)` 并回读 `isEnabled` 复核。
  6. 归档：`--delete-old true` 时先备份再归档旧会话（见「已知限制」——DSH 没有删除会话的 API）。
  7. 报告：新旧会话 ID、日志路径、消息数、工具调用数、团队状态、旧会话处置结果、耗时、时间线。
- 幂等：台账 `<数据目录>/migrations/<源会话ID>.json` 按源会话记录进度。
  同一会话重复执行不会产生第二个新会话，而是返回「续跑 / 放弃」提示。
- 失败可回滚：新会话已建但导入复核失败时，新会话与日志文件都保留，
  报告里给出可手动完成的剩余步骤。
- 来源标记（FR-12）：新会话追加一条 user 消息，记录「由会话 X 于时间 T 迁移而来、
  原模式 A → 新模式 B」，并附带 `--note` 内容。
- 导出副本保留策略：`keepExportCopy=false` 时，成功结束后删除导出文件；失败时一律保留。

#### 界面

- 侧栏面板（`sidebar.panellist` + `main`，id/key 均为 `mode-exchange`）：
  - 「切换」页签：当前会话、当前生效模式、可否切换、目标模式下拉 + 应用/回退按钮、
    入口快照卡片、软切换警示；
  - 「迁移」页签：目标模式、归档旧会话开关（默认开）、团队协作开关（不支持时置灰并说明原因）、
    备注输入、执行按钮、取消按钮、续跑卡片、七步进度与耗时、报告卡片；
  - 「历史」页签：迁移记录列表（时间、源会话、目标会话、结果），可查看报告详情、
    一键打开目标会话。
  - 归档确认对话框展示旧会话标题、消息数、日志路径，并提供「先备份」开关。
- 设置页（`settings.section` + `settings.section.icon`）：默认目标模式、默认是否归档旧会话、
  默认是否启用团队协作、日志导出目录、是否保留导出日志副本、是否在迁移前强制确认
  （关闭时二次警告）。

#### 命令与接口

- `/switch-mode`、`/migrate-session` 两个命令（`ctx.commands.register`）。
- `/api/mode-exchange/*` 十条 HTTP 路由（`ctx.connection.fetch.register`）：
  `GET /state`、`POST /switch`、`POST /revert`、`POST /migrate`、`GET /job`、
  `POST /cancel`、`GET /migrations`、`GET /report`、`POST /archive-old`、`POST /config`。
  统一 `{ ok: true, value }` / `{ ok: false, error: { code, message } }` 信封，带同源校验。

#### 工程

- 零依赖客户端打包器 `scripts/build-client.mjs`（`src/client/*.js` → `src/client/bundle.js`），
  不引入 esbuild，不需要 install 脚本。
- `scripts/probe.js`：校验 manifest、exports、icon、locale、bundle 产物与 profile 挂载状态。
- TypeScript 类型声明 `types/index.d.ts`、`types/client.d.ts`。
- 中英双语 locale（`locale/zh.json`、`locale/en.json`），详情页 `docs/DETAIL.md`、`docs/DETAIL.en.md`。
- 本地加载与调试说明 `docs/LOCAL-DEV.md`。

### 已知限制

- **能力 A 是「软切换」**：插件组合、工具执行器（native / PTC `run_code` 传输层）、
  子代理与团队都不会随切换改变。目标模式若只差「有哪些工具、提示词怎么写」，软切换够用；
  若差在工具如何执行（PTC 就是这类），只有能力 B 能给到真行为。
- **FR-9 的「删除旧会话」实现为归档**：DSH 没有删除会话的 API，
  只有 `archiveSession` / `unarchiveSession` / `pinSession`；`workspaceRegistry.delete()`
  删的是工作区而非会话。归档后会话从分组与置顶列表隐藏、活动被停止，
  但会话日志文件仍在磁盘上，可用 `unarchiveSession` 反悔。
- **归档可能延后**：`/migrate-session` 跑在旧会话的 Agent 里，当场归档自己会打断工作，
  因此实现为「先尝试停止活动再归档；若宿主要求当前回合结束后才能停，则排期重试」，
  报告里标记为「已排期」。
- **FR-1 的 Tab 补全无法做成结构化候选**：宿主 `CommandInputDescriptor` 只有 `hint` 字符串，
  没有参数级枚举字段。替代方案是把运行时枚举结果写进 hint、`--list` 与错误文案，
  交互式选择由侧栏面板的下拉框承担。
- **团队协作开关有约束**：`agentTeams.setEnabled` 只接受 root Session 的活 Agent，
  且新值在「下一次 step 准备」时才影响工具可见性。运行时探测不到该能力时，
  面板置灰并说明原因，报告记「未启用 + 原因」而不伪造成功。