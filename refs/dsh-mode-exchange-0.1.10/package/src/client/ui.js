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

export const THEME = {
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
export function bindUiReact(React) {
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
export function styleCss() {
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
export function styleText() {
  if (cssCache === null) cssCache = styleCss()
  return cssCache
}

/**
 * 把样式表作为 React 元素渲染进组件树 —— 宿主 UI 插件规范认可的做法，
 * 组件卸载即自动移除；不依赖宿主的 styles 服务（该服务在 Web 宿主里并不存在）。
 */
export function StyleTag() {
  return h('style', { 'data-plugin-css': STYLE_ID }, styleText())
}

/**
 * 兜底：直接贴一份到 document.head（宿主自带插件 dsh-free-search / dsh-ops 都是这个路子），
 * 按 data-plugin-css 去重，重复调用无副作用。
 * 这样即使面板 / 设置页还没渲染过，样式也已经生效。
 */
export function ensureGlobalStyle() {
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
export function dropGlobalStyle(tag) {
  try {
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
  } catch (error) {
    void error
  }
}

/** 标题 + 副标题 + 右侧关闭按钮；size = 'lg' 用于设置页（对齐宿主的 18px 区块标题）。 */
export function PanelHead({ title, subtitle, onClose, closeLabel, size }) {
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
export function IconButton({ children, onClick, title, disabled }) {
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
export function Notice({ kind = 'note', children }) {
  if (children === undefined || children === null || children === '') return null
  return h('p', { className: 'dsh-me-notice', 'data-kind': kind },
    h('span', { className: 'dsh-me-noticedot' }),
    h('span', { className: 'dsh-me-noticetext' }, children),
  )
}

/** 一行「标签 + 值」。 */
export function Field({ label, value, mono }) {
  const text = value === undefined || value === null || value === '' ? '\u2014' : String(value)
  return h('div', { className: 'dsh-me-field' },
    h('span', { className: 'dsh-me-fieldlabel' }, label),
    h('span', { className: mono ? 'dsh-me-fieldvalue dsh-me-code' : 'dsh-me-fieldvalue' }, text),
  )
}

/** 卡片容器；tone = warn | error 时描边换成状态色。 */
export function Card({ children, tone }) {
  return h('div', { className: 'dsh-me-card', 'data-tone': tone }, children)
}

/** 分组：小标题（可带右侧操作）+ 内容。 */
export function Section({ title, action, children }) {
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
export function Tabs({ value, options, onChange }) {
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
export function Badge({ children, tone }) {
  return h('span', { className: 'dsh-me-badge', 'data-tone': tone }, children)
}

/** 空状态：图标 + 标题 + 说明。 */
export function EmptyState({ title, hint, icon }) {
  return h('div', { className: 'dsh-me-empty' },
    icon ? h('span', { className: 'dsh-me-emptyicon' }, icon) : null,
    title ? h('div', { className: 'dsh-me-emptytitle' }, title) : null,
    hint ? h('div', { className: 'dsh-me-emptydesc' }, hint) : null,
  )
}

/** 下拉框；options 为 [{ value, label, disabled?, hint? }]。 */
export function Select({ label, value, options, onChange, disabled, hint }) {
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
export function TextField({ label, value, onChange, placeholder, hint, disabled, mono }) {
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
export function TextArea({ label, value, onChange, placeholder, hint, disabled }) {
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
export function Toggle({ label, checked, onChange, disabled, hint, title }) {
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
export function Button({ children, onClick, disabled, variant, size, title, type }) {
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
export function StepList({ items }) {
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
export function Picker({ label, value, valueLabel, options, open, onOpenChange, onChange, disabled, empty, hint, icon }) {
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
export function formatTime(value) {
  if (value === undefined || value === null || value === '') return '\u2014'
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

/** 毫秒时长格式化。 */
export function formatElapsed(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '\u2014'
  if (ms < 1000) return ms + ' ms'
  const seconds = ms / 1000
  if (seconds < 60) return seconds.toFixed(1) + ' 秒'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds - minutes * 60)
  return minutes + ' 分 ' + rest + ' 秒'
}

/** 会话 ID 短显示。 */
export function shortSessionId(value) {
  const text = String(value === undefined || value === null ? '' : value)
  if (text === '') return '\u2014'
  const tail = text.replace(/^session-/, '')
  return tail.length > 10 ? tail.slice(0, 10) : tail
}
