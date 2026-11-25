/**
 * dsh-mode-exchange 客户端产物 —— 由 scripts/build-client.mjs 生成，请勿手工编辑。
 * 源文件：src/client/{i18n.js, ui.js, api.js, store.js, panel.js, settings.js, menu.js, entry.js}。
 * 生成时间：构建时写入，不参与逻辑；如需重新生成请运行 `node scripts/build-client.mjs`。
 */
window.__ModuleLoader__.load({
  id: "dsh-mode-exchange",
  factory: function factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
    'use strict';
/* ---- i18n.js ---- */
const __mod_i18n = (() => {
/**
 * 客户端文案表。所有面向用户的文字都在这里集中管理，并提供 t() 取值函数。
 *
 * 说明：宿主推荐通过 Client locale 服务注册文案，但该服务的 bind() 返回结构
 * 未在公开契约中固定，因此这里以本文件的字典作为唯一事实来源，同时在
 * entry.js 里尽力把同一份字典注册进 locale 服务（注册失败只记日志，不影响界面）。
 */

const NS = 'mode-exchange'

const ZH = {
  'panel.title': '模式迁移',
  'panel.subtitle': '切换当前会话的 Agent 模式，或迁移到新模式重建会话',
  'panel.close': '收起面板',
  'panel.tab.switch': '模式切换',
  'panel.tab.migrate': '迁移重建',
  'panel.tab.history': '迁移历史',

  'common.loading': '加载中…',
  'common.refresh': '刷新',
  'common.cancel': '取消',
  'common.confirm': '确认',
  'common.close': '关闭',
  'common.copy': '复制',
  'common.copied': '已复制',
  'common.none': '无',
  'common.unknown': '未知',
  'common.yes': '是',
  'common.no': '否',
  'common.working': '处理中…',
  'common.elapsed': '已耗时 {value}',

  'session.current': '当前会话',
  'session.mode': '生效模式',
  'session.modeFallback': '（未记录）',
  'session.switchable': '可切换',
  'session.notSwitchable': '不可切换',
  'session.notSwitchableReason': '原因：{reason}',
  'session.id': '会话 ID',

  'picker.session': '会话',
  'picker.workspace': '工作区',
  'picker.sessionLabel': '要操作的会话',
  'picker.workspaceLabel': '新会话的工作区',
  'picker.sessionHint': '默认选中你最近打开的那个会话',
  'picker.workspaceHint': '新会话会加入选中的工作区',
  'picker.noSessions': '还没有可选的会话',
  'picker.noWorkspaces': '还没有工作区',
  'picker.running': '运行中',
  'picker.archived': '已归档',
  'picker.live': '进行中',
  'picker.noTitle': '未命名会话',

  'menu.switch': '切换模式',
  'menu.currentMode': '{mode}（当前）',
  'menu.loading': '正在读取模式…',
  'menu.noModes': '没有可用的模式',
  'menu.blocked': '不可切换：{reason}',
  'menu.switched': '已切换到「{mode}」模式',
  'menu.failed': '切换失败：{reason}',
  'menu.migrate': '迁移重建',
  'menu.migrating': '正在迁移「{mode}」…',
  'menu.migratingItem': '迁移进行中…',
  'menu.migrateStarted': '已开始迁移到「{mode}」',
  'menu.migrateResume': '这个会话有未完成的迁移，请到面板里继续',
  'menu.migrateFailed': '迁移失败：{reason}',
  'menu.viewProgress': '查看进度',
  'menu.panelUnavailable': '打不开面板，请从侧栏手动打开「模式迁移」',

  'switch.statusTitle': '当前会话状态',
  'switch.heading': '运行时模式切换',
  'switch.softNotice': '说明：这是「软切换」——工具集在运行时按会话重新限制，系统提示词被替换；宿主的插件装配不会重建。',
  'switch.target': '目标模式',
  'switch.apply': '应用切换',
  'switch.applying': '正在切换…',
  'switch.revert': '回退到切换前',
  'switch.reverting': '正在回退…',
  'switch.snapshot': '已有切换快照',
  'switch.snapshotFrom': '切换前模式',
  'switch.snapshotTo': '切换后模式',
  'switch.snapshotAt': '切换时间',
  'switch.denied': '已拒绝的旧模式工具（{count} 个）：{names}',
  'switch.noneDenied': '没有需要拒绝的旧模式工具',
  'switch.selectModeFirst': '请先选择目标模式',
  'switch.sameMode': '目标模式与当前模式相同',
  'switch.success': '已切换至「{mode}」模式，工具集已变更。',
  'switch.reverted': '已回退到「{mode}」模式。',

  'migrate.heading': '迁移重建',
  'migrate.intro': '导出当前会话日志 → 以新模式创建新会话 → 把日志作为原生历史导入 → 可选启用团队协作 → 可选归档旧会话。',
  'migrate.target': '目标模式',
  'migrate.deleteOld': '完成后归档旧会话',
  'migrate.deleteOldHint': '宿主没有「删除会话」接口，此操作以「归档」实现：会话从界面隐藏并停止活动，日志文件仍保留在磁盘。',
  'migrate.team': '为新会话启用智能体团队协作',
  'migrate.teamUnsupported': '当前宿主未暴露团队协作开关，此项已禁用',
  'migrate.note': '备注（写入新会话首条上下文）',
  'migrate.notePlaceholder': '例如：从 standard 迁到 ptc，继续上一轮的调查',
  'migrate.run': '开始迁移',
  'migrate.running': '迁移进行中…',
  'migrate.confirmTitle': '确认迁移并归档旧会话？',
  'migrate.confirmBody': '即将把会话「{title}」迁移到「{mode}」模式。',
  'migrate.confirmMessages': '当前消息数',
  'migrate.confirmLog': '日志将导出到：{path}',
  'migrate.confirmIrreversible': '归档旧会话后，它不会出现在会话列表中（日志仍在磁盘，可由宿主恢复）。',
  'migrate.confirmBackup': '归档前先备份日志',
  'migrate.confirmOk': '确认迁移',
  'migrate.resumeTitle': '检测到未完成的迁移',
  'migrate.resumeBody': '上次迁移停在「{step}」这一步。可以继续执行，或放弃这次迁移记录。',
  'migrate.resumeContinue': '继续上次迁移',
  'migrate.resumeAbandon': '放弃这次记录',
  'migrate.finished': '迁移完成',
  'migrate.failed': '迁移失败',
  'migrate.cancelled': '迁移已取消',
  'migrate.step': '步骤 {index}/{total} · {name}',
  'migrate.cancel': '取消迁移',
  'migrate.source': '源会话',
  'migrate.target2': '新会话',
  'migrate.logPath': '日志路径',
  'migrate.messageCount': '消息数',
  'migrate.targetWorkspace': '新会话工作区',
  'migrate.targetWorkspaceAuto': '已自动加入（按目录匹配）',
  'migrate.targetWorkspaceNone': '未加入任何工作区',
  'migrate.teamEnabled': '团队协作',
  'migrate.teamOn': '已启用',
  'migrate.teamOff': '未启用',
  'migrate.teamReason': '未启用的原因：{reason}',
  'migrate.oldArchived': '旧会话已归档',
  'migrate.oldKept': '旧会话未归档（已保留）',
  'migrate.oldReason': '说明：{reason}',
  'migrate.backupPath': '备份路径',
  'migrate.timeline': '执行时间线',
  'migrate.remaining': '剩余可手动完成的步骤',
  'migrate.openTarget': '打开新会话',
  'migrate.openTargetFailed': '无法自动切换会话，请从左侧会话列表手动打开 {id}',
  'migrate.failureReason': '失败原因：{reason}',
  'migrate.reportFile': '报告文件：{path}',

  'steps.export.name': '导出会话日志',
  'steps.verify.name': '校验导出文件',
  'steps.create.name': '创建新会话',
  'steps.import.name': '导入历史到新会话',
  'steps.team.name': '启用团队协作',
  'steps.archive.name': '归档旧会话',
  'steps.report.name': '生成迁移报告',

  'history.heading': '迁移历史',
  'history.empty': '还没有迁移记录',
  'history.emptyHint': '在「迁移重建」页开始一次迁移后，这里会列出历史记录与报告。',
  'history.time': '时间',
  'history.source': '源会话',
  'history.target': '新会话',
  'history.result': '结果',
  'history.action': '报告',
  'history.viewReport': '查看报告',
  'history.statusRunning': '进行中',
  'history.statusInProgress': '进行中',
  'history.statusDone': '已完成',
  'history.statusFailed': '失败',
  'history.statusCancelled': '已取消',
  'history.modeArrow': '{from} → {to}',

  'settings.title': '模式迁移',
  'settings.description': '切换与迁移的默认行为',
  'settings.defaultMode': '默认目标模式',
  'settings.defaultModeHint': '留空表示跟随宿主当前的默认模式',
  'settings.deleteOld': '默认归档旧会话',
  'settings.team': '默认启用团队协作',
  'settings.teamHint': '宿主不支持时该项不生效',
  'settings.exportDir': '日志导出目录',
  'settings.exportDirHint': '留空表示使用工作区内的 .dsh/mode-exchange',
  'settings.keepExportCopy': '保留导出日志副本',
  'settings.groupBehavior': '默认行为',
  'settings.groupExport': '导出与备份',
  'settings.groupSafety': '安全确认',
  'settings.deleteOldHint': '迁移成功并且新会话可用后，把旧会话归档',
  'settings.keepExportCopyHint': '关闭后迁移结束即删除导出的中间日志，只保留备份',
  'settings.confirmHint': '关闭后归档旧会话不再二次确认，建议保持开启',
  'settings.confirm': '迁移前强制确认',
  'settings.autoOpenTarget': '迁移后自动打开新会话',
  'settings.autoOpenTargetHint': '迁移成功就把窗口切到新建的会话，并把它置顶到会话列表顶部',
  'settings.confirmWarn': '关闭后，归档旧会话将不再弹窗确认。确定要关闭吗？',
  'settings.save': '保存设置',
  'settings.saving': '正在保存…',
  'settings.saved': '设置已保存',
  'settings.failed': '保存失败：{reason}',
  'settings.followDefault': '跟随宿主默认',

  'error.network': '无法连接宿主：{reason}',
  'error.badResponse': '宿主返回了无法解析的响应',
  'error.unknown': '发生未知错误',
}

const EN = {
  'panel.title': 'Mode Exchange',
  'panel.subtitle': 'Switch the Agent mode of this session, or rebuild it in a new mode',
  'panel.close': 'Collapse panel',
  'panel.tab.switch': 'Switch',
  'panel.tab.migrate': 'Migrate',
  'panel.tab.history': 'History',

  'common.loading': 'Loading…',
  'common.refresh': 'Refresh',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.none': 'None',
  'common.unknown': 'Unknown',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.working': 'Working…',
  'common.elapsed': '{value} elapsed',

  'session.current': 'Current session',
  'session.mode': 'Active mode',
  'session.modeFallback': '(not recorded)',
  'session.switchable': 'Switchable',
  'session.notSwitchable': 'Not switchable',
  'session.notSwitchableReason': 'Reason: {reason}',
  'session.id': 'Session ID',

  'picker.session': 'Session',
  'picker.workspace': 'Workspace',
  'picker.sessionLabel': 'Session to operate on',
  'picker.workspaceLabel': 'Workspace for the new session',
  'picker.sessionHint': 'Defaults to the session you opened last',
  'picker.workspaceHint': 'The new session joins the selected workspace',
  'picker.noSessions': 'No sessions yet',
  'picker.noWorkspaces': 'No workspaces yet',
  'picker.running': 'Running',
  'picker.archived': 'Archived',
  'picker.live': 'Live',
  'picker.noTitle': 'Untitled session',

  'menu.switch': 'Switch mode',
  'menu.currentMode': '{mode} (current)',
  'menu.loading': 'Reading modes…',
  'menu.noModes': 'No modes available',
  'menu.blocked': 'Not switchable: {reason}',
  'menu.switched': 'Switched to "{mode}"',
  'menu.failed': 'Switch failed: {reason}',
  'menu.migrate': 'Migrate & rebuild',
  'menu.migrating': 'Migrating to "{mode}"…',
  'menu.migratingItem': 'Migration in progress…',
  'menu.migrateStarted': 'Migration to "{mode}" started',
  'menu.migrateResume': 'This session has an unfinished migration — continue it in the panel',
  'menu.migrateFailed': 'Migration failed: {reason}',
  'menu.viewProgress': 'View progress',
  'menu.panelUnavailable': 'Cannot open the panel — open "Mode Exchange" from the sidebar',

  'switch.statusTitle': 'Current session',
  'switch.heading': 'Runtime mode switch',
  'switch.softNotice': 'This is a soft switch: the tool set is re-restricted at runtime and the system prompt is replaced, but the host plugin composition is not rebuilt.',
  'switch.target': 'Target mode',
  'switch.apply': 'Apply switch',
  'switch.applying': 'Switching…',
  'switch.revert': 'Revert',
  'switch.reverting': 'Reverting…',
  'switch.snapshot': 'Switch snapshot',
  'switch.snapshotFrom': 'From mode',
  'switch.snapshotTo': 'To mode',
  'switch.snapshotAt': 'Switched at',
  'switch.denied': 'Denied tools from the old mode ({count}): {names}',
  'switch.noneDenied': 'No old-mode tool needed denying',
  'switch.selectModeFirst': 'Pick a target mode first',
  'switch.sameMode': 'The target mode is already active',
  'switch.success': 'Switched to "{mode}"; the tool set changed.',
  'switch.reverted': 'Reverted to "{mode}".',

  'migrate.heading': 'Migrate & rebuild',
  'migrate.intro': 'Export this session log, create a session in the new mode, import the log as native history, optionally enable Team, optionally archive the old session.',
  'migrate.target': 'Target mode',
  'migrate.deleteOld': 'Archive the old session when done',
  'migrate.deleteOldHint': 'There is no delete-session API; this archives instead — the session leaves the UI and stops activity, and its log stays on disk.',
  'migrate.team': 'Enable Team mode for the new session',
  'migrate.teamUnsupported': 'This host exposes no Team switch, so this option is disabled',
  'migrate.note': 'Note (written as the new session first context)',
  'migrate.notePlaceholder': 'e.g. moved from standard to ptc to continue the investigation',
  'migrate.run': 'Start migration',
  'migrate.running': 'Migration running…',
  'migrate.confirmTitle': 'Migrate and archive the old session?',
  'migrate.confirmBody': 'Session "{title}" will be migrated to the "{mode}" mode.',
  'migrate.confirmMessages': 'Current message count',
  'migrate.confirmLog': 'Log will be exported to: {path}',
  'migrate.confirmIrreversible': 'Once archived, the old session no longer appears in the list (its log stays on disk and the host can restore it).',
  'migrate.confirmBackup': 'Back up the log before archiving',
  'migrate.confirmOk': 'Migrate',
  'migrate.resumeTitle': 'An unfinished migration exists',
  'migrate.resumeBody': 'The previous migration stopped at "{step}". Continue it, or drop the record.',
  'migrate.resumeContinue': 'Continue',
  'migrate.resumeAbandon': 'Drop the record',
  'migrate.finished': 'Migration finished',
  'migrate.failed': 'Migration failed',
  'migrate.cancelled': 'Migration cancelled',
  'migrate.step': 'Step {index}/{total} · {name}',
  'migrate.cancel': 'Cancel migration',
  'migrate.source': 'Source',
  'migrate.target2': 'New session',
  'migrate.logPath': 'Log path',
  'migrate.messageCount': 'Messages',
  'migrate.targetWorkspace': 'Target workspace',
  'migrate.targetWorkspaceAuto': 'Auto-attached by directory',
  'migrate.targetWorkspaceNone': 'Not attached to any workspace',
  'migrate.teamEnabled': 'Team',
  'migrate.teamOn': 'Enabled',
  'migrate.teamOff': 'Disabled',
  'migrate.teamReason': 'Not enabled because: {reason}',
  'migrate.oldArchived': 'Old session archived',
  'migrate.oldKept': 'Old session kept',
  'migrate.oldReason': 'Note: {reason}',
  'migrate.backupPath': 'Backup path',
  'migrate.timeline': 'Timeline',
  'migrate.remaining': 'Remaining manual steps',
  'migrate.openTarget': 'Open new session',
  'migrate.openTargetFailed': 'Could not switch sessions automatically; open {id} from the session list',
  'migrate.failureReason': 'Reason: {reason}',
  'migrate.reportFile': 'Report file: {path}',

  'steps.export.name': 'Export session log',
  'steps.verify.name': 'Verify export',
  'steps.create.name': 'Create new session',
  'steps.import.name': 'Import history',
  'steps.team.name': 'Enable Team',
  'steps.archive.name': 'Archive old session',
  'steps.report.name': 'Write report',

  'history.heading': 'Migration history',
  'history.empty': 'No migrations yet',
  'history.emptyHint': 'Start a migration on the Migrate tab and its record and report will be listed here.',
  'history.time': 'Time',
  'history.source': 'Source',
  'history.target': 'New session',
  'history.result': 'Result',
  'history.action': 'Report',
  'history.viewReport': 'View report',
  'history.statusRunning': 'Running',
  'history.statusInProgress': 'In progress',
  'history.statusDone': 'Done',
  'history.statusFailed': 'Failed',
  'history.statusCancelled': 'Cancelled',
  'history.modeArrow': '{from} → {to}',

  'settings.title': 'Mode Exchange',
  'settings.description': 'Defaults for switching and migrating',
  'settings.defaultMode': 'Default target mode',
  'settings.defaultModeHint': 'Leave empty to follow the host default',
  'settings.deleteOld': 'Archive the old session by default',
  'settings.team': 'Enable Team by default',
  'settings.teamHint': 'Ignored when the host has no Team switch',
  'settings.exportDir': 'Log export directory',
  'settings.exportDirHint': 'Leave empty to use .dsh/mode-exchange in the workspace',
  'settings.keepExportCopy': 'Keep the exported log copy',
  'settings.groupBehavior': 'Defaults',
  'settings.groupExport': 'Export & backup',
  'settings.groupSafety': 'Safety confirmation',
  'settings.deleteOldHint': 'Archive the old session once migration succeeds and the new session is usable',
  'settings.keepExportCopyHint': 'Turn off to delete the intermediate export log after migration; only the backup is kept',
  'settings.confirmHint': 'Turn off to skip the extra confirmation when archiving; keeping it on is safer',
  'settings.confirm': 'Require confirmation before migrating',
  'settings.autoOpenTarget': 'Open the new session after migrating',
  'settings.autoOpenTargetHint': 'Switch the main view to the rebuilt session and pin it to the top of the list',
  'settings.confirmWarn': 'When off, archiving the old session stops asking. Turn it off?',
  'settings.save': 'Save settings',
  'settings.saving': 'Saving…',
  'settings.saved': 'Settings saved',
  'settings.failed': 'Save failed: {reason}',
  'settings.followDefault': 'Follow host default',

  'error.network': 'Cannot reach the host: {reason}',
  'error.badResponse': 'The host returned an unparsable response',
  'error.unknown': 'Unexpected error',
}

const DICTS = { zh: ZH, en: EN }

let current = ZH

/** 选择语言；未知语言回退中文。 */
function setLocale(language) {
  const key = String(language || '').toLowerCase()
  current = DICTS[key.split('-')[0]] || ZH
  return current
}

/** 把同一份字典注册进 Client locale 服务；失败不抛错。 */
function registerLocale(ctx) {
  try {
    const locale = ctx.get('locale')
    if (locale && typeof locale.register === 'function') {
      locale.register(NS, { zh: ZH, en: EN })
    }
  } catch (error) {
    // 文案仍有本地字典兜底，注册失败只降级不报错。
    void error
  }
}

/** 取文案；缺失时回退中文再回退 key。 */
function t(key, vars) {
  let text = current[key] || ZH[key] || key
  if (vars === undefined) return text
  for (const [name, value] of Object.entries(vars)) {
    text = text.split('{' + name + '}').join(String(value))
  }
  return text
}

  return {
    NS,
    ZH,
    EN,
    DICTS,
    setLocale,
    registerLocale,
    t,
  };
})();

/* ---- ui.js ---- */
const __mod_ui = (() => {
/**
 * 共享 UI 原子组件与样式表。
 * 所有组件都只用 React.createElement 构造，不依赖宿主内部组件库，
 * 避免版本差异导致的白屏。
 *
 * 视觉语言对齐宿主 dsh-client-ui-theme：文字/描边/圆角/动效取自 --dsw-* 语义 token，
 * 形状照抄宿主的卡片（.5px 描边 + radius-xl）与设置行（label 与值分列）。
 * 但「面」的底色由插件自己给：皮肤（如 blue-fantasy）会把 --dsw-alias-bg-layer-* 改成半透明，
 * 直接拿来当卡片底会让壁纸细节透到文字下面，所以表面色走自有的 --me-surface*。
 */

const THEME = {
  panelWidth: 380,
  gap: 12,
  radius: 12,
}

/**
 * 宿主 React 实例。组件用模块级绑定而不是每个组件都收 React 参数 ——
 * 之前那种「首参是 React」的工厂签名，一旦被 h(Component, props) 当组件渲染，
 * React 只会传 (props, context)，第二个参数解构即崩，整页白屏。
 */
let ReactRef = null

/** 绑定宿主 React；必须在任何组件渲染前调用一次。 */
function bindUiReact(React) {
  ReactRef = React
}

/** 组件内部的 createElement；未绑定时直接抛错，别再静默白屏。 */
function h() {
  if (ReactRef === null) {
    throw new Error('dsh-mode-exchange: UI 组件未绑定 React（请先调用 bindUiReact(React)）')
  }
  return ReactRef.createElement.apply(ReactRef, arguments)
}

/** 返回面板样式表（字符串）。所有类名带 dsh-me- 前缀，避免污染宿主样式。 */
function styleCss() {
  return `
/* ---------------------------------------------------------------------------
   设计依据：宿主 packages/client/ui-theme 的语义 token + 官方《DSH 统一圆角规范》
   (docs/ui-radius.zh.md) 与《Web UI 样式参考》(docs/web-styling.zh.md)。
   约定：
   · 颜色只取 --dsw-alias-* 语义 token，字面量仅作 token 缺失时的兜底；
   · 「面」在语义底色上自己叠一层：向 #fff 混 = 抬升，向 #000 混 = 下沉，
     这样浅色/深色/皮肤三套外观都不用写主题选择器；
   · 中性描边一律 .5px；胶囊与正圆一律配 corner-shape: round（超级椭圆会削平它们）；
   · 滚动条交给宿主的共享样式，组件内不写 ::-webkit-scrollbar。
--------------------------------------------------------------------------- */
.dsh-me-root {
  /* 文字 */
  --me-fg: var(--dsw-alias-label-primary, #15171a);
  --me-fg-2: var(--dsw-alias-label-secondary, #454a52);
  --me-fg-3: var(--dsw-alias-label-tertiary, #6b7280);
  --me-fg-4: var(--dsw-alias-label-caption, #9aa1ab);
  --me-on-solid: var(--dsw-alias-label-on-color, #fff);
  /* 描边 */
  --me-line-1: var(--dsw-alias-border-l1, rgba(0, 0, 0, .04));
  --me-line-2: var(--dsw-alias-border-l2, rgba(0, 0, 0, .1));
  --me-line-3: var(--dsw-alias-border-l3, rgba(0, 0, 0, .12));
  --me-line-4: var(--dsw-alias-border-l4, rgba(0, 0, 0, .16));
  --me-line-sel: var(--dsw-alias-border-selected, rgba(0, 0, 0, .24));
  /* 面：底色来自宿主，明暗自动跟随 */
  --me-base: var(--dsw-alias-bg-layer-2, #fff);
  --me-raise: color-mix(in srgb, var(--me-base) 97%, #fff);
  --me-sunken: color-mix(in srgb, var(--me-base) 96%, #000);
  --me-card-fill: color-mix(in srgb, var(--me-base) 98.5%, #fff);
  --me-surface: color-mix(in srgb, var(--me-base) 94%, transparent);
  --me-tip-fill: var(--dsw-alias-specific-tip, var(--me-sunken));
  /* 语义色 */
  --me-hover: var(--dsw-alias-interactive-bg-hover, rgba(38, 49, 72, .06));
  --me-press: var(--dsw-alias-interactive-bg-active, rgba(38, 49, 72, .1));
  --me-accent: var(--dsw-alias-state-business-primary, #4176e6);
  --me-accent-soft: var(--dsw-alias-state-business-tertiary, rgba(65, 118, 230, .12));
  --me-ok: var(--dsw-alias-state-success-primary, #22c55e);
  --me-warn: var(--dsw-alias-state-warn-primary, #f59e0b);
  --me-warn-label: var(--dsw-alias-state-warn-label, #b45309);
  --me-error: var(--dsw-alias-state-error-primary, #ec1313);
  --me-ease: var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
  --me-snap: var(--ds-transition-duration-fast, .1s);
  --me-t: var(--ds-transition-duration, .2s);

  display: flex;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 16px 16px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--me-fg);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif);
  font-size: 13px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  /* 高层表面：border 0 + elevation（阴影自带发丝描边），不与 alias-border 配对 */
  max-width: 760px;
  margin-inline: auto;
  border-radius: var(--dsw-radius-xl, 20px);
  background: var(--me-surface);
  box-shadow: var(
    --dsw-elevation-panel,
    0 0 0 .5px rgba(15, 17, 21, .06),
    0 1px 2px rgba(15, 17, 21, .05),
    0 12px 32px rgba(15, 17, 21, .08)
  );
  -webkit-backdrop-filter: blur(24px) saturate(1.1);
  backdrop-filter: blur(24px) saturate(1.1);
}
.dsh-me-root *,
.dsh-me-root *::before,
.dsh-me-root *::after { box-sizing: border-box; }
/* 主区页面：宿主已给出页面底色，内容列按页面排版（对齐设置页的 720 内容列），
   不再在页面里再浮一张带阴影的卡片。 */
.dsh-me-root[data-surface="page"] {
  max-width: 760px;
  padding: 20px 20px 32px;
  gap: 16px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
/* 设置页：宿主给内边距，插件只排内容，不再自垫一层「面」。 */
.dsh-me-root[data-flat="true"] {
  height: auto;
  max-width: 720px;
  padding: 0;
  overflow: visible;
  gap: 20px;
  margin-inline: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* ---------- 标题区 ---------- */
.dsh-me-head { display: flex; align-items: flex-start; gap: 10px; padding: 2px 2px 0; }
.dsh-me-headtext { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.dsh-me-title {
  margin: 0;
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  letter-spacing: -.005em;
  color: var(--me-fg);
}
.dsh-me-sub { margin: 0; font-size: 12px; line-height: 18px; color: var(--me-fg-3); overflow-wrap: anywhere; }
.dsh-me-head[data-size="lg"] { padding: 0; gap: 0; }
.dsh-me-head[data-size="lg"] .dsh-me-headtext { gap: 4px; }
.dsh-me-head[data-size="lg"] .dsh-me-title { font-size: 18px; line-height: 26px; letter-spacing: -.01em; }
.dsh-me-head[data-size="lg"] .dsh-me-sub { font-size: 13px; line-height: 20px; }
.dsh-me-iconbtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: -2px -4px 0 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--me-fg-3);
  font: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background var(--me-snap) var(--me-ease), color var(--me-snap) var(--me-ease);
}
.dsh-me-iconbtn:hover:not(:disabled) { background: var(--me-hover); color: var(--me-fg); }
.dsh-me-iconbtn:active:not(:disabled) { background: var(--me-press); }
.dsh-me-iconbtn:disabled { opacity: .4; cursor: not-allowed; }

/* ---------- 分段页签：R12 槽 + 4px 内衬 + R8 项（宿主 SegmentedControl 规则） ---------- */
.dsh-me-tabs {
  /* 主区很宽时页签不该被拉成三条大长条，按内容需要的宽度封顶 */
  max-width: 460px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 2px;
  padding: 4px;
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--me-sunken);
}
.dsh-me-tab {
  appearance: none;
  min-width: 0;
  height: 28px;
  margin: 0;
  padding: 0 8px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--me-fg-3);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 28px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background var(--me-snap) var(--me-ease), color var(--me-snap) var(--me-ease), box-shadow var(--me-snap) var(--me-ease);
}
/* 侧栏拖窄时三个中文标签仍完整可读 */
@media (max-width: 340px) {
  .dsh-me-tab { padding: 0 4px; font-size: 12px; }
}
.dsh-me-tab:hover { color: var(--me-fg); }
.dsh-me-tab[data-active="true"] {
  background: var(--me-raise);
  color: var(--me-fg);
  box-shadow: 0 0 0 .5px var(--me-line-1), 0 1px 2px rgba(15, 17, 21, .1);
}

/* ---------- 卡片 / 分组：R20 + .5px 描边（设置卡片材质） ---------- */
.dsh-me-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border: .5px solid var(--me-line-4);
  border-radius: var(--dsw-radius-xl, 20px);
  background: var(--me-card-fill);
  box-shadow: none;
  transition: border-color var(--me-t) var(--me-ease), background var(--me-t) var(--me-ease);
}

/* 卡片内部一律「行列表」形态：卡片自身不内衬，每个字段/开关/选择器各占一行，
   行与行用 .5px 分隔线串起来（宿主 GeneralSection 的行式列表）。这样密集的表单
   不会像一叠横条被卡片边框切断，面板与设置页也共用同一套观感。 */
.dsh-me-card > .dsh-me-divider { display: none; }
.dsh-me-card > * { min-width: 0; padding: 14px 16px; }
.dsh-me-card > * + * { border-top: .5px solid var(--me-line-2); }
.dsh-me-card > .dsh-me-stack-sm { padding: 0; }
.dsh-me-card > .dsh-me-stack-sm > * { padding: 14px 16px; }
.dsh-me-card > .dsh-me-stack-sm > * + * { border-top: .5px solid var(--me-line-2); }
/* 行高优先级要压过组件自身的紧凑内衬（.dsh-me-toggle 的 padding: 2px 0） */
.dsh-me-card > .dsh-me-toggle,
.dsh-me-card > .dsh-me-stack-sm > .dsh-me-toggle { padding: 14px 16px; }
.dsh-me-card > .dsh-me-footer { padding: 12px 16px; }
/* 提示条在卡片里不画自己的左右边框，改成一整条通栏底色带（上边线沿用行分隔线） */
.dsh-me-card > .dsh-me-notice {
  padding: 12px 16px;
  border-left-width: 0;
  border-right-width: 0;
  border-bottom-width: 0;
  border-radius: 0;
}
/* 提示条本身已是卡片首行时，不要再叠一条上边线（会和卡片描边重合变粗） */
.dsh-me-card > .dsh-me-notice:first-child { border-top-width: 0; }
/* 卡片里只有一个选择器时把它压平，避免「R20 卡片 → 内衬 → R16 选择器」三层边框 */
.dsh-me-card > .dsh-me-picker { padding: 0; border: 0; border-radius: 0; background: transparent; }
.dsh-me-card > .dsh-me-picker > .dsh-me-pickersummary {
  min-height: 46px;
  padding: 13px 16px;
  border-radius: 0;
}
.dsh-me-card > .dsh-me-picker > .dsh-me-pickerbody { margin: 0 10px; }
/* 压平后的选择器不带自己的边框，相邻行之间仍要留一条分隔线 */
.dsh-me-card > .dsh-me-picker + .dsh-me-picker,
.dsh-me-card > .dsh-me-divider + .dsh-me-picker { border-top: .5px solid var(--me-line-2); }
.dsh-me-card > .dsh-me-picker > .dsh-me-pickerhint { padding: 0 16px 12px; }
.dsh-me-card[data-tone="accent"] {
  border-color: var(--me-line-sel);
  background: var(--me-card-fill);
}
.dsh-me-card[data-tone="warn"] { border-color: color-mix(in srgb, var(--me-warn) 45%, transparent); }
.dsh-me-card[data-tone="error"] { border-color: color-mix(in srgb, var(--me-error) 42%, transparent); }
.dsh-me-section { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.dsh-me-sectionhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; padding: 0 2px; }
.dsh-me-sectiontitle {
  margin: 0;
  font-size: 12px;
  line-height: 17px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--me-fg-3);
}
.dsh-me-stack { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dsh-me-stack-sm { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.dsh-me-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.dsh-me-divider { height: 0; margin: 0; border: 0; border-top: .5px solid var(--me-line-2); }

/* ---------- 行 / 字段 ---------- */
.dsh-me-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }
.dsh-me-row-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-me-field { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
.dsh-me-fieldlabel { flex: none; font-size: 12px; line-height: 18px; color: var(--me-fg-3); }
.dsh-me-fieldvalue {
  min-width: 0;
  text-align: right;
  font-size: 13px;
  line-height: 20px;
  color: var(--me-fg);
  overflow-wrap: anywhere;
}
.dsh-me-label { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--me-fg); }
.dsh-me-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--me-fg-3); overflow-wrap: anywhere; }
.dsh-me-dim { color: var(--me-fg-3); }
.dsh-me-code {
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
  line-height: 17px;
  font-variant-numeric: tabular-nums;
  color: var(--me-fg-2);
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* ---------- 提示条 ---------- */
.dsh-me-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border: .5px solid var(--me-line-2);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--me-tip-fill);
  color: var(--me-fg-2);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.dsh-me-noticedot {
  flex: none;
  width: 6px;
  height: 6px;
  margin-top: 6px;
  border-radius: 50%;
  corner-shape: round;
  background: var(--me-fg-4);
}
.dsh-me-noticetext { min-width: 0; }
.dsh-me-notice[data-kind="ok"] {
  border-color: color-mix(in srgb, var(--me-ok) 28%, transparent);
  background: color-mix(in srgb, var(--me-ok) 10%, var(--me-card-fill));
}
.dsh-me-notice[data-kind="ok"] .dsh-me-noticedot { background: var(--me-ok); }
.dsh-me-notice[data-kind="warn"] {
  border-color: color-mix(in srgb, var(--me-warn) 32%, transparent);
  background: color-mix(in srgb, var(--me-warn) 12%, var(--me-card-fill));
}
.dsh-me-notice[data-kind="warn"] .dsh-me-noticedot { background: var(--me-warn); }
.dsh-me-notice[data-kind="error"] {
  border-color: color-mix(in srgb, var(--me-error) 26%, transparent);
  background: color-mix(in srgb, var(--me-error) 8%, var(--me-card-fill));
}
.dsh-me-notice[data-kind="error"] .dsh-me-noticedot { background: var(--me-error); }

/* ---------- 表单控件：H32 / R12 ---------- */
.dsh-me-control { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-me-controllabel { font-size: 12px; line-height: 18px; font-weight: 500; color: var(--me-fg-2); }
.dsh-me-selectwrap { position: relative; display: block; min-width: 0; }
.dsh-me-selectwrap::after {
  content: "";
  position: absolute;
  top: 50%;
  right: 13px;
  width: 6px;
  height: 6px;
  margin-top: -5px;
  border-right: 1.4px solid var(--me-fg-3);
  border-bottom: 1.4px solid var(--me-fg-3);
  transform: rotate(45deg);
  pointer-events: none;
}
.dsh-me-select,
.dsh-me-input,
.dsh-me-textarea {
  width: 100%;
  min-width: 0;
  height: 32px;
  margin: 0;
  padding: 0 11px;
  border: .5px solid var(--me-line-2);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--me-sunken);
  color: var(--me-fg);
  font: inherit;
  font-size: 13px;
  line-height: 30px;
  outline: none;
  transition: border-color var(--me-snap) var(--me-ease), background var(--me-snap) var(--me-ease);
}
.dsh-me-select { appearance: none; padding-right: 30px; cursor: pointer; }
.dsh-me-textarea {
  height: auto;
  min-height: 64px;
  padding: 8px 11px;
  line-height: 1.55;
  resize: vertical;
}
.dsh-me-select:hover:not(:disabled),
.dsh-me-input:hover:not(:disabled),
.dsh-me-textarea:hover:not(:disabled) { border-color: var(--me-line-3); }
.dsh-me-select:focus,
.dsh-me-input:focus,
.dsh-me-textarea:focus {
  border-color: var(--me-line-sel);
  background: var(--me-raise);
}
.dsh-me-select:disabled,
.dsh-me-input:disabled,
.dsh-me-textarea:disabled { opacity: .5; cursor: not-allowed; }
.dsh-me-input::placeholder,
.dsh-me-textarea::placeholder { color: var(--me-fg-4); }

/* ---------- 开关：34x20 轨道 + 14 滑块 ---------- */
.dsh-me-toggle {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  padding: 2px 0;
  cursor: pointer;
}
.dsh-me-toggle[data-disabled="true"] { opacity: .5; cursor: not-allowed; }
.dsh-me-toggletext { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dsh-me-togglelabel { font-size: 13px; line-height: 20px; color: var(--me-fg); }
.dsh-me-togglehint { font-size: 12px; line-height: 17px; color: var(--me-fg-3); overflow-wrap: anywhere; }
.dsh-me-switch {
  flex: none;
  appearance: none;
  position: relative;
  width: 34px;
  height: 20px;
  margin: 1px 0 0;
  padding: 0;
  border: .5px solid var(--me-line-3);
  border-radius: 999px;
  corner-shape: round;
  background: var(--me-sunken);
  cursor: pointer;
  transition: background var(--me-snap) var(--me-ease), border-color var(--me-snap) var(--me-ease);
}
.dsh-me-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  corner-shape: round;
  background: var(--dsw-alias-switch-thumb, var(--me-raise));
  box-shadow: 0 1px 2px rgba(0, 0, 0, .2);
  transition: transform var(--me-snap) var(--me-ease);
}
.dsh-me-switch:checked { background: var(--me-accent); border-color: transparent; }
.dsh-me-switch:checked::after { transform: translateX(14px); background: var(--me-on-solid); }
.dsh-me-switch:disabled { opacity: .45; cursor: not-allowed; }

/* ---------- 按钮：md = H36/R12，sm = H28/R8 ---------- */
.dsh-me-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  margin: 0;
  padding: 0 14px;
  border: .5px solid var(--me-line-3);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--me-raise);
  color: var(--me-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--me-snap) var(--me-ease), border-color var(--me-snap) var(--me-ease), color var(--me-snap) var(--me-ease), opacity var(--me-snap) var(--me-ease);
}
.dsh-me-button:hover:not(:disabled) { background: var(--me-hover); }
.dsh-me-button:active:not(:disabled) { background: var(--me-press); }
.dsh-me-button:disabled { opacity: .45; cursor: not-allowed; }
.dsh-me-button[data-variant="primary"] {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill, var(--me-fg));
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.dsh-me-button[data-variant="primary"]:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover, var(--me-fg));
}
.dsh-me-button[data-variant="primary"]:active:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover, var(--me-fg));
}
.dsh-me-button[data-variant="danger"] {
  border-color: color-mix(in srgb, var(--me-error) 40%, transparent);
  background: transparent;
  color: var(--me-error);
}
.dsh-me-button[data-variant="danger"]:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger, color-mix(in srgb, var(--me-error) 8%, transparent)); }
.dsh-me-button[data-variant="ghost"] { border-color: transparent; background: transparent; color: var(--me-fg-2); }
.dsh-me-button[data-variant="ghost"]:hover:not(:disabled) { background: var(--me-hover); color: var(--me-fg); }
.dsh-me-button[data-size="sm"] {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm, 8px);
  font-size: 12px;
}

/* ---------- 步骤：左侧带连接线的时间轴 ---------- */
.dsh-me-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
.dsh-me-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 5px 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--me-fg-4);
  transition: color var(--me-snap) var(--me-ease);
}
.dsh-me-step::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 24px;
  bottom: -3px;
  width: 1px;
  background: var(--me-line-2);
}
.dsh-me-step:last-child::before { display: none; }
.dsh-me-stepdot {
  position: relative;
  z-index: 1;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  margin-top: 1px;
  border: .5px solid var(--me-line-3);
  border-radius: 50%;
  corner-shape: round;
  background: var(--me-raise);
  color: transparent;
  font-size: 9px;
  line-height: 1;
}
.dsh-me-steptext { display: flex; align-items: baseline; gap: 6px; min-width: 0; flex-wrap: wrap; }
.dsh-me-step[data-state="active"] { color: var(--me-fg); font-weight: 500; }
.dsh-me-step[data-state="active"] .dsh-me-stepdot {
  border-color: var(--me-accent);
  background: var(--me-raise);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--me-accent) 14%, transparent);
}
.dsh-me-step[data-state="done"] { color: var(--me-fg-2); }
.dsh-me-step[data-state="done"] .dsh-me-stepdot {
  border-color: transparent;
  background: var(--me-ok);
  color: var(--me-on-solid);
}
.dsh-me-step[data-state="failed"] { color: var(--me-error); }
.dsh-me-step[data-state="failed"] .dsh-me-stepdot {
  border-color: transparent;
  background: var(--me-error);
  color: var(--me-on-solid);
}

/* ---------- 表格 / 历史 / 列表 / 徽标 ---------- */
.dsh-me-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dsh-me-table th {
  padding: 0 6px 6px;
  border-bottom: .5px solid var(--me-line-2);
  color: var(--me-fg-4);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .04em;
  text-align: left;
  white-space: nowrap;
}
.dsh-me-table td {
  padding: 8px 6px;
  border-bottom: .5px solid var(--me-line-1);
  vertical-align: top;
  color: var(--me-fg-2);
}
.dsh-me-table tr:last-child td { border-bottom: none; }
.dsh-me-history { display: flex; flex-direction: column; }
.dsh-me-historyrow {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 11px 10px;
  margin: 0 -10px;
  border-bottom: .5px solid var(--me-line-1);
  border-radius: var(--dsw-radius-md, 12px);
  transition: background var(--me-snap) var(--me-ease);
}
.dsh-me-historyrow:hover { background: var(--me-hover); border-bottom-color: transparent; }
.dsh-me-historyrow:last-child { border-bottom: none; padding-bottom: 3px; }
.dsh-me-historyhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.dsh-me-historytitle {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--me-fg);
}
.dsh-me-historymeta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11.5px;
  line-height: 16px;
  color: var(--me-fg-4);
}
.dsh-me-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  line-height: 18px;
  color: var(--me-fg-3);
}
.dsh-me-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border: .5px solid var(--me-line-2);
  border-radius: 999px;
  corner-shape: round;
  background: transparent;
  font-size: 11px;
  line-height: 17px;
  font-weight: 500;
  color: var(--me-fg-2);
  white-space: nowrap;
}
.dsh-me-badge[data-tone="ok"] {
  border-color: color-mix(in srgb, var(--me-ok) 34%, transparent);
  background: color-mix(in srgb, var(--me-ok) 10%, transparent);
  color: color-mix(in srgb, var(--me-ok) 78%, var(--me-fg));
}
.dsh-me-badge[data-tone="warn"] {
  border-color: color-mix(in srgb, var(--me-warn) 38%, transparent);
  background: color-mix(in srgb, var(--me-warn) 12%, transparent);
  color: var(--me-warn-label);
}
.dsh-me-badge[data-tone="error"] {
  border-color: color-mix(in srgb, var(--me-error) 34%, transparent);
  background: color-mix(in srgb, var(--me-error) 9%, transparent);
  color: var(--me-error);
}
.dsh-me-badge[data-tone="idle"] { border-color: var(--me-line-2); color: var(--me-fg-3); }

/* ---------- 空状态 ---------- */
.dsh-me-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 16px;
  border: .5px dashed var(--me-line-3);
  border-radius: var(--dsw-radius-lg, 16px);
  text-align: center;
  color: var(--me-fg-3);
}
.dsh-me-emptyicon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 2px;
  border-radius: 50%;
  corner-shape: round;
  background: var(--me-sunken);
  color: var(--me-fg-3);
}
.dsh-me-emptytitle { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--me-fg-2); }
.dsh-me-emptydesc { font-size: 12px; line-height: 18px; max-width: 260px; color: var(--me-fg-3); }
.dsh-me-spacer { flex: 1 1 auto; }
.dsh-me-details summary {
  cursor: pointer;
  padding: 4px 0;
  font-size: 12px;
  color: var(--me-fg-2);
  list-style: none;
}
.dsh-me-details summary::-webkit-details-marker { display: none; }
.dsh-me-details summary::before {
  content: "\\25B8";
  display: inline-block;
  margin-right: 5px;
  color: var(--me-fg-4);
  transition: transform var(--me-snap) var(--me-ease);
}
.dsh-me-details summary:hover { color: var(--me-fg); }
.dsh-me-details[open] summary::before { transform: rotate(90deg); }

/* ---------- 折叠选择器：外层 R16 + 4px 内衬 + R8 选项 ---------- */
.dsh-me-picker {
  border: .5px solid var(--me-line-4);
  border-radius: var(--dsw-radius-lg, 16px);
  background: var(--me-card-fill);
  transition: border-color var(--me-t) var(--me-ease);
}
.dsh-me-picker[open] { border-color: var(--me-line-sel); }
.dsh-me-pickersummary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: inherit;
  cursor: pointer;
  list-style: none;
  transition: background var(--me-snap) var(--me-ease);
}
.dsh-me-pickersummary::-webkit-details-marker { display: none; }
.dsh-me-pickersummary:hover { background: var(--me-hover); }
.dsh-me-pickerchevron {
  flex: none;
  display: inline-flex;
  color: var(--me-fg-4);
  transition: transform var(--me-snap) var(--me-ease);
}
.dsh-me-picker[open] .dsh-me-pickerchevron { transform: rotate(90deg); color: var(--me-fg-3); }
.dsh-me-pickerlabel { flex: none; font-size: 12px; line-height: 18px; color: var(--me-fg-3); }
.dsh-me-pickervalue {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: right;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: var(--me-fg);
}
.dsh-me-pickervalue[data-empty="true"] { font-weight: 400; color: var(--me-fg-4); }
.dsh-me-pickerbody {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 6px;
  padding: 6px 0 8px;
  border-top: .5px solid var(--me-line-2);
}
.dsh-me-pickerlist {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 232px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.dsh-me-option {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  font: inherit;
  text-align: left;
  color: var(--me-fg-2);
  cursor: pointer;
  transition: background var(--me-snap) var(--me-ease), color var(--me-snap) var(--me-ease);
}
.dsh-me-option:hover { background: var(--me-hover); }
.dsh-me-option[data-active="true"] {
  background: var(--me-accent-soft);
  color: var(--me-fg);
}
.dsh-me-optionhead { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-me-optiontitle {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 19px;
}
.dsh-me-optionmeta {
  font-size: 11.5px;
  line-height: 16px;
  color: var(--me-fg-4);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-me-optionmark { flex: none; font-size: 11px; color: var(--me-accent); }
.dsh-me-pickerhint { padding: 0 12px 10px; }

/* ---------- 焦点环（宿主 focus.css 规范） ---------- */
.dsh-me-root :focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--me-accent));
  outline-offset: 1px;
}
/* 鼠标点击不显示焦点环（宿主 input-modality 约定） */
html[data-input-modality="pointer"] .dsh-me-root .dsh-me-button:focus-visible,
html[data-input-modality="pointer"] .dsh-me-root .dsh-me-tab:focus-visible,
html[data-input-modality="pointer"] .dsh-me-root .dsh-me-iconbtn:focus-visible,
html[data-input-modality="pointer"] .dsh-me-root .dsh-me-option:focus-visible { outline-color: transparent; }

@media (prefers-reduced-motion: reduce) {
  .dsh-me-root *,
  .dsh-me-root *::before,
  .dsh-me-root *::after { transition-duration: 0s !important; }
}
`
}

const STYLE_ID = 'dsh-mode-exchange/ui.css'

/** 样式文本只拼一次（模板串很大，避免每次渲染重复构造）。 */
let cssCache = null
function styleText() {
  if (cssCache === null) cssCache = styleCss()
  return cssCache
}

/**
 * 把样式表作为 React 元素渲染进组件树 —— 宿主 UI 插件规范认可的做法，
 * 组件卸载即自动移除；不依赖宿主的 styles 服务（该服务在 Web 宿主里并不存在）。
 */
function StyleTag() {
  return h('style', { 'data-plugin-css': STYLE_ID }, styleText())
}

/**
 * 兜底：直接贴一份到 document.head（宿主自带插件 dsh-free-search / dsh-ops 都是这个路子），
 * 按 data-plugin-css 去重，重复调用无副作用。
 * 这样即使面板 / 设置页还没渲染过，样式也已经生效。
 */
function ensureGlobalStyle() {
  try {
    if (typeof document === 'undefined' || !document.head) return null
    const selector = 'style[data-plugin-css="' + STYLE_ID + '"]'
    if (document.head.querySelector(selector) !== null) return null
    const tag = document.createElement('style')
    tag.setAttribute('data-plugin-css', STYLE_ID)
    tag.textContent = styleText()
    document.head.appendChild(tag)
    return tag
  } catch (error) {
    void error
    return null
  }
}

/** 移除 ensureGlobalStyle() 贴上的那一份（插件卸载时调用）。 */
function dropGlobalStyle(tag) {
  try {
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
  } catch (error) {
    void error
  }
}

/** 标题 + 副标题 + 右侧关闭按钮；size = 'lg' 用于设置页（对齐宿主的 18px 区块标题）。 */
function PanelHead({ title, subtitle, onClose, closeLabel, size }) {
  return h('div', { className: 'dsh-me-head', 'data-size': size },
    h('div', { className: 'dsh-me-headtext' },
      h('h2', { className: 'dsh-me-title' }, title),
      subtitle ? h('p', { className: 'dsh-me-sub' }, subtitle) : null,
    ),
    onClose
      ? h('button', {
        type: 'button',
        className: 'dsh-me-iconbtn',
        title: closeLabel,
        'aria-label': closeLabel,
        onClick: onClose,
      }, '\u00d7')
      : null,
  )
}

/** 小图标按钮（26x26）。 */
function IconButton({ children, onClick, title, disabled }) {
  return h('button', {
    type: 'button',
    className: 'dsh-me-iconbtn',
    title,
    'aria-label': title,
    disabled: disabled === true,
    onClick: typeof onClick === 'function' ? onClick : undefined,
  }, children)
}

/** 一段提示文本；kind = note | ok | warn | error 决定圆点与底色。 */
function Notice({ kind = 'note', children }) {
  if (children === undefined || children === null || children === '') return null
  return h('p', { className: 'dsh-me-notice', 'data-kind': kind },
    h('span', { className: 'dsh-me-noticedot' }),
    h('span', { className: 'dsh-me-noticetext' }, children),
  )
}

/** 一行「标签 + 值」。 */
function Field({ label, value, mono }) {
  const text = value === undefined || value === null || value === '' ? '\u2014' : String(value)
  return h('div', { className: 'dsh-me-field' },
    h('span', { className: 'dsh-me-fieldlabel' }, label),
    h('span', { className: mono ? 'dsh-me-fieldvalue dsh-me-code' : 'dsh-me-fieldvalue' }, text),
  )
}

/** 卡片容器；tone = warn | error 时描边换成状态色。 */
function Card({ children, tone }) {
  return h('div', { className: 'dsh-me-card', 'data-tone': tone }, children)
}

/** 分组：小标题（可带右侧操作）+ 内容。 */
function Section({ title, action, children }) {
  return h('section', { className: 'dsh-me-section' },
    title
      ? h('div', { className: 'dsh-me-sectionhead' },
        h('span', { className: 'dsh-me-sectiontitle' }, title),
        action || null,
      )
      : null,
    children,
  )
}

/** 分段页签；options 为 [{ value, label }]。 */
function Tabs({ value, options, onChange }) {
  const items = Array.isArray(options) ? options : []
  return h('div', { className: 'dsh-me-tabs', role: 'tablist' },
    items.map(item => h('button', {
      key: String(item.value),
      type: 'button',
      role: 'tab',
      className: 'dsh-me-tab',
      'data-active': item.value === value ? 'true' : 'false',
      'aria-selected': item.value === value ? 'true' : 'false',
      onClick: () => { if (typeof onChange === 'function') onChange(item.value) },
    }, item.label)),
  )
}

/** 状态徽标；tone = ok | warn | error | idle。 */
function Badge({ children, tone }) {
  return h('span', { className: 'dsh-me-badge', 'data-tone': tone }, children)
}

/** 空状态：图标 + 标题 + 说明。 */
function EmptyState({ title, hint, icon }) {
  return h('div', { className: 'dsh-me-empty' },
    icon ? h('span', { className: 'dsh-me-emptyicon' }, icon) : null,
    title ? h('div', { className: 'dsh-me-emptytitle' }, title) : null,
    hint ? h('div', { className: 'dsh-me-emptydesc' }, hint) : null,
  )
}

/** 下拉框；options 为 [{ value, label, disabled?, hint? }]。 */
function Select({ label, value, options, onChange, disabled, hint }) {
  const items = Array.isArray(options) ? options : []
  return h('label', { className: 'dsh-me-control' },
    label ? h('span', { className: 'dsh-me-controllabel' }, label) : null,
    h('span', { className: 'dsh-me-selectwrap' },
      h('select', {
        className: 'dsh-me-select',
        value: value === undefined || value === null ? '' : String(value),
        disabled: disabled === true,
        onChange(event) {
          if (typeof onChange === 'function') onChange(event.target.value)
        },
      },
      items.map(option => h('option', {
        key: String(option.value),
        value: String(option.value),
        disabled: option.disabled === true,
        title: option.hint,
      }, option.label)),
      ),
    ),
    hint ? h('span', { className: 'dsh-me-hint' }, hint) : null,
  )
}

/** 单行输入。 */
function TextField({ label, value, onChange, placeholder, hint, disabled, mono }) {
  return h('label', { className: 'dsh-me-control' },
    label ? h('span', { className: 'dsh-me-controllabel' }, label) : null,
    h('input', {
      className: mono ? 'dsh-me-input dsh-me-code' : 'dsh-me-input',
      type: 'text',
      value: value === undefined || value === null ? '' : String(value),
      placeholder,
      disabled: disabled === true,
      onChange(event) {
        if (typeof onChange === 'function') onChange(event.target.value)
      },
    }),
    hint ? h('span', { className: 'dsh-me-hint' }, hint) : null,
  )
}

/** 多行输入。 */
function TextArea({ label, value, onChange, placeholder, hint, disabled }) {
  return h('label', { className: 'dsh-me-control' },
    label ? h('span', { className: 'dsh-me-controllabel' }, label) : null,
    h('textarea', {
      className: 'dsh-me-textarea',
      value: value === undefined || value === null ? '' : String(value),
      placeholder,
      disabled: disabled === true,
      onChange(event) {
        if (typeof onChange === 'function') onChange(event.target.value)
      },
    }),
    hint ? h('span', { className: 'dsh-me-hint' }, hint) : null,
  )
}

/** 开关行：文案在左、开关在右。 */
function Toggle({ label, checked, onChange, disabled, hint, title }) {
  return h('label', {
    className: 'dsh-me-toggle',
    title,
    'data-disabled': disabled === true ? 'true' : 'false',
  },
  h('span', { className: 'dsh-me-toggletext' },
    h('span', { className: 'dsh-me-togglelabel' }, label),
    hint ? h('span', { className: 'dsh-me-togglehint' }, hint) : null,
  ),
  h('input', {
    className: 'dsh-me-switch',
    type: 'checkbox',
    checked: checked === true,
    disabled: disabled === true,
    onChange(event) {
      if (typeof onChange === 'function') onChange(event.target.checked)
    },
  }),
  )
}

/** 按钮；variant = primary | danger | ghost，size = md | sm。 */
function Button({ children, onClick, disabled, variant, size, title, type }) {
  return h('button', {
    type: type || 'button',
    className: 'dsh-me-button',
    'data-variant': variant || undefined,
    'data-size': size || undefined,
    disabled: disabled === true,
    title,
    onClick: typeof onClick === 'function' ? onClick : undefined,
  }, children)
}

/** 七步进度列表；items 为 [{ key, label, state, detail? }]。 */
function StepList({ items }) {
  const list = Array.isArray(items) ? items : []
  return h('ul', { className: 'dsh-me-steps' },
    list.map(item => h('li', { key: item.key, className: 'dsh-me-step', 'data-state': item.state },
      h('span', { className: 'dsh-me-stepdot' },
        item.state === 'done' ? '\u2713' : item.state === 'failed' ? '\u2715' : ''),
      h('span', { className: 'dsh-me-steptext' },
        h('span', null, item.label),
        item.detail ? h('span', { className: 'dsh-me-dim' }, item.detail) : null,
      ),
    )),
  )
}

/**
 * 折叠选择器：摘要行常显「当前值」，展开后是候选列表（单选）。
 *
 * 摘要行不随展开收起而丢失上下文——这正是用户要的「先看清楚再改」；
 * 列表为空时给一行提示，而不是渲染空盒子。
 *
 * @param {{
 *   label: string,
 *   value?: string,
 *   valueLabel?: string,
 *   options: Array<{ value: string, label: string, meta?: string, badge?: any, title?: string }>,
 *   open?: boolean,
 *   onOpenChange?: (open: boolean) => void,
 *   onChange?: (value: string) => void,
 *   disabled?: boolean,
 *   empty?: string,
 *   hint?: string,
 *   icon?: any,
 * }} props
 */
function Picker({ label, value, valueLabel, options, open, onOpenChange, onChange, disabled, empty, hint, icon }) {
  const items = Array.isArray(options) ? options : []
  const current = items.find(item => String(item.value) === String(value))
  const shown = valueLabel !== undefined && valueLabel !== null && valueLabel !== ''
    ? String(valueLabel)
    : current !== undefined && current.label !== undefined && current.label !== null
      ? String(current.label)
      : ''
  return h('details', {
    className: 'dsh-me-picker',
    open: open === true,
    onToggle(event) {
      if (typeof onOpenChange !== 'function') return
      const next = Boolean(event && event.currentTarget && event.currentTarget.open)
      onOpenChange(next)
    },
  },
  h('summary', { className: 'dsh-me-pickersummary', title: hint },
    h('span', { className: 'dsh-me-pickerchevron' },
      icon || h('svg', {
        width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      }, h('path', { d: 'M4.2 2.4 7.8 6l-3.6 3.6' })),
    ),
    h('span', { className: 'dsh-me-pickerlabel' }, label),
    h('span', {
      className: 'dsh-me-pickervalue',
      'data-empty': shown === '' ? 'true' : 'false',
    }, shown === '' ? '\u2014' : shown),
  ),
  h('div', { className: 'dsh-me-pickerbody' },
    items.length === 0
      ? h('div', { className: 'dsh-me-hint' }, empty || '\u2014')
      : h('div', { className: 'dsh-me-pickerlist', role: 'listbox' },
        items.map(item => h('button', {
          key: String(item.value),
          type: 'button',
          role: 'option',
          className: 'dsh-me-option',
          'data-active': String(item.value) === String(value) ? 'true' : 'false',
          'aria-selected': String(item.value) === String(value) ? 'true' : 'false',
          title: item.title,
          disabled: disabled === true,
          onClick() {
            if (typeof onChange === 'function') onChange(String(item.value))
            if (typeof onOpenChange === 'function') onOpenChange(false)
          },
        },
        h('span', { className: 'dsh-me-optionhead' },
          h('span', { className: 'dsh-me-optiontitle' }, item.label === undefined || item.label === null ? '\u2014' : String(item.label)),
          item.badge ? h('span', { className: 'dsh-me-optionmark' }, item.badge) : null,
        ),
        item.meta ? h('span', { className: 'dsh-me-optionmeta' }, String(item.meta)) : null,
        )),
      ),
  ),
  hint ? h('div', { className: 'dsh-me-hint dsh-me-pickerhint' }, hint) : null,
  )
}

/** 时间戳格式化（YYYY-MM-DD HH:mm:ss）。 */
function formatTime(value) {
  if (value === undefined || value === null || value === '') return '\u2014'
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

/** 毫秒时长格式化。 */
function formatElapsed(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '\u2014'
  if (ms < 1000) return ms + ' ms'
  const seconds = ms / 1000
  if (seconds < 60) return seconds.toFixed(1) + ' 秒'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds - minutes * 60)
  return minutes + ' 分 ' + rest + ' 秒'
}

/** 会话 ID 短显示。 */
function shortSessionId(value) {
  const text = String(value === undefined || value === null ? '' : value)
  if (text === '') return '\u2014'
  const tail = text.replace(/^session-/, '')
  return tail.length > 10 ? tail.slice(0, 10) : tail
}

  return {
    THEME,
    bindUiReact,
    styleCss,
    styleText,
    StyleTag,
    ensureGlobalStyle,
    dropGlobalStyle,
    PanelHead,
    IconButton,
    Notice,
    Field,
    Card,
    Section,
    Tabs,
    Badge,
    EmptyState,
    Select,
    TextField,
    TextArea,
    Toggle,
    Button,
    StepList,
    Picker,
    formatTime,
    formatElapsed,
    shortSessionId,
  };
})();

/* ---- api.js ---- */
const __mod_api = (() => {
/**
 * 客户端到宿主的 HTTP 通道封装。
 *
 * 宿主在 src/host/routes.js 里用 connection.fetch.register() 注册同一个前缀下的
 * 固定路径，返回 { ok: true, value } 或 { ok: false, error: { code, message } }。
 */

const ROUTE_PREFIX = '/api/mode-exchange'

const HEADERS = { 'content-type': 'application/json; charset=utf-8' }

/** 解析响应信封；无法解析时抛出带中文说明的错误。 */
async function parseEnvelope(response, t) {
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(t('error.badResponse'))
  }
  if (body && body.ok === true) return body.value
  const message = body && body.error && body.error.message
    ? String(body.error.message)
    : t('error.badResponse')
  const error = new Error(message)
  error.code = body && body.error ? body.error.code : undefined
  throw error
}

/** 发起一次调用。path 不带前缀，由本文件补上。 */
async function call(t, method, path, payload) {
  const init = {
    method,
    credentials: 'same-origin',
    headers: HEADERS,
    cache: 'no-store',
  }
  if (payload !== undefined) init.body = JSON.stringify(payload)
  let response
  try {
    response = await fetch(ROUTE_PREFIX + path, init)
  } catch (cause) {
    throw new Error(t('error.network', { reason: cause && cause.message ? cause.message : String(cause) }))
  }
  if (!response.ok && response.status !== 200) {
    // 宿主路由会自己编码业务错误；只有真正的传输层错误才走到这里。
    let text = ''
    try { text = await response.text() } catch { text = '' }
    const error = new Error(t('error.network', { reason: 'HTTP ' + response.status + (text ? ' ' + text.slice(0, 200) : '') }))
    error.status = response.status
    throw error
  }
  return parseEnvelope(response, t)
}

/** 构造 API 对象；t 是文案函数。 */
function createApi(t) {
  const query = params => {
    const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    if (entries.length === 0) return ''
    return '?' + entries.map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value))).join('&')
  }

  return {
    /** 读取面板状态：当前模式、可切换性、模式清单、配置、能力、迁移历史。 */
    getState: sessionId => call(t, 'GET', '/state' + query({ sessionId })),
    /** 执行运行时模式切换。 */
    switchMode: (sessionId, mode) => call(t, 'POST', '/switch', { sessionId, mode }),
    /** 回退到切换前模式。 */
    revert: sessionId => call(t, 'POST', '/revert', { sessionId }),
    /** 启动迁移重建。 */
    migrate: request => call(t, 'POST', '/migrate', request),
    /** 查询迁移任务状态。 */
    jobStatus: jobId => call(t, 'GET', '/job' + query({ jobId })),
    /** 取消迁移任务。 */
    cancelJob: jobId => call(t, 'POST', '/cancel', { jobId }),
    /** 读取迁移历史。 */
    migrations: sessionId => call(t, 'GET', '/migrations' + query({ sessionId })),
    /** 读取某次迁移的报告。 */
    report: reportId => call(t, 'GET', '/report' + query({ reportId })),
    /** 仅归档旧会话（迁移最后一步的手动补救）。 */
    archiveOld: (sessionId, confirm, backup) => call(t, 'POST', '/archive-old', { sessionId, confirm, backup }),
    /** 保存插件配置。 */
    saveConfig: patch => call(t, 'POST', '/config', patch),
    /** 会话清单（带标题、所属工作区），供面板选择器。 */
    listSessions: () => call(t, 'GET', '/sessions'),
    /** 工作区清单，供面板选择器。 */
    listWorkspaces: () => call(t, 'GET', '/workspaces'),
  }
}

  return {
    ROUTE_PREFIX,
    createApi,
  };
})();

/* ---- store.js ---- */
const __mod_store = (() => {
/**
 * 极简可观察状态容器。面板与设置页共用一份实例，保证两边开关状态同步（FR-15）。
 */

const EMPTY_STATE = {
  sessionId: null,
  title: null,
  loading: false,
  loaded: false,
  error: null,
  currentMode: null,
  switchable: false,
  blockedReason: null,
  switched: false,
  snapshot: null,
  modes: [],
  config: {},
  capabilities: { seedCreate: false, scopedRestrict: false, scopedPrompt: false, teamSwitch: false, attachSession: false, notes: [] },
  migrations: [],
  job: null,
  /** 菜单发起的迁移属于哪个会话；面板据此把进度接到正确的会话上。 */
  jobSessionId: null,
  sessions: [],
  workspaces: [],
}

function shallowEqualConfig(a, b) {
  const left = a || {}
  const right = b || {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (left[key] !== right[key]) return false
  }
  return true
}

/** 创建 store；getState 返回快照，subscribe 返回退订函数。 */
function createStore() {
  let state = { ...EMPTY_STATE }
  const listeners = new Set()

  function emit() {
    for (const listener of Array.from(listeners)) {
      try {
        listener(state)
      } catch (error) {
        // 单个订阅者抛错不应影响其他订阅者。
        void error
      }
    }
  }

  return {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    /** 局部更新；返回值无意义。 */
    set(patch) {
      const next = { ...state, ...patch }
      if (patch.config !== undefined && shallowEqualConfig(state.config, patch.config)) {
        next.config = state.config
      }
      state = next
      emit()
    },
    /** 整体替换（切换会话时用）。 */
    reset(sessionId) {
      state = { ...EMPTY_STATE, config: state.config, sessionId: sessionId || null }
      emit()
    },
    /** 清空错误与加载态，保留其余数据。 */
    settle(patch) {
      state = { ...state, loading: false, error: null, ...patch }
      emit()
    },
    /** 记录一次失败。 */
    fail(error) {
      state = { ...state, loading: false, error: error && error.message ? error.message : String(error) }
      emit()
    },
  }
}


  return {
    EMPTY_STATE,
    createStore,
  };
})();

/* ---- panel.js ---- */
const __mod_panel = (() => {
/**
 * 侧栏面板：模式切换 / 迁移重建 / 迁移历史 三个页签。
 * 组件通过 makePanel(React, deps) 构造，deps 提供 api、store、文案与 UI 原子。
 */

const { Notice, Field, Select, Toggle, TextArea, Button, PanelHead, StepList, Card, Section, Tabs, Badge, EmptyState, StyleTag, Picker, formatTime, formatElapsed, shortSessionId } = __mod_ui;
const STEP_KEYS = ['export', 'verify', 'create', 'import', 'team', 'archive', 'report']

function stepsOf(t, job) {
  const index = job ? Number(job.stepIndex) : -1
  const failed = job && job.status === 'failed'
  const done = job && job.status === 'done'
  return STEP_KEYS.map((key, i) => {
    let state = 'pending'
    if (done) state = 'done'
    else if (i < index) state = 'done'
    else if (i === index) state = failed ? 'failed' : 'active'
    return { key, label: t('steps.' + key + '.name'), state }
  })
}

function statusLabel(t, status) {
  if (status === 'running' || status === 'pending') return t('history.statusRunning')
  if (status === 'in-progress') return t('history.statusInProgress')
  if (status === 'done') return t('history.statusDone')
  if (status === 'failed') return t('history.statusFailed')
  if (status === 'cancelled') return t('history.statusCancelled')
  return status || t('common.unknown')
}

/** 迁移状态 → 徽标色调。 */
function statusTone(status) {
  if (status === 'done') return 'ok'
  if (status === 'failed') return 'error'
  if (status === 'cancelled') return 'idle'
  return 'warn'
}

function makePanel(React, deps) {
  const h = React.createElement
  const { api, store, t } = deps

  function useStore() {
    const [snapshot, setSnapshot] = React.useState(store.getState())
    React.useEffect(() => store.subscribe(setSnapshot), [])
    return snapshot
  }

  /**
   * 宿主客户端侧的会话摘要（sessions.list）。
   *
   * 面板要显示「和左侧会话列表一模一样的名字」，而宿主客户端早就把这件事做完了：
   * `SessionSummary.displayTitle` 的回退链是 durable title → 项目目录名 → id。
   * 直接读它，比从宿主侧绕一圈更准，也不会因为标题服务缺失而退化成裸 id。
   */
  function useSessionTitles() {
    const read = () => {
      try {
        const sessions = deps.ctx && typeof deps.ctx.get === 'function' ? deps.ctx.get('sessions') : null
        const snapshot = sessions && sessions.list ? sessions.list.getSnapshot() : null
        return (snapshot && snapshot.byId) || {}
      } catch {
        return {}
      }
    }
    const [byId, setById] = React.useState(read)
    React.useEffect(() => {
      let sessions = null
      try {
        sessions = deps.ctx && typeof deps.ctx.get === 'function' ? deps.ctx.get('sessions') : null
      } catch {
        sessions = null
      }
      if (!sessions || !sessions.list || typeof sessions.list.subscribe !== 'function') return undefined
      const sync = () => setById(read())
      sync()
      const dispose = sessions.list.subscribe(sync)
      return () => { if (typeof dispose === 'function') dispose() }
    }, [])
    return byId
  }

  function Panel(props) {
    const state = useStore()
    const sessionTitles = useSessionTitles()
    // 面板默认跟随宿主主视图的会话；用户在「选择会话」里挑过之后，以他的选择为准。
    const [pickedSessionId, setPickedSessionId] = React.useState('')
    const [workspaceId, setWorkspaceId] = React.useState('')
    // 用户手动挑过工作区之后就不再跟着会话走，否则每次都把他选的覆盖掉。
    const [workspaceTouched, setWorkspaceTouched] = React.useState(false)
    const [openPicker, setOpenPicker] = React.useState('')
    const mainViewRef = React.useRef(props.sessionId || null)
    const sessionId = pickedSessionId || props.sessionId || state.sessionId
    const [tab, setTab] = React.useState('switch')
    const [target, setTarget] = React.useState('')
    const [busy, setBusy] = React.useState('')
    const [error, setError] = React.useState('')
    const [info, setInfo] = React.useState('')

    const [migrateMode, setMigrateMode] = React.useState('')
    const [deleteOld, setDeleteOld] = React.useState(true)
    const [team, setTeam] = React.useState(false)
    const [note, setNote] = React.useState('')
    const [confirming, setConfirming] = React.useState(null)
    const [backupFirst, setBackupFirst] = React.useState(true)
    const [resume, setResume] = React.useState(null)
    const [job, setJob] = React.useState(null)
    const [report, setReport] = React.useState(null)
    const [elapsed, setElapsed] = React.useState(0)

    const modeOptions = (state.modes || []).map(mode => ({
      value: mode.id,
      label: mode.name + (mode.id === state.currentMode ? '（当前）' : '') + (mode.broken ? '（不可用）' : ''),
      disabled: mode.broken === true,
      hint: mode.description || mode.id,
    }))

    // 首次进入：拉取状态，并用配置里的默认值初始化表单。
    React.useEffect(() => {
      if (!sessionId) return
      let cancelled = false
      store.set({ loading: true, sessionId })
      api.getState(sessionId)
        .then(value => {
          if (cancelled) return
          store.settle({
            sessionId: value.sessionId,
            title: value.title ?? null,
            currentMode: value.currentMode,
            switchable: value.switchable,
            blockedReason: value.blockedReason,
            switched: value.switched,
            snapshot: value.snapshot,
            modes: value.modes || [],
            config: value.config || {},
            capabilities: value.capabilities || {},
            migrations: value.migrations || [],
            loaded: true,
          })
        })
        .catch(cause => { if (!cancelled) store.fail(cause) })
      return () => { cancelled = true }
    }, [sessionId])

    // 会话清单 / 工作区清单：面板要让人按「标题」认会话，而不是一串 session- 编码。
    // 这两份数据只在打开面板时拉一次；切换或迁移会话时不需要实时同步宿主。
    React.useEffect(() => {
      let cancelled = false
      api.listSessions()
        .then(value => { if (!cancelled) store.set({ sessions: (value && value.items) || [] }) })
        .catch(() => { if (!cancelled) store.set({ sessions: [] }) })
      api.listWorkspaces()
        .then(value => { if (!cancelled) store.set({ workspaces: (value && value.items) || [] }) })
        .catch(() => { if (!cancelled) store.set({ workspaces: [] }) })
      return () => { cancelled = true }
    }, [])

    // 首次拿到清单后定默认值：优先「用户上次点进来的会话」（就是 props 给的那个），
    // 其次清单里的第一个；工作区跟着这个会话走。用户手动选过就不再覆盖。
    React.useEffect(() => {
      const sessions = state.sessions || []
      if (sessions.length === 0) return
      if (pickedSessionId) return
      const known = props.sessionId || state.sessionId
      if (known) return
      // 宿主没给主视图会话时才退回清单第一个；给了就以它为准，不要把人从当前对话上挪走。
      const first = sessions[0]
      if (first && first.id) setPickedSessionId(first.id)
    }, [state.sessions])

    // 用户在左侧会话列表里换了对话：面板要跟着回到那个会话，清掉手动选择，
    // 否则「我在左边点了 A，面板还停在刚才手选的 B」会让人以为点错了。
    React.useEffect(() => {
      const next = props.sessionId || null
      if (mainViewRef.current === next) return
      mainViewRef.current = next
      setPickedSessionId('')
      setWorkspaceTouched(false)
    }, [props.sessionId])

    // 工作区默认跟着「要操作的会话」走；会话没有归属或还没选中时才退回第一个工作区。
    React.useEffect(() => {
      if (workspaceTouched) return
      const workspaces = state.workspaces || []
      if (workspaces.length === 0) return
      const sessions = state.sessions || []
      const current = sessions.find(item => item.id === sessionId)
      const fromSession = current && current.workspaceId
      const next = fromSession || (workspaces[0] && workspaces[0].id) || ''
      if (next && next !== workspaceId) setWorkspaceId(next)
    }, [state.workspaces, state.sessions, sessionId, workspaceTouched])

    // 换会话时清掉上一个会话的切换/迁移结果，避免把旧结论套到新会话上。
    React.useEffect(() => {
      setTarget('')
      setMigrateMode('')
      setJob(null)
      setReport(null)
      setResume(null)
      setConfirming(null)
      setInfo('')
      setError('')
    }, [sessionId])

    // 用配置默认值填表单（只在首次或配置变化且用户没改过时）。
    React.useEffect(() => {
      const config = state.config || {}
      const fallback = config.defaultMode || state.currentMode || ''
      setTarget(previous => previous || fallback)
      setMigrateMode(previous => previous || fallback)
      if (typeof config.deleteOldSession === 'boolean') setDeleteOld(config.deleteOldSession)
      if (typeof config.enableTeam === 'boolean') setTeam(config.enableTeam && state.capabilities && state.capabilities.teamSwitch === true)
    }, [state.config, state.currentMode, state.capabilities, sessionId])

    /**
     * 迁移成功后自动停到新建会话（每个任务只做一次）。
     *
     * 判断条件全部来自任务状态本身，不依赖面板此刻停在哪个会话：
     * 从右键菜单发起的迁移也要能自动切过去。
     */
    const autoOpenedRef = React.useRef('')
    function maybeAutoOpen(value) {
      if (!value || value.status !== 'done') return
      const source = value.report || {}
      if (source.ok !== true) return
      const config = state.config || {}
      if (config.autoOpenTarget === false) return
      const target_ = source.target && source.target.sessionId
      if (!target_) return
      if (autoOpenedRef.current === value.jobId) return
      autoOpenedRef.current = value.jobId
      openSessionById(target_)
    }

    // 任务轮询：运行中每 800ms 读一次状态，同时更新耗时。
    React.useEffect(() => {
      if (!job || !job.jobId) return
      if (job.status !== 'running' && job.status !== 'pending') return
      let stopped = false
      const startedAt = Date.now()
      const tick = async () => {
        if (stopped) return
        try {
          const value = await api.jobStatus(job.jobId)
          if (stopped) return
          setJob(value)
          setElapsed(Date.now() - startedAt)
          if (value && value.report) setReport(value.report)
          maybeAutoOpen(value)
        } catch (cause) {
          if (!stopped) setError(cause.message || String(cause))
        }
      }
      const timer = setInterval(tick, 800)
      void tick()
      return () => { stopped = true; clearInterval(timer) }
    }, [job && job.jobId, job && job.status])

    // 右键菜单发起的迁移只往 store 写一个 jobId，没有组件能直接 setJob；
    // 面板接管它，这样「从菜单发起 → 打开面板看进度」看的是同一个任务。
    // 菜单可能是在别的会话上发起的，所以先把选择器切到那条会话，再接管任务。
    React.useEffect(() => {
      const pendingJob = state.job
      if (!pendingJob) return
      const owner = state.jobSessionId
      if (owner && owner !== sessionId) { setPickedSessionId(owner); return }
      if (job && job.jobId === pendingJob) return
      setJob({ jobId: pendingJob, status: 'running', stepIndex: 0, stepName: t('steps.export.name'), totalSteps: 7 })
      setElapsed(0)
      setTab('migrate')
    }, [state.job, state.jobSessionId, job && job.jobId, sessionId])

    // 任务收尾后把 store 里的「待接管」标记清掉，避免下次打开面板又接管一遍。
    React.useEffect(() => {
      if (!state.job || !job || job.jobId !== state.job) return
      if (job.status === 'running' || job.status === 'pending') return
      store.set({ job: null, jobSessionId: null })
    }, [state.job, job && job.jobId, job && job.status])

    const canSwitch = state.switchable !== false && !state.blockedReason

    // ---- 会话 / 工作区选择器 ----------------------------------------------
    // 会话只显示「标题 + 所属工作区」，让它能被人认出来；短 id 退到副行做兜底。
    const sessions = state.sessions || []
    const workspaces = state.workspaces || []
    const workspaceName = id => {
      const hit = workspaces.find(item => item.id === id)
      return hit ? hit.title : ''
    }
    const sessionBrief = sessions.find(item => item.id === sessionId)
    // 标题优先级：宿主客户端 displayTitle（与左侧列表一致）→ 宿主侧标题 → 清单里的标题。
    const titleOf = id => {
      if (!id) return ''
      const row = sessionTitles[id] || sessionTitles[String(id)]
      if (row && typeof row.displayTitle === 'string' && row.displayTitle.length > 0) return row.displayTitle
      const brief = sessions.find(item => item.id === id)
      return (brief && brief.title) || ''
    }
    const sessionTitle = titleOf(sessionId) || state.title || t('picker.noTitle')
    const sessionMeta = item => {
      const parts = []
      const space = item.workspaceId ? workspaceName(item.workspaceId) : ''
      if (space) parts.push(space)
      parts.push(shortSessionId(item.id))
      if (item.running) parts.push(t('picker.running'))
      else if (item.archived) parts.push(t('picker.archived'))
      return parts.join(' · ')
    }
    const sessionOptions = sessions.map(item => ({
      value: item.id,
      label: titleOf(item.id) || item.title || t('picker.noTitle'),
      meta: sessionMeta(item),
      title: item.cwd || item.id,
    }))
    const workspaceOptions = workspaces.map(item => ({
      value: item.id,
      label: item.title || item.path || item.id,
      meta: item.path,
      title: item.path,
    }))
    const selectedWorkspace = workspaces.find(item => item.id === workspaceId)
    const sessionPicker = h(Picker, {
      label: t('picker.sessionLabel'),
      value: sessionId || '',
      valueLabel: sessionId ? sessionTitle : '',
      options: sessionOptions,
      open: openPicker === 'session',
      onOpenChange: next => setOpenPicker(next ? 'session' : ''),
      // 换会话时让工作区重新跟随新会话（用户没手动选过工作区的话），
      // 否则会出现「切到 B 会话、工作区还停在 A 的」这种错位。
      onChange: next => { setPickedSessionId(next); setWorkspaceTouched(false); setOpenPicker('') },
      empty: t('picker.noSessions'),
      hint: t('picker.sessionHint'),
      disabled: busy !== '',
    })
    const workspacePicker = h(Picker, {
      label: t('picker.workspaceLabel'),
      value: workspaceId || '',
      valueLabel: selectedWorkspace ? (selectedWorkspace.title || selectedWorkspace.path) : '',
      options: workspaceOptions,
      open: openPicker === 'workspace',
      onOpenChange: next => setOpenPicker(next ? 'workspace' : ''),
      onChange: next => { setWorkspaceId(next); setWorkspaceTouched(true); setOpenPicker('') },
      empty: t('picker.noWorkspaces'),
      hint: t('picker.workspaceHint'),
      disabled: busy !== '',
    })

    async function applySwitch() {
      if (!target) { setError(t('switch.selectModeFirst')); return }
      setError(''); setInfo(''); setBusy('switch')
      try {
        const value = await api.switchMode(sessionId, target)
        store.set({
          currentMode: value.currentMode,
          switched: true,
          snapshot: value.snapshot,
        })
        setInfo(t('switch.success', { mode: value.modeName || target }))
      } catch (cause) {
        setError(cause.message || String(cause))
      } finally {
        setBusy('')
      }
    }

    async function applyRevert() {
      setError(''); setInfo(''); setBusy('revert')
      try {
        const value = await api.revert(sessionId)
        store.set({ currentMode: value.currentMode, switched: false, snapshot: null })
        setInfo(t('switch.reverted', { mode: value.modeName || value.currentMode || '' }))
      } catch (cause) {
        setError(cause.message || String(cause))
      } finally {
        setBusy('')
      }
    }

    function askMigrate() {
      if (!migrateMode) { setError(t('switch.selectModeFirst')); return }
      if (!canSwitch) { setError(t('session.notSwitchableReason', { reason: state.blockedReason || '' })); return }
      setError(''); setInfo('')
      if (state.config && state.config.confirmBeforeMigrate === false) {
        void runMigrate(true, true)
        return
      }
      setConfirming({ mode: migrateMode })
      setBackupFirst(state.config ? state.config.keepExportCopy !== false : true)
    }

    async function runMigrate(confirmed, backup) {
      setConfirming(null)
      setError(''); setInfo(''); setReport(null); setResume(null)
      setBusy('migrate')
      try {
        const request = {
          sessionId,
          workspaceId: workspaceId || undefined,
          mode: migrateMode,
          deleteOld: deleteOld === true,
          team: team === true,
          note: note || undefined,
          confirmDelete: deleteOld === true ? confirmed === true : undefined,
          backup: backup === true,
          resume: resume ? true : undefined,
        }
        const value = await api.migrate(request)
        if (value && value.needsResume) {
          setResume({ ledger: value.ledger || {} })
          setJob(null)
          setBusy('')
          return
        }
        if (value && value.jobId) {
          setJob({ jobId: value.jobId, status: 'running', stepIndex: 0, stepName: t('steps.export.name'), totalSteps: 7 })
          setElapsed(0)
          store.set({ job: value.jobId })
        } else {
          setInfo(t('migrate.finished'))
        }
      } catch (cause) {
        setError(cause.message || String(cause))
      } finally {
        if (!resume) setBusy('')
      }
    }

    async function cancelMigration() {
      if (!job || !job.jobId) return
      try {
        await api.cancelJob(job.jobId)
        setInfo(t('migrate.cancelled'))
      } catch (cause) {
        setError(cause.message || String(cause))
      }
    }

    async function openReport(reportId) {
      setError('')
      try {
        const value = await api.report(reportId || (report && report.jobId))
        setReport(value)
        setTab('history')
      } catch (cause) {
        setError(cause.message || String(cause))
      }
    }

    async function refreshHistory() {
      try {
        const rows = await api.migrations(sessionId)
        store.set({ migrations: rows || [] })
      } catch (cause) {
        setError(cause.message || String(cause))
      }
    }

    /** 把主视图切到某条会话；拿不到 uiWorkspace 时降级为提示用户手动点。 */
    function openSessionById(target_) {
      if (!target_) return false
      try {
        const uiWorkspace = deps.ctx && typeof deps.ctx.get === 'function' ? deps.ctx.get('uiWorkspace') : null
        if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
          void uiWorkspace.openSession(target_)
          return true
        }
      } catch (error) {
        void error
      }
      setError(t('migrate.openTargetFailed', { id: String(target_) }))
      return false
    }

    function openTargetSession() {
      const target_ = report && report.target && report.target.sessionId
      if (!target_) return
      openSessionById(target_)
    }

    const header = h(PanelHead, {
      title: t('panel.title'),
      subtitle: t('panel.subtitle'),
      onClose: typeof props.onClose === 'function' ? props.onClose : undefined,
      closeLabel: t('panel.close'),
    })

    const tabs = h(Tabs, {
      value: tab,
      onChange: setTab,
      options: [
        { value: 'switch', label: t('panel.tab.switch') },
        { value: 'migrate', label: t('panel.tab.migrate') },
        { value: 'history', label: t('panel.tab.history') },
      ],
    })

    const statusCard = h(Card, null,
      h('div', { className: 'dsh-me-row' },
        h('span', { className: 'dsh-me-label' }, t('switch.statusTitle')),
        canSwitch
          ? h(Badge, { tone: 'ok' }, t('session.switchable'))
          : h(Badge, { tone: 'warn' }, t('session.notSwitchable')),
      ),
      h('div', { className: 'dsh-me-stack-sm' },
        h(Field, { label: t('session.current'), value: sessionId ? sessionTitle : t('session.modeFallback') }),
        h(Field, { label: t('session.id'), value: shortSessionId(sessionId), mono: true }),
        h(Field, { label: t('session.mode'), value: state.currentMode || t('session.modeFallback'), mono: true }),
      ),
      canSwitch || !state.blockedReason
        ? null
        : h('p', { className: 'dsh-me-hint' }, t('session.notSwitchableReason', { reason: state.blockedReason })),
    )

    const switchTab = h('div', { className: 'dsh-me-stack' },
      statusCard,
      h(Section, { title: t('picker.session') }, h(Card, null, sessionPicker)),
      h(Section, { title: t('switch.heading') },
        h(Card, null,
          h(Notice, { kind: 'warn' }, t('switch.softNotice')),
          h(Select, {
            label: t('switch.target'),
            value: target,
            options: modeOptions.length > 0 ? modeOptions : [{ value: '', label: t('common.loading') }],
            onChange: setTarget,
            disabled: !canSwitch || busy !== '',
          }),
          h('div', { className: 'dsh-me-footer' },
            state.switched || state.snapshot
              ? h(Button, { onClick: applyRevert, disabled: busy !== '', variant: 'ghost' }, busy === 'revert' ? t('switch.reverting') : t('switch.revert'))
              : null,
            h(Button, {
              variant: 'primary',
              disabled: !canSwitch || busy !== '' || !target,
              onClick: applySwitch,
            }, busy === 'switch' ? t('switch.applying') : t('switch.apply')),
          ),
        ),
      ),
      state.snapshot
        ? h(Section, { title: t('switch.snapshot') },
          h(Card, null,
            h('div', { className: 'dsh-me-stack-sm' },
              h(Field, { label: t('switch.snapshotFrom'), value: state.snapshot.fromMode, mono: true }),
              h(Field, { label: t('switch.snapshotTo'), value: state.snapshot.toMode, mono: true }),
              h(Field, { label: t('switch.snapshotAt'), value: formatTime(state.snapshot.at) }),
            ),
            h('hr', { className: 'dsh-me-divider' }),
            state.snapshot.denied && state.snapshot.denied.length > 0
              ? h('p', { className: 'dsh-me-hint' }, t('switch.denied', {
                count: state.snapshot.denied.length,
                names: state.snapshot.denied.join(', '),
              }))
              : h('p', { className: 'dsh-me-hint' }, t('switch.noneDenied')),
          ),
        )
        : null,
    )

    const currentJob = job
    const running = !!(currentJob && currentJob.jobId
      && (currentJob.status === 'running' || currentJob.status === 'pending'))

    const migrateTab = h('div', { className: 'dsh-me-stack' },
      h(Notice, null, t('migrate.intro')),
      h(Section, { title: t('picker.session') },
        h(Card, null, sessionPicker, h('hr', { className: 'dsh-me-divider' }), workspacePicker),
      ),
      h(Section, { title: t('migrate.heading') },
        h(Card, null,
          h(Select, {
            label: t('migrate.target'),
            value: migrateMode,
            options: modeOptions.length > 0 ? modeOptions : [{ value: '', label: t('common.loading') }],
            onChange: setMigrateMode,
            disabled: busy !== '' || !canSwitch,
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h('div', { className: 'dsh-me-stack-sm' },
            h(Toggle, {
              label: t('migrate.deleteOld'),
              checked: deleteOld,
              onChange: setDeleteOld,
              hint: t('migrate.deleteOldHint'),
              disabled: busy !== '',
            }),
            h(Toggle, {
              label: t('migrate.team'),
              checked: team,
              onChange: setTeam,
              disabled: busy !== '' || !(state.capabilities && state.capabilities.teamSwitch === true),
              hint: state.capabilities && state.capabilities.teamSwitch === true ? undefined : t('migrate.teamUnsupported'),
              title: state.capabilities && state.capabilities.teamSwitch === true ? undefined : t('migrate.teamUnsupported'),
            }),
          ),
          h('hr', { className: 'dsh-me-divider' }),
          h(TextArea, {
            label: t('migrate.note'),
            value: note,
            placeholder: t('migrate.notePlaceholder'),
            disabled: busy !== '',
            onChange: setNote,
          }),
          h('div', { className: 'dsh-me-footer' },
            running ? h(Button, { variant: 'danger', onClick: cancelMigration }, t('migrate.cancel')) : null,
            h(Button, {
              variant: 'primary',
              disabled: busy !== '' || !canSwitch || !migrateMode,
              onClick: askMigrate,
            }, busy === 'migrate' ? t('migrate.running') : t('migrate.run')),
          ),
        ),
      ),
      resume
        ? h(Card, { tone: 'warn' },
          h('div', { className: 'dsh-me-row' },
            h('span', { className: 'dsh-me-label' }, t('migrate.resumeTitle')),
            h(Badge, { tone: 'warn' }, t('history.statusInProgress')),
          ),
          h(Notice, { kind: 'warn' }, t('migrate.resumeBody', {
            step: (resume.ledger && resume.ledger.step !== undefined) ? String(resume.ledger.step + 1) : '?',
          })),
          h('div', { className: 'dsh-me-footer' },
            h(Button, { onClick: () => { setResume(null); setMigrateMode('') } }, t('migrate.resumeAbandon')),
            h(Button, { variant: 'primary', onClick: () => runMigrate(true, true) }, t('migrate.resumeContinue')),
          ),
        )
        : null,
      currentJob && currentJob.jobId
        ? h(Card, null,
          h('div', { className: 'dsh-me-row' },
            h('span', { className: 'dsh-me-label' }, t('migrate.step', {
              index: Number(currentJob.stepIndex || 0) + 1,
              total: currentJob.totalSteps || 7,
              name: currentJob.stepName || '',
            })),
            h(Badge, currentJob.status === 'failed'
              ? { tone: 'error' }
              : currentJob.status === 'done' ? { tone: 'ok' } : { tone: 'warn' }, statusLabel(t, currentJob.status)),
          ),
          h('p', { className: 'dsh-me-hint' }, t('common.elapsed', { value: formatElapsed(elapsed || currentJob.elapsedMs || 0) })),
          h(StepList, { items: stepsOf(t, currentJob) }),
          currentJob.message ? h(Notice, { kind: 'note' }, currentJob.message) : null,
        )
        : null,
      report ? renderReport(report) : null,
      confirming ? renderConfirm() : null,
    )

    function renderConfirm() {
      const snapshot = report || {}
      const messageCount = snapshot.source ? snapshot.source.messageCount : undefined
      return h(Card, { tone: 'warn' },
        h('div', { className: 'dsh-me-row' },
          h('span', { className: 'dsh-me-label' }, t('migrate.confirmTitle')),
          h(Badge, { tone: 'warn' }, '⚠'),
        ),
        h('p', { className: 'dsh-me-hint' }, t('migrate.confirmBody', {
          title: sessionTitle,
          mode: confirming.mode,
        })),
        messageCount !== undefined
          ? h(Field, { label: t('migrate.confirmMessages'), value: String(messageCount) })
          : null,
        h('p', { className: 'dsh-me-hint' }, t('migrate.confirmIrreversible')),
        h('hr', { className: 'dsh-me-divider' }),
        h(Toggle, { label: t('migrate.confirmBackup'), checked: backupFirst, onChange: setBackupFirst }),
        h('div', { className: 'dsh-me-footer' },
          h(Button, { onClick: () => setConfirming(null) }, t('common.cancel')),
          h(Button, { variant: 'danger', onClick: () => runMigrate(true, backupFirst) }, t('migrate.confirmOk')),
        ),
      )
    }

    function renderReport(value) {
      const log = value.log || {}
      const oldSession = value.oldSession || {}
      const teamInfo = value.team || {}
      // 失败原因优先级：报告里的 error 字段 → remainingSteps 里那句「失败原因：…」。
      const reasonText = typeof value.error === 'string' && value.error.length > 0
        ? value.error
        : (value.remainingSteps || []).reduce((hit, line) => {
          if (hit) return hit
          const prefix = '失败原因：'
          return typeof line === 'string' && line.startsWith(prefix) ? line.slice(prefix.length) : ''
        }, '')
      // 原因已经在上面单独用错误色条显示过了，列表里不再重复一遍。
      const steps = (value.remainingSteps || []).filter(line => typeof line !== 'string' || !line.startsWith('失败原因：'))
      return h(Card, value.ok ? null : { tone: 'error' },
        h('div', { className: 'dsh-me-row' },
          h('span', { className: 'dsh-me-label' }, value.ok ? t('migrate.finished') : t('migrate.failed')),
          h(Badge, { tone: value.ok ? 'ok' : 'error' },
            oldSession.archived ? t('migrate.oldArchived') : t('migrate.oldKept')),
        ),
        !value.ok && reasonText
          ? h(Notice, { kind: 'error' }, t('migrate.failureReason', { reason: reasonText }))
          : null,
        h('div', { className: 'dsh-me-stack-sm' },
          value.source ? h(Field, { label: t('migrate.source'), value: value.source.title || shortSessionId(value.source.sessionId) }) : null,
          value.target ? h(Field, { label: t('migrate.target2'), value: shortSessionId(value.target.sessionId), mono: true }) : null,
          value.source ? h(Field, { label: t('migrate.messageCount'), value: String(value.source.messageCount) }) : null,
          value.target ? h(Field, {
            label: t('migrate.targetWorkspace'),
            value: value.target.workspaceTitle
              || (value.target.attachedToWorkspace ? t('migrate.targetWorkspaceAuto') : t('migrate.targetWorkspaceNone')),
          }) : null,
          h(Field, { label: t('migrate.teamEnabled'), value: teamInfo.enabled ? t('migrate.teamOn') : t('migrate.teamOff') }),
          log.path ? h(Field, { label: t('migrate.logPath'), value: log.path, mono: true }) : null,
          oldSession.backupPath ? h(Field, { label: t('migrate.backupPath'), value: oldSession.backupPath, mono: true }) : null,
        ),
        teamInfo.reason ? h(Notice, { kind: 'warn' }, t('migrate.teamReason', { reason: teamInfo.reason })) : null,
        oldSession.reason ? h(Notice, { kind: 'note' }, t('migrate.oldReason', { reason: oldSession.reason })) : null,
        steps.length > 0
          ? h('div', { className: 'dsh-me-stack-sm' },
            h('span', { className: 'dsh-me-sectiontitle' }, t('migrate.remaining')),
            h('ul', { className: 'dsh-me-list' }, steps.map((step, i) => h('li', { key: String(i) }, step))),
          )
          : null,
        value.timeline && value.timeline.length > 0
          ? h('details', { className: 'dsh-me-details' },
            h('summary', null, t('migrate.timeline')),
            h('ul', { className: 'dsh-me-list' }, value.timeline.map((entry, i) => h('li', { key: String(i), className: 'dsh-me-dim' },
              formatTime(entry.at) + ' · ' + (entry.ok ? '✓ ' : '✗ ') + (entry.detail || '')))),
          )
          : null,
        value.jobId ? h('p', { className: 'dsh-me-hint' }, t('migrate.reportFile', { path: String(value.jobId) })) : null,
        value.target && value.target.sessionId
          ? h('div', { className: 'dsh-me-footer' },
            h(Button, { onClick: openTargetSession, variant: 'primary' }, t('migrate.openTarget')))
          : null,
      )
    }

    const rows = state.migrations || []

    const historyTab = h('div', { className: 'dsh-me-stack' },
      h(Section, {
        title: t('history.heading'),
        action: h(Button, {
          onClick: refreshHistory,
          variant: 'ghost',
          size: 'sm',
          disabled: state.loading === true,
        }, t('common.refresh')),
      },
      rows.length === 0
        ? h(EmptyState, {
          title: t('history.empty'),
          hint: t('history.emptyHint'),
          icon: h('svg', {
            width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            h('circle', { cx: 12, cy: 12, r: 8.4 }),
            h('path', { d: 'M12 7.6v4.9l3.1 1.8' }),
          ),
        })
        : h('div', { className: 'dsh-me-history' },
          rows.map(row => h('div', { key: row.jobId || row.sourceSessionId, className: 'dsh-me-historyrow' },
            h('div', { className: 'dsh-me-historyhead' },
              h('span', { className: 'dsh-me-historytitle' }, row.sourceTitle || shortSessionId(row.sourceSessionId)),
              h(Badge, { tone: statusTone(row.status) }, statusLabel(t, row.status)),
            ),
            h('div', { className: 'dsh-me-historymeta' },
              h('span', { className: 'dsh-me-code' }, t('history.modeArrow', {
                from: row.sourceMode || '?',
                to: row.targetMode || '?',
              })),
              h('span', null, '·'),
              h('span', { className: 'dsh-me-code' }, shortSessionId(row.targetSessionId)),
              h('span', null, '·'),
              h('span', null, formatTime(row.ts || row.updatedAt)),
            ),
            h('div', { className: 'dsh-me-footer' },
              h(Button, {
                onClick: () => openReport(row.jobId || row.reportId),
                variant: 'ghost',
                size: 'sm',
              }, t('history.viewReport')),
            ),
          )),
        ),
      ),
      report ? renderReport(report) : null,
    )

    return h('div', { className: 'dsh-me-root', 'data-surface': 'page' },
      h(StyleTag, { key: 'style' }),
      header,
      tabs,
      error ? h(Notice, { kind: 'error' }, error) : null,
      info ? h(Notice, { kind: 'ok' }, info) : null,
      state.loading && !state.loaded ? h(Notice, null, t('common.loading')) : null,
      tab === 'switch' ? switchTab : null,
      tab === 'migrate' ? migrateTab : null,
      tab === 'history' ? historyTab : null,
    )
  }

  return Panel
}

  return {
    makePanel,
  };
})();

/* ---- settings.js ---- */
const __mod_settings = (() => {
/**
 * 插件设置页（注册到 settings.section）。六个配置项与侧栏面板共用同一份 store，
 * 保存后立即回写 store，保证两边开关状态同步（FR-15）。
 */

const { Notice, Select, Toggle, TextField, Button, Card, Section, PanelHead, StyleTag } = __mod_ui;
const FIELDS = ['defaultMode', 'deleteOldSession', 'enableTeam', 'exportDir', 'keepExportCopy', 'confirmBeforeMigrate', 'autoOpenTarget']

function pickConfig(source) {
  const next = {}
  for (const key of FIELDS) {
    if (source && source[key] !== undefined) next[key] = source[key]
  }
  return next
}

function makeSettings(React, deps) {
  const h = React.createElement
  const { api, store, t } = deps

  function useStore() {
    const [snapshot, setSnapshot] = React.useState(store.getState())
    React.useEffect(() => store.subscribe(setSnapshot), [])
    return snapshot
  }

  function Settings(props) {
    const state = useStore()
    const [draft, setDraft] = React.useState(() => pickConfig(state.config))
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState('')
    const [saved, setSaved] = React.useState(false)
    const [confirmWarn, setConfirmWarn] = React.useState(null)
    const [dirty, setDirty] = React.useState(false)

    // 配置从宿主读回后同步到草稿（用户未改动时）。
    React.useEffect(() => {
      if (!dirty) setDraft(pickConfig(state.config))
    }, [state.config, dirty])

    const modeOptions = [{ value: '', label: t('settings.followDefault') }].concat(
      (state.modes || []).map(mode => ({ value: mode.id, label: mode.name || mode.id, disabled: mode.broken === true })),
    )

    function patch(key, value) {
      setDirty(true)
      setSaved(false)
      setDraft(previous => ({ ...previous, [key]: value }))
    }

    async function save() {
      setBusy(true); setError(''); setSaved(false)
      try {
        const payload = { ...draft }
        if (confirmWarn !== null) payload.disableConfirmAcknowledged = confirmWarn === 'yes'
        const value = await api.saveConfig(payload)
        const nextConfig = (value && value.config) || draft
        store.set({ config: nextConfig })
        setDraft(pickConfig(nextConfig))
        setDirty(false)
        setSaved(true)
        setConfirmWarn(null)
      } catch (cause) {
        setError(t('settings.failed', { reason: cause && cause.message ? cause.message : String(cause) }))
      } finally {
        setBusy(false)
      }
    }

    function onConfirmToggle(checked) {
      if (checked === false) {
        // 关闭「迁移前强制确认」需要二次警告（FR-14）。
        setConfirmWarn('ask')
        return
      }
      setConfirmWarn(null)
      patch('confirmBeforeMigrate', true)
    }

    const teamSupported = state.capabilities && state.capabilities.teamSwitch === true

    return h('div', { className: 'dsh-me-root', 'data-flat': 'true' },
      h(StyleTag, { key: 'style' }),
      h(PanelHead, {
        title: t('settings.title'),
        subtitle: t('settings.description'),
        size: 'lg',
      }),

      error ? h(Notice, { kind: 'error' }, error) : null,
      saved ? h(Notice, { kind: 'ok' }, t('settings.saved')) : null,

      h(Section, { title: t('settings.groupBehavior') },
        h(Card, null,
          h(Select, {
            label: t('settings.defaultMode'),
            value: draft.defaultMode || '',
            options: modeOptions,
            onChange: value => patch('defaultMode', value),
            hint: t('settings.defaultModeHint'),
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h('div', { className: 'dsh-me-stack-sm' },
            h(Toggle, {
              label: t('settings.deleteOld'),
              hint: t('settings.deleteOldHint'),
              checked: draft.deleteOldSession !== false,
              onChange: value => patch('deleteOldSession', value),
            }),
            h(Toggle, {
              label: t('settings.team'),
              checked: draft.enableTeam === true,
              onChange: value => patch('enableTeam', value),
              disabled: !teamSupported,
              hint: teamSupported ? t('settings.teamHint') : t('migrate.teamUnsupported'),
            }),
            h(Toggle, {
              label: t('settings.autoOpenTarget'),
              hint: t('settings.autoOpenTargetHint'),
              checked: draft.autoOpenTarget !== false,
              onChange: value => patch('autoOpenTarget', value),
            }),
          ),
        ),
      ),

      h(Section, { title: t('settings.groupExport') },
        h(Card, null,
          h(TextField, {
            label: t('settings.exportDir'),
            value: draft.exportDir || '',
            placeholder: '.dsh/mode-exchange',
            onChange: value => patch('exportDir', value),
            hint: t('settings.exportDirHint'),
            mono: true,
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h(Toggle, {
            label: t('settings.keepExportCopy'),
            hint: t('settings.keepExportCopyHint'),
            checked: draft.keepExportCopy !== false,
            onChange: value => patch('keepExportCopy', value),
          }),
        ),
      ),

      h(Section, { title: t('settings.groupSafety') },
        confirmWarn === null
          ? h(Card, null,
            h(Toggle, {
              label: t('settings.confirm'),
              hint: t('settings.confirmHint'),
              checked: draft.confirmBeforeMigrate !== false,
              onChange: onConfirmToggle,
            }),
          )
          : h(Card, { tone: 'warn' },
            h(Notice, { kind: 'warn' }, t('settings.confirmWarn')),
            h('div', { className: 'dsh-me-footer' },
              h(Button, { onClick: () => setConfirmWarn(null) }, t('common.cancel')),
              h(Button, {
                variant: 'danger',
                onClick: () => { setConfirmWarn('yes'); patch('confirmBeforeMigrate', false) },
              }, t('common.confirm')),
            ),
          ),
      ),

      h('div', { className: 'dsh-me-footer' },
        typeof props.close === 'function' ? h(Button, { onClick: props.close }, t('common.close')) : null,
        h(Button, { variant: 'primary', onClick: save, disabled: busy }, busy ? t('settings.saving') : t('settings.save')),
      ),
    )
  }

  return Settings
}

/** 设置页图标（settings.section.icon）。size 由宿主给出，active 表示当前选中。 */
function makeSettingsIcon(React) {
  const h = React.createElement
  return function SettingsIcon(props) {
    const size = props && typeof props.size === 'number' ? props.size : 16
    const active = props && props.active === true
    return h('svg', {
      viewBox: '0 0 16 16',
      width: size,
      height: size,
      'aria-hidden': true,
      style: { display: 'block', opacity: active ? 1 : 0.78 },
    },
    h('path', {
      d: 'M2.5 4.5h8M13.5 4.5h0M2.5 11.5h2M7.5 11.5h6',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      fill: 'none',
    }),
    h('circle', { cx: 11.5, cy: 4.5, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
    h('circle', { cx: 5.5, cy: 11.5, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
    )
  }
}

  return {
    makeSettings,
    makeSettingsIcon,
  };
})();

/* ---- menu.js ---- */
const __mod_menu = (() => {
/**
 * 会话右键菜单：在宿主的会话列表行（target kind = 'session'）和会话标题「更多」菜单
 * （kind = 'sessionHeader'）里挂两个入口 ——「切换模式」（软切换）与「迁移重建」
 * （按目标模式建一个新会话），子菜单都按模式列叶子。
 *
 * 三条宿主契约决定了这里的写法（源自 @deepseek-ai/dsh-client-ui-context-menu）：
 *   1. resolve() 要么同步返回，要么在 resolutionTimeoutMs（默认 1000ms）内完成，
 *      所以这里只读内存缓存；网络刷新交给后台跑，刷完通过 observe 的快照触发重新解析。
 *   2. 带 children 的菜单项被点击时不会执行 run，只会展开子菜单 —— 切换动作只能放叶子上。
 *   3. 同一个 target + id 重复注册会抛 Duplicate menu contribution，所以每个 target 只注册一次。
 *
 * 服务取法：contextMenus 是可选依赖，不写进 entry 的 inject 列表，而是用
 * ctx.inject(['contextMenus', 'slots'], ...) 等它就绪；这样宿主没有该服务时，
 * 面板与设置页照常工作，不会被一起拖垮。
 */

const MENU_ID = 'mode-exchange.switch'
const MIGRATE_MENU_ID = 'mode-exchange.migrate'
const MENU_ORDER = 350
const ICON_KEY = 'mode-exchange.switch'
const TARGETS = ['session', 'sessionHeader']
/** 已经挂过菜单的 api 实例（每个插件实例一份），用于防重复注册。 */
const MOUNTED = new WeakSet()
/** 缓存保鲜期：菜单每次打开都会尝试刷新，但同一份数据 15s 内不重复请求。 */
const FRESH_MS = 15000

/** 极简可观察快照：宿主 contextMenus 的 observe() 需要 getSnapshot / subscribe。 */
function createSnapshot(initial) {
  let value = initial
  const listeners = new Set()
  return {
    getSnapshot() { return value },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(next) {
      if (Object.is(next, value)) return
      value = next
      for (const listener of Array.from(listeners)) {
        try { listener(value) } catch (error) { void error }
      }
    },
  }
}

/**
 * 取一个可选服务。
 * Cordis 的 ctx 是 Proxy：访问没有 inject 的服务属性会直接抛错，可选链只挡
 * null/undefined、挡不住抛错，所以两条路径都得包 try/catch。
 */
function serviceOf(ctx, name) {
  if (!ctx) return undefined
  try {
    if (typeof ctx.get === 'function') {
      const value = ctx.get(name, false)
      if (value !== undefined && value !== null) return value
    }
  } catch (error) {
    void error
  }
  try {
    const value = ctx[name]
    if (value !== undefined && value !== null) return value
  } catch (error) {
    void error
  }
  return undefined
}

/** 会话列表行右键时宿主给的 target 是 { sessionId, displayTitle }。 */
function sessionIdOf(value) {
  if (!value || typeof value !== 'object') return ''
  const id = value.sessionId
  return typeof id === 'string' && id.length > 0 ? id : ''
}

function clip(text, limit) {
  const value = String(text === undefined || text === null ? '' : text)
  if (limit === undefined || value.length <= limit) return value
  return value.slice(0, limit) + '…'
}

/** 菜单图标：两条带箭头的滑轨，与侧栏入口同一套图形语言。 */
function makeIcon(h) {
  return function ModeExchangeMenuIcon() {
    return h('svg', {
      viewBox: '0 0 16 16',
      width: 14,
      height: 14,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      style: { display: 'block', pointerEvents: 'none' },
    },
    h('path', { d: 'M2.6 5.4h8.2' }),
    h('path', { d: 'M9 3.1 11.3 5.4 9 7.7' }),
    h('path', { d: 'M13.4 10.6H5.2' }),
    h('path', { d: 'M7 8.3 4.7 10.6 7 12.9' }),
    )
  }
}

/** 把两个 target 的贡献注册进宿主。 */
function install(scope, menus, deps) {
  const api = deps.api
  const store = deps.store
  const t = deps.t
  const h = deps.h
  // entry.js 会把插件级 ctx 塞进 deps；万一没有（比如单独复用这个模块），退回注册时拿到的 scope。
  const ctx = deps.ctx || scope
  if (typeof menus.register !== 'function') return undefined
  if (!api || typeof api.switchMode !== 'function') return undefined

  // 缓存形状：{ modes, config, modesError, modesAt, sessions: { [sessionId]: { currentMode, switchable, blockedReason, at } } }
  const state = createSnapshot({ modes: null, config: null, modesError: null, modesAt: 0, sessions: {} })
  const pending = new Set()
  let fetchingModes = false

  const patch = next => { state.set({ ...state.getSnapshot(), ...next }) }
  const patchSession = (sessionId, next) => {
    const current = state.getSnapshot()
    const previous = current.sessions[sessionId] || {}
    patch({ sessions: { ...current.sessions, [sessionId]: { ...previous, ...next } } })
  }
  const readSession = sessionId => state.getSnapshot().sessions[sessionId]

  /** 拉全部模式：/state 不带 sessionId 时返回模式清单、配置与能力。 */
  function refreshModes() {
    const current = state.getSnapshot()
    if (fetchingModes) return
    if (current.modes !== null && current.modesError === null && Date.now() - current.modesAt < FRESH_MS) return
    fetchingModes = true
    Promise.resolve()
      .then(() => api.getState(null))
      .then(value => {
        const modes = value && Array.isArray(value.modes) ? value.modes : []
        const config = value && value.config && typeof value.config === 'object' ? value.config : null
        patch({ modes, config, modesError: null, modesAt: Date.now() })
      })
      .catch(error => {
        patch({ modesError: error && error.message ? error.message : String(error), modesAt: Date.now() })
      })
      .then(() => { fetchingModes = false })
  }

  /** 拉某个会话的当前模式与可切换性（用来标记当前模式、提前禁掉不可切换的会话）。 */
  function refreshSession(sessionId) {
    const known = readSession(sessionId)
    if (known && Date.now() - (known.at || 0) < FRESH_MS) return
    if (pending.has(sessionId)) return
    pending.add(sessionId)
    Promise.resolve()
      .then(() => api.getState(sessionId))
      .then(value => {
        patchSession(sessionId, {
          currentMode: value && value.currentMode ? String(value.currentMode) : null,
          switchable: !(value && value.switchable === false),
          blockedReason: value && value.blockedReason ? String(value.blockedReason) : null,
          at: Date.now(),
        })
      })
      .catch(() => {
        // 读不到状态时不拦用户，只记下已经尝试过。
        patchSession(sessionId, { at: Date.now() })
      })
      .then(() => { pending.delete(sessionId) })
  }

  /** action 是宿主 notice 上的一个文字按钮：{ label, run, failureLabel }。 */
  function notify(text, success, action) {
    try {
      if (typeof menus.notify !== 'function') return
      if (action === undefined) menus.notify(text, success === true)
      else menus.notify(text, success === true, action)
    } catch (error) {
      void error
    }
  }

  /** 迁移是后台长任务，菜单里只负责发起；后续进度在面板里看。 */
  function progressAction() {
    return {
      label: t('menu.viewProgress'),
      run: () => {
        const layout = serviceOf(ctx, 'layout')
        if (layout && typeof layout.selectPanel === 'function') layout.selectPanel('mode-exchange')
      },
      failureLabel: t('menu.panelUnavailable'),
    }
  }

  /** 执行一次切换：结果同时反馈到菜单提示与（面板开着同一个会话时）面板状态。 */
  function switchTo(sessionId, mode) {
    const label = mode && mode.name ? String(mode.name) : String(mode && mode.id ? mode.id : '')
    return Promise.resolve()
      .then(() => api.switchMode(sessionId, String(mode.id)))
      .then(value => {
        patchSession(sessionId, { currentMode: String(mode.id), switchable: true, blockedReason: null, at: Date.now() })
        try {
          const panel = store && typeof store.getState === 'function' ? store.getState() : null
          if (panel && panel.sessionId === sessionId && typeof store.set === 'function') {
            store.set({
              currentMode: String(mode.id),
              switched: true,
              snapshot: value && value.snapshot ? value.snapshot : panel.snapshot,
            })
          }
        } catch (error) {
          void error
        }
        notify(t('menu.switched', { mode: label }), true)
      })
      .catch(error => {
        notify(t('menu.failed', { reason: error && error.message ? error.message : String(error) }), false)
      })
  }

  /**
   * 执行一次迁移重建。
   * 菜单里没法弹二次确认框，所以这里把「点了模式」当成用户已经确认：
   * confirmDelete 传 true 才能越过台账对同一会话的幂等拦截。
   * 其余参数一律取用户在设置页配好的默认值，不在菜单里另开入口。
   */
  function migrateTo(sessionId, mode) {
    const label = mode && mode.name ? String(mode.name) : String(mode && mode.id ? mode.id : '')
    const config = state.getSnapshot().config || {}
    const backup = config.keepExportCopy !== false
    // 标记写进快照里（不是模块级 Set），这样 observe 会触发重新解析，叶子立刻变灰防重复点击。
    patchSession(sessionId, { migrating: true })
    notify(t('menu.migrating', { mode: label }), true)
    return Promise.resolve()
      .then(() => api.migrate({
        sessionId,
        mode: String(mode.id),
        deleteOld: config.deleteOldSession === true,
        team: config.enableTeam === true,
        confirmDelete: true,
        backup,
      }))
      .then(value => {
        if (value && value.needsResume) {
          notify(t('menu.migrateResume'), false, progressAction())
          return
        }
        notify(t('menu.migrateStarted', { mode: label }), true, progressAction())
        try {
          const panel = store && typeof store.getState === 'function' ? store.getState() : null
          if (typeof store.set === 'function' && value && value.jobId) {
            // 不要求面板正好停在这个会话上：面板会自己切到这条会话再展示进度。
            store.set({ job: value.jobId, jobSessionId: sessionId })
          }
        } catch (error) {
          void error
        }
      })
      .catch(error => {
        notify(t('menu.migrateFailed', { reason: error && error.message ? error.message : String(error) }), false, progressAction())
      })
      .then(() => { patchSession(sessionId, { migrating: false }) })
  }

  /** resolve 必须快：只读缓存，顺便把过期缓存丢给后台刷新。 */
  function render(sessionId) {
    if (sessionId.length === 0) return []
    refreshModes()
    refreshSession(sessionId)
    const current = state.getSnapshot()
    const info = readSession(sessionId)
    const blocked = info && info.blockedReason ? String(info.blockedReason) : ''
    const locked = blocked.length > 0 || Boolean(info && info.switchable === false)
    const modes = Array.isArray(current.modes) ? current.modes : []
    const children = []

    if (modes.length === 0) {
      const loading = current.modes === null && !current.modesError
      children.push({
        id: 'empty',
        label: loading ? t('menu.loading') : t('menu.noModes'),
        disabled: true,
      })
    } else {
      for (const mode of modes) {
        const id = String(mode && mode.id !== undefined && mode.id !== null ? mode.id : '')
        if (id.length === 0) continue
        const name = mode && mode.name ? String(mode.name) : id
        const isCurrent = Boolean(info && info.currentMode === id)
        children.push({
          id: 'mode:' + id,
          label: isCurrent ? t('menu.currentMode', { mode: name }) : name,
          disabled: locked || isCurrent || mode.broken === true,
          run: () => switchTo(sessionId, mode),
        })
      }
    }

    if (blocked.length > 0) {
      children.push({
        id: 'blocked',
        label: t('menu.blocked', { reason: clip(blocked, 60) }),
        disabled: true,
        separatorBefore: true,
      })
    }

    // 迁移重建的叶子与软切换不同：
    //   · 当前模式也能选（「用同一个模式重建一个干净会话」正是主要用法）；
    //   · 不理会 switchable —— 没有活 Agent、已归档的会话恰恰是最需要重建的。
    const migrating = Boolean(info && info.migrating === true)
    const migrateChildren = []
    if (modes.length === 0) {
      const loading = current.modes === null && !current.modesError
      migrateChildren.push({
        id: 'empty',
        label: loading ? t('menu.loading') : t('menu.noModes'),
        disabled: true,
      })
    } else {
      for (const mode of modes) {
        const id = String(mode && mode.id !== undefined && mode.id !== null ? mode.id : '')
        if (id.length === 0) continue
        const name = mode && mode.name ? String(mode.name) : id
        const isCurrent = Boolean(info && info.currentMode === id)
        migrateChildren.push({
          id: 'migrate:' + id,
          label: isCurrent ? t('menu.currentMode', { mode: name }) : name,
          disabled: migrating || mode.broken === true,
          run: () => migrateTo(sessionId, mode),
        })
      }
    }
    if (migrating) {
      migrateChildren.push({
        id: 'migrating',
        label: t('menu.migratingItem'),
        disabled: true,
        separatorBefore: true,
      })
    }

    const entries = [{
      id: 'switch',
      label: t('menu.switch'),
      icon: { key: ICON_KEY },
      children,
    }]
    // 迁移要调 api.migrate：客户端与宿主版本不匹配时它可能不在，这时只保留切换入口。
    if (typeof api.migrate === 'function') {
      entries.push({
        id: 'migrate',
        label: t('menu.migrate'),
        icon: { key: ICON_KEY },
        children: migrateChildren,
      })
    }
    return entries
  }

  /**
   * 一个 target 上挂两条贡献（切换 / 迁移）：宿主按 target + id 去重，
   * 同一个 id 只能注册一次，而两条入口的顺序与 id 都不同，所以分开注册。
   */
  const ENTRIES = [
    { id: MENU_ID, order: MENU_ORDER, pick: 'switch' },
    { id: MIGRATE_MENU_ID, order: MENU_ORDER + 1, pick: 'migrate' },
  ]

  const disposers = []
  for (const target of TARGETS) {
    for (const entry of ENTRIES) {
      // 注册失败（例如同一 target 上已有同名贡献）不能冒到 apply()，
      // 否则整个客户端插件都会挂掉 —— 少一个右键菜单远比面板消失好。
      const register = () => {
        try {
          const dispose = menus.register({
            id: entry.id,
            target,
            order: entry.order,
            observe: () => [state],
            resolve: value => {
              const actions = render(sessionIdOf(value))
              const action = actions.find(item => item.id === entry.pick)
              if (!action) return []
              // 会话标题的「更多」菜单项目很密，加一条分隔线把它与内置项分开。
              return [target === 'sessionHeader' ? { ...action, separatorBefore: true } : action]
            },
          })
          return typeof dispose === 'function' ? dispose : () => {}
        } catch (error) {
          void error
          return () => {}
        }
      }
      if (typeof scope.effect === 'function') {
        scope.effect(() => {
          const dispose = register()
          return () => { if (typeof dispose === 'function') dispose() }
        }, 'mode-exchange: ' + target + ' ' + entry.id)
      } else {
        disposers.push(register())
      }
    }
  }

  // 图标走 keyed 插槽；注册失败（宿主没有该插槽）不影响菜单功能本身。
  const slots = serviceOf(scope, 'slots')
  if (slots && typeof slots.inject === 'function' && typeof slots.register === 'function') {
    try {
      slots.inject('contextMenu.icon', function* icons() {
        yield slots.register({ name: 'contextMenu.icon', key: ICON_KEY }, makeIcon(h))
      })
    } catch (error) {
      void error
    }
  }

  return () => {
    for (const dispose of disposers) {
      if (typeof dispose === 'function') dispose()
    }
  }
}

/**
 * 挂上会话右键菜单。
 * contextMenus 是可选依赖：先直接取，取不到就等 ctx.inject 就绪后再注册。
 */
function mountSessionMenu(ctx, deps) {
  // 宿主对同一个 target+id 的重复注册会抛 Duplicate menu contribution，
  // 而 apply() 在宿主重建插件时可能被调多次，所以这里按 api 实例做一次幂等保护。
  const api = deps ? deps.api : undefined
  if (api && typeof api === 'object') {
    if (MOUNTED.has(api)) return
    MOUNTED.add(api)
  }
  const menus = serviceOf(ctx, 'contextMenus')
  if (menus) {
    install(ctx, menus, deps)
    return
  }
  if (typeof ctx.inject !== 'function') return
  try {
    ctx.inject(['contextMenus', 'slots'], scope => {
      const ready = serviceOf(scope, 'contextMenus')
      if (ready) install(scope, ready, deps)
    })
  } catch (error) {
    void error
  }
}

  return {
    serviceOf,
    mountSessionMenu,
  };
})();

/* ---- entry.js ---- */
const __mod_entry = (() => {
/**
 * 客户端入口。注册四个插槽与一份样式表：
 *   1. sidebar.panellist(id=mode-exchange) —— 侧栏图标入口（点击切到 main 面板）
 *   2. main(key=mode-exchange)             —— 中央面板承载模式切换与迁移重建
 *   3. settings.section(id=mode-exchange)  —— 插件设置页
 *   4. settings.section.icon               —— 设置页图标
 *
 * 全部注册都放在 ctx.effect() / ctx.slots.inject() 里，插件卸载时自动清理。
 * 样式走宿主提供的 styles.insert()，不向 document.body 追加节点。
 */

const { setLocale, registerLocale, t } = __mod_i18n;
const { ensureGlobalStyle, dropGlobalStyle, bindUiReact } = __mod_ui;
const { createApi } = __mod_api;
const { createStore } = __mod_store;
const { makePanel } = __mod_panel;
const { makeSettings, makeSettingsIcon } = __mod_settings;
const { mountSessionMenu } = __mod_menu;
const PANEL_KEY = 'mode-exchange'
const SETTINGS_ID = 'mode-exchange'
const PANEL_ENTRY_ID = 'mode-exchange'

/**
 * 从 sessions 服务的列表快照里找出「当前主视图占用的会话」。
 * 依据：SessionSummary.retainedBy.mainView > 0 —— 这是宿主自己判定「当前会话」的口径。
 * 取不到返回 null，面板会提示用户先打开一个会话。
 */
function mainViewSessionId(sessions) {
  try {
    const snapshot = sessions && sessions.list ? sessions.list.getSnapshot() : undefined
    const byId = snapshot ? snapshot.byId : undefined
    if (!byId) return null
    for (const row of Object.values(byId)) {
      if (!row) continue
      const retained = row.retainedBy ? row.retainedBy.mainView : 0
      if (typeof retained === 'number' && retained > 0) return String(row.id)
    }
    return null
  } catch (error) {
    void error
    return null
  }
}

/** 供 bundle 生成脚本调用的工厂。 */
function startModeExchangeClient(require) {
  const React = require('react')
  const h = React.createElement
  // 先绑定 React，ui.js 里的共享组件依赖它（否则渲染即抛错 → 面板/设置页白屏）
  bindUiReact(React)

  return {
    inject: ['slots', 'sessions', 'locale', 'layout'],
    apply(ctx) {
      // ---- 语言：跟随宿主 locale，取不到回退中文 ----
      try {
        const locale = ctx.get('locale')
        if (locale && typeof locale.getSnapshot === 'function') {
          const snapshot = locale.getSnapshot()
          setLocale(snapshot && snapshot.locale ? snapshot.locale : 'zh')
        }
      } catch (error) {
        void error
      }
      try {
        registerLocale(ctx)
      } catch (error) {
        // 语言包注册失败不该连累插槽：界面会退回中文兜底文案。
        console.error('[dsh-mode-exchange] locale 注册失败：', error)
      }

      const api = createApi(t)
      const store = createStore()
      const deps = { api, store, t, ctx, h }

      /**
       * ---- 样式：贴一份到 document.head ----
       * 宿主的 Web 宿主里没有 'styles' 服务（ctx.get('styles') 拿不到），
       * 也不存在 globalThis.__dshStylesInsert —— 之前那条链路是死的，CSS 从未生效，
       * 所以面板/设置页只剩纯文本堆叠。这里改为直接建 <style>（宿主自带插件都这么做），
       * 按 data-plugin-css 去重，并在每个面板/设置页根节点再渲染一份 <StyleTag/> 兜底。
       */
      try {
        ctx.effect(() => {
          const tag = ensureGlobalStyle()
          return () => { dropGlobalStyle(tag) }
        }, 'mode-exchange styles')
      } catch (error) {
        // 样式挂不上只是丑，不该拖垮插槽注册。
        console.error('[dsh-mode-exchange] 样式注入失败：', error)
      }

      /**
       * 订阅「当前会话」。sessions.list 是可观察快照，订阅后跟随主视图切换实时更新，
       * 不再用 location 正则去猜。
       */
      function useActiveSessionId() {
        const sessions = ctx.get('sessions')
        const read = () => mainViewSessionId(sessions)
        const [sessionId, setSessionId] = React.useState(read)
        React.useEffect(() => {
          if (!sessions || !sessions.list || typeof sessions.list.subscribe !== 'function') return undefined
          const sync = () => {
            const next = read()
            setSessionId(previous => (previous === next ? previous : next))
          }
          sync()
          const dispose = sessions.list.subscribe(sync)
          return () => { if (typeof dispose === 'function') dispose() }
        }, [])
        return sessionId
      }

      /**
       * 逐项注册插槽。
       *
       * 宿主不同版本的插槽名并不保证齐全（例如某些版本没有 settings.section.icon），
       * 而 ctx.slots.inject 命中不存在的插槽时会抛错。裸写法下任何一处抛错都会中断整个
       * apply，后面的入口全部注册不上 —— 表现正是「插件显示已启动，侧栏图标和设置分节却
       * 一个都不见了」。所以这里统一兜住：一项失败只记日志，不影响其余入口。
       */
      function safeSlot(name, register) {
        try {
          ctx.slots.inject(name, register)
        } catch (error) {
          try {
            console.error('[dsh-mode-exchange] ' + name + ' 插槽注册失败：', error)
          } catch (ignored) {
            void ignored
          }
        }
      }

      // ---- 中央面板 ----
      safeSlot('main', () => ctx.slots.register(
        { name: 'main', key: PANEL_KEY, order: 40 },
        function ModeExchangePanel(props) {
          const sessionId = useActiveSessionId()
          const Panel = makePanel(React, deps)
          return h(Panel, {
            sessionId: sessionId || (props && props.sessionId) || null,
            onClose: props && props.closePanel,
          })
        },
      ))

      // ---- 侧栏图标入口：id 与 main 的 key 同名，点击即切面板 ----
      safeSlot('sidebar.panellist', () => ctx.slots.register(
        {
          name: 'sidebar.panellist',
          id: PANEL_ENTRY_ID,
          order: 35,
          label: () => t('panel.title'),
        },
        function ModeExchangeIcon(props) {
          const size = props && typeof props.size === 'number' ? props.size : 18
          const active = props && props.active === true
          return h('svg', {
            viewBox: '0 0 16 16',
            width: size,
            height: size,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: active ? 1.7 : 1.3,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': true,
            style: { display: 'block', pointerEvents: 'none' },
          },
          h('path', { d: 'M2.5 4.5h5.2' }),
          h('path', { d: 'M10.3 4.5h3.2' }),
          h('path', { d: 'M2.5 11.5h3.2' }),
          h('path', { d: 'M8.3 11.5h5.2' }),
          h('circle', { cx: 9, cy: 4.5, r: 1.5 }),
          h('circle', { cx: 7, cy: 11.5, r: 1.5 }),
          )
        },
      ))

      // ---- 设置页与图标 ----
      safeSlot('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: SETTINGS_ID, order: 62, label: () => t('settings.title') },
        makeSettings(React, deps),
      ))

      safeSlot('settings.section.icon', () => ctx.slots.register(
        { name: 'settings.section.icon', id: SETTINGS_ID, order: 62 },
        makeSettingsIcon(React),
      ))

      /**
       * ---- 会话右键菜单 ----
       * 在会话列表行（session）与标题「更多」（sessionHeader）里加「切换模式」子菜单。
       * contextMenus 是可选服务：缺席时这里静默跳过，面板与设置页不受影响。
       */
      try {
        mountSessionMenu(ctx, deps)
      } catch (error) {
        // contextMenus 是可选服务，缺席时静默跳过。
        console.error('[dsh-mode-exchange] 右键菜单挂载失败：', error)
      }
    },
  }
}

  return {
    PANEL_KEY,
    mainViewSessionId,
    startModeExchangeClient,
  };
})();

    Object.assign(module.exports, __mod_entry);
    return module.exports.startModeExchangeClient(require);
  },
});
