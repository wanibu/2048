import { GRID_ROWS, GRID_COLS, SHAPE_VALUES, STONE_VALUE } from '../config';

export interface StoneExplodeParams {
  frameSize: number;
  frameDuration: number;
  containerOffsetX: number;
  containerOffsetY: number;
  frames: Array<{ x: number; y: number; w: number; h: number }>;
  frameOffsets: Array<{ x: number; y: number }>;
}

// 和 StoneExplodeParams 结构一致，只是帧数不同（9 帧）
export type MergeEffectParams = StoneExplodeParams;

export interface DebugPanelGameAPI {
  debugSetCell(row: number, col: number, value: number | 'stone' | null): void;
  debugSetCurrentCandy(value: number): void;
  debugSetNextCandy(value: number | null): void;
  debugClearBoard(): void;
  debugRandomFill(emptyPct: number, stonePct: number): void;
  debugPlayStoneExplode(): void;
  debugPlayCandyMerge(): void;
  debugPlayMergeEffect(): void;
  debugGetStoneExplodeParams(): StoneExplodeParams;
  debugSetStoneExplodeParams(params: StoneExplodeParams): void;
  debugResetStoneExplodeParams(): StoneExplodeParams;
  debugGetMergeEffectParams(): MergeEffectParams;
  debugSetMergeEffectParams(params: MergeEffectParams): void;
  debugResetMergeEffectParams(): MergeEffectParams;
  debugGetBoardSnapshot(): { grid: number[][]; current: number; next: number | null };
  debugGetScore(): number;
}

const DESKTOP_BREAKPOINT = 768;
const PANEL_WIDTH = 440;
const CELL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '—' },
  { value: 'S', label: 'S' },
  ...[...SHAPE_VALUES].reverse().map((v) => ({ value: String(v), label: String(v) })),
];
const CANDY_OPTIONS_REQUIRED = [...SHAPE_VALUES].reverse().map((v) => ({
  value: String(v),
  label: String(v),
}));
const CANDY_OPTIONS_NULLABLE = [
  { value: '', label: '—' },
  ...CANDY_OPTIONS_REQUIRED,
];

type TabKey = 'board' | 'score' | 'log' | 'explode' | 'merge';

export class DebugPanel {
  private api: DebugPanelGameAPI;
  private root: HTMLDivElement | null = null;
  private panel: HTMLDivElement | null = null;
  private openBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private isOpen: boolean = false;
  private cellSelects: HTMLSelectElement[][] = [];
  private currentSelect: HTMLSelectElement | null = null;
  private nextSelect: HTMLSelectElement | null = null;
  private emptyRateInput: HTMLInputElement | null = null;
  private stoneRateInput: HTMLInputElement | null = null;
  private boardTab: HTMLDivElement | null = null;
  private scoreTab: HTMLDivElement | null = null;
  private logTab: HTMLDivElement | null = null;
  private explodeTab: HTMLDivElement | null = null;
  private mergeTab: HTMLDivElement | null = null;
  private tabButtons: Record<TabKey, HTMLButtonElement | null> = { board: null, score: null, log: null, explode: null, merge: null };
  private scoreTotalEl: HTMLDivElement | null = null;
  private scoreLogEl: HTMLDivElement | null = null;
  private debugLogEl: HTMLDivElement | null = null;
  private explodeInputs: {
    frameSize: HTMLInputElement | null;
    frameDuration: HTMLInputElement | null;
    containerOffsetX: HTMLInputElement | null;
    containerOffsetY: HTMLInputElement | null;
    showBoundingBox: HTMLInputElement | null;
    frames: Array<{ x: HTMLInputElement; y: HTMLInputElement; w: HTMLInputElement; h: HTMLInputElement; visible: HTMLInputElement }>;
    frameOffsets: Array<{ x: HTMLInputElement; y: HTMLInputElement }>;
  } = {
    frameSize: null,
    frameDuration: null,
    containerOffsetX: null,
    containerOffsetY: null,
    showBoundingBox: null,
    frames: [],
    frameOffsets: [],
  };
  private overlayLayers: HTMLDivElement[] = [];
  private animPlayerEl: HTMLDivElement | null = null;
  private animInterval: number | null = null;

  private mergeInputs: {
    frameSize: HTMLInputElement | null;
    frameDuration: HTMLInputElement | null;
    containerOffsetX: HTMLInputElement | null;
    containerOffsetY: HTMLInputElement | null;
    frames: Array<{ x: HTMLInputElement; y: HTMLInputElement; w: HTMLInputElement; h: HTMLInputElement; visible: HTMLInputElement }>;
    frameOffsets: Array<{ x: HTMLInputElement; y: HTMLInputElement }>;
  } = {
    frameSize: null,
    frameDuration: null,
    containerOffsetX: null,
    containerOffsetY: null,
    frames: [],
    frameOffsets: [],
  };
  private mergeOverlayLayers: HTMLDivElement[] = [];
  private mergeAnimPlayerEl: HTMLDivElement | null = null;
  private mergeAnimInterval: number | null = null;
  private resizeHandler: () => void;

  constructor(api: DebugPanelGameAPI) {
    this.api = api;
    this.resizeHandler = () => this.updateVisibility();
  }

  mount(): void {
    if (this.root) return;
    document.getElementById('giant2048-debug-panel')?.remove();

    const root = document.createElement('div');
    root.id = 'giant2048-debug-panel';
    // 容器本身无视觉，只作为命名空间；子元素都是 fixed 定位
    root.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:9999';

    const panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed',
      'top:0',
      'right:0',
      `width:${PANEL_WIDTH}px`,
      'height:100vh',
      'background:#ffffff',
      'color:#1f2230',
      'padding:16px 16px',
      'box-sizing:border-box',
      'overflow-y:auto',
      'font-family:ui-monospace,Menlo,Consolas,monospace',
      'font-size:13px',
      'box-shadow:-4px 0 16px rgba(0,0,0,0.2)',
      'user-select:none',
      'touch-action:auto',
      'display:none',
    ].join(';');
    this.panel = panel;

    // 面板内左上角的关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = '关闭 DEBUG 面板';
    closeBtn.style.cssText = [
      'position:absolute',
      'top:8px',
      'left:8px',
      'width:32px',
      'height:32px',
      'background:transparent',
      'color:#55596b',
      'border:none',
      'border-radius:4px',
      'cursor:pointer',
      'font-family:inherit',
      'font-size:22px',
      'font-weight:bold',
      'line-height:1',
    ].join(';');
    closeBtn.addEventListener('mouseenter', () => (closeBtn.style.background = '#f0f1f5'));
    closeBtn.addEventListener('mouseleave', () => (closeBtn.style.background = 'transparent'));
    closeBtn.addEventListener('click', () => this.setOpen(false));
    this.closeBtn = closeBtn;
    panel.appendChild(closeBtn);

    const contentWrap = document.createElement('div');
    contentWrap.style.cssText = 'padding-top:24px';
    contentWrap.appendChild(this.buildHeader());
    contentWrap.appendChild(this.buildTabBar());
    contentWrap.appendChild(this.buildBoardTab());
    contentWrap.appendChild(this.buildScoreTab());
    contentWrap.appendChild(this.buildLogTab());
    contentWrap.appendChild(this.buildExplodeTab());
    contentWrap.appendChild(this.buildMergeEffectTab());
    panel.appendChild(contentWrap);

    // 右侧浮动的 DEBUG 打开按钮（默认可见，开启后隐藏）
    const openBtn = document.createElement('button');
    openBtn.textContent = 'DEBUG';
    openBtn.title = '打开 DEBUG 面板';
    openBtn.style.cssText = [
      'position:fixed',
      'top:20px',
      'right:0',
      'padding:10px 14px',
      'background:#ffd54a',
      'color:#1f2230',
      'border:none',
      'border-radius:6px 0 0 6px',
      'cursor:pointer',
      'font-family:inherit',
      'font-size:13px',
      'font-weight:bold',
      'letter-spacing:1px',
      'box-shadow:-2px 2px 8px rgba(0,0,0,0.25)',
    ].join(';');
    openBtn.addEventListener('click', () => this.setOpen(true));
    this.openBtn = openBtn;

    root.appendChild(panel);
    root.appendChild(openBtn);
    document.body.appendChild(root);
    this.root = root;

    this.setActiveTab('board');
    this.setOpen(false);
    window.addEventListener('resize', this.resizeHandler);
    this.updateVisibility();
  }

  unmount(): void {
    if (!this.root) return;
    this.stopAnimPreview();
    this.stopMergeAnimPreview();
    this.overlayLayers = [];
    this.animPlayerEl = null;
    this.mergeOverlayLayers = [];
    this.mergeAnimPlayerEl = null;
    window.removeEventListener('resize', this.resizeHandler);
    this.root.remove();
    this.root = null;
    this.panel = null;
    this.openBtn = null;
    this.closeBtn = null;
    this.cellSelects = [];
    this.currentSelect = null;
    this.nextSelect = null;
    this.emptyRateInput = null;
    this.stoneRateInput = null;
    this.boardTab = null;
    this.scoreTab = null;
    this.logTab = null;
    this.explodeTab = null;
    this.mergeTab = null;
    this.tabButtons = { board: null, score: null, log: null, explode: null, merge: null };
    this.scoreTotalEl = null;
    this.scoreLogEl = null;
    this.debugLogEl = null;
    this.explodeInputs = {
      frameSize: null,
      frameDuration: null,
      containerOffsetX: null,
      containerOffsetY: null,
      showBoundingBox: null,
      frames: [],
      frameOffsets: [],
    };
    this.mergeInputs = {
      frameSize: null,
      frameDuration: null,
      containerOffsetX: null,
      containerOffsetY: null,
      frames: [],
      frameOffsets: [],
    };
  }

  refreshFromGame(): void {
    if (!this.root) return;
    const snapshot = this.api.debugGetBoardSnapshot();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const sel = this.cellSelects[r]?.[c];
        if (!sel) continue;
        const v = snapshot.grid[r][c];
        sel.value = v === STONE_VALUE ? 'S' : v === 0 ? '' : String(v);
      }
    }
    if (this.currentSelect) this.currentSelect.value = String(snapshot.current);
    if (this.nextSelect) {
      this.nextSelect.value = snapshot.next === null ? '' : String(snapshot.next);
    }
    this.refreshScoreTotal();
  }

  setVisible(visible: boolean): void {
    if (!this.root) return;
    this.root.style.display = visible ? 'block' : 'none';
  }

  logScoreEvent(description: string): void {
    if (!this.scoreLogEl) return;
    const entry = document.createElement('div');
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    const ss = String(ts.getSeconds()).padStart(2, '0');
    entry.style.cssText = [
      'padding:6px 8px',
      'border-bottom:1px solid #e8eaf0',
      'font-size:12px',
      'line-height:1.5',
      'color:#1f2230',
    ].join(';');
    entry.innerHTML = `<span style="color:#8d97ad">[${hh}:${mm}:${ss}]</span> ${description}`;
    this.scoreLogEl.insertBefore(entry, this.scoreLogEl.firstChild);
    this.refreshScoreTotal();
  }

  clearScoreLog(): void {
    if (this.scoreLogEl) this.scoreLogEl.innerHTML = '';
    this.refreshScoreTotal();
  }

  logDebugEvent(description: string, payload?: string): void {
    if (!this.debugLogEl) return;
    const entry = document.createElement('div');
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    const ss = String(ts.getSeconds()).padStart(2, '0');
    entry.style.cssText = [
      'padding:6px 8px',
      'border-bottom:1px solid #e8eaf0',
      'font-size:11px',
      'line-height:1.5',
      'color:#1f2230',
    ].join(';');
    const header = `<span style="color:#8d97ad">[${hh}:${mm}:${ss}]</span> ${description}`;
    if (payload) {
      entry.innerHTML = `${header}<pre style="margin:4px 0 0;padding:6px 8px;background:#f3f5f9;border-radius:3px;font-size:11px;white-space:pre;overflow-x:auto;color:#1f2230">${payload}</pre>`;
    } else {
      entry.innerHTML = header;
    }
    this.debugLogEl.insertBefore(entry, this.debugLogEl.firstChild);
  }

  clearDebugLog(): void {
    if (this.debugLogEl) this.debugLogEl.innerHTML = '';
  }

  private refreshScoreTotal(): void {
    if (!this.scoreTotalEl) return;
    this.scoreTotalEl.textContent = `当前总分: ${this.api.debugGetScore()}`;
  }

  private updateVisibility(): void {
    this.setVisible(window.innerWidth >= DESKTOP_BREAKPOINT);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    if (this.panel) this.panel.style.display = open ? 'block' : 'none';
    if (this.openBtn) this.openBtn.style.display = open ? 'none' : 'block';
    if (open) this.refreshFromGame();
  }

  private buildHeader(): HTMLElement {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:14px;font-weight:bold;margin-bottom:6px;color:#1f2230';
    h.textContent = 'DEBUG 模式';
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#8d97ad;margin-bottom:10px;line-height:1.4';
    hint.textContent = '手动设置棋盘后，在游戏里正常射击';
    const wrap = document.createElement('div');
    wrap.appendChild(h);
    wrap.appendChild(hint);
    return wrap;
  }

  private buildTabBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:2px;margin-bottom:14px;border-bottom:1px solid #e8eaf0;flex-wrap:wrap';
    const boardBtn = this.makeTabButton('棋盘编辑', 'board');
    const scoreBtn = this.makeTabButton('积分统计', 'score');
    const logBtn = this.makeTabButton('日志', 'log');
    const explodeBtn = this.makeTabButton('爆炸调试', 'explode');
    const mergeBtn = this.makeTabButton('合并特效', 'merge');
    bar.appendChild(boardBtn);
    bar.appendChild(scoreBtn);
    bar.appendChild(logBtn);
    bar.appendChild(explodeBtn);
    bar.appendChild(mergeBtn);
    this.tabButtons.board = boardBtn;
    this.tabButtons.score = scoreBtn;
    this.tabButtons.log = logBtn;
    this.tabButtons.explode = explodeBtn;
    this.tabButtons.merge = mergeBtn;
    return bar;
  }

  private makeTabButton(label: string, key: TabKey): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = [
      'background:transparent',
      'color:#55596b',
      'border:none',
      'border-bottom:2px solid transparent',
      'padding:8px 14px',
      'cursor:pointer',
      'font-family:inherit',
      'font-size:13px',
      'font-weight:bold',
    ].join(';');
    btn.addEventListener('click', () => this.setActiveTab(key));
    return btn;
  }

  private setActiveTab(tab: TabKey): void {
    if (this.boardTab) this.boardTab.style.display = tab === 'board' ? 'block' : 'none';
    if (this.scoreTab) this.scoreTab.style.display = tab === 'score' ? 'block' : 'none';
    if (this.logTab) this.logTab.style.display = tab === 'log' ? 'block' : 'none';
    if (this.explodeTab) this.explodeTab.style.display = tab === 'explode' ? 'block' : 'none';
    if (this.mergeTab) this.mergeTab.style.display = tab === 'merge' ? 'block' : 'none';
    for (const k of ['board', 'score', 'log', 'explode', 'merge'] as const) {
      const b = this.tabButtons[k];
      if (!b) continue;
      if (k === tab) {
        b.style.color = '#d48806';
        b.style.borderBottomColor = '#ffd54a';
      } else {
        b.style.color = '#55596b';
        b.style.borderBottomColor = 'transparent';
      }
    }
    if (tab === 'score') this.refreshScoreTotal();
    if (tab === 'explode') {
      this.refreshExplodeInputs();
      this.refreshOverlayPreview();
    } else {
      this.stopAnimPreview();
    }
    if (tab === 'merge') {
      this.refreshMergeInputs();
      this.refreshMergeOverlayPreview();
    } else {
      this.stopMergeAnimPreview();
    }
  }

  private buildBoardTab(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(this.buildBoardSection());
    wrap.appendChild(this.buildCandySection());
    wrap.appendChild(this.buildRatesSection());
    wrap.appendChild(this.buildActionsSection());
    wrap.appendChild(this.buildEffectTestSection());
    this.boardTab = wrap;
    return wrap;
  }

  private buildEffectTestSection(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:8px;display:flex;gap:8px';
    const stoneBtn = this.makeButton('石头爆炸', '#8d5a2c');
    stoneBtn.addEventListener('click', () => this.api.debugPlayStoneExplode());
    const mergeBtn = this.makeButton('糖果合并', '#9c44a8');
    mergeBtn.addEventListener('click', () => this.api.debugPlayCandyMerge());
    wrap.appendChild(stoneBtn);
    wrap.appendChild(mergeBtn);
    return wrap;
  }

  private buildExplodeTab(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.display = 'none';

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#55596b;margin-bottom:10px;line-height:1.5';
    hint.textContent = '修改参数后点"应用+播放"在游戏里看效果；下方叠加视图和预览与 config.ts 值同步';
    wrap.appendChild(hint);

    const params = this.api.debugGetStoneExplodeParams();

    const basicWrap = document.createElement('div');
    basicWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:12px';
    const frameSize = this.makeLabeledInput('显示尺寸(px)', String(params.frameSize));
    const frameDur = this.makeLabeledInput('每帧时长(ms)', String(params.frameDuration));
    const offX = this.makeLabeledInput('容器偏移 X', String(params.containerOffsetX));
    const offY = this.makeLabeledInput('容器偏移 Y', String(params.containerOffsetY));
    this.explodeInputs.frameSize = frameSize.input;
    this.explodeInputs.frameDuration = frameDur.input;
    this.explodeInputs.containerOffsetX = offX.input;
    this.explodeInputs.containerOffsetY = offY.input;
    basicWrap.appendChild(frameSize.row);
    basicWrap.appendChild(frameDur.row);
    basicWrap.appendChild(offX.row);
    basicWrap.appendChild(offY.row);
    wrap.appendChild(basicWrap);

    // 定位边框 checkbox
    const bboxRow = document.createElement('label');
    bboxRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:12px;cursor:pointer;font-size:12px;color:#1f2230';
    const bboxCb = document.createElement('input');
    bboxCb.type = 'checkbox';
    bboxCb.style.cssText = 'width:16px;height:16px;cursor:pointer';
    bboxRow.appendChild(bboxCb);
    const bboxLbl = document.createElement('span');
    bboxLbl.textContent = '游戏内播放显示定位边框（bounding box）';
    bboxRow.appendChild(bboxLbl);
    this.explodeInputs.showBoundingBox = bboxCb;
    wrap.appendChild(bboxRow);

    // Frames 表头
    const framesTitle = document.createElement('div');
    framesTitle.style.cssText = 'font-size:11px;color:#55596b;margin-bottom:4px';
    framesTitle.textContent = `Frames（共 ${params.frames.length} 帧）- 勾选 / x / y / w / h / offX / offY`;
    wrap.appendChild(framesTitle);

    const framesTable = document.createElement('div');
    framesTable.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:14px';
    params.frames.forEach((f, i) => {
      const offset = params.frameOffsets[i] || { x: 0, y: 0 };
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:22px 16px repeat(6,1fr);gap:3px;align-items:center';
      const idx = document.createElement('span');
      idx.textContent = String(i);
      idx.style.cssText = 'color:#8d97ad;font-size:10px;text-align:center';
      row.appendChild(idx);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.style.cssText = 'width:14px;height:14px;cursor:pointer';
      cb.addEventListener('change', () => this.refreshOverlayPreview());
      row.appendChild(cb);
      const fx = this.makeMiniInput(f.x);
      const fy = this.makeMiniInput(f.y);
      const fw = this.makeMiniInput(f.w);
      const fh = this.makeMiniInput(f.h);
      const ox = this.makeMiniInput(offset.x);
      const oy = this.makeMiniInput(offset.y);
      [fx, fy, fw, fh, ox, oy].forEach((el) =>
        el.addEventListener('input', () => this.refreshOverlayPreview()),
      );
      row.appendChild(fx);
      row.appendChild(fy);
      row.appendChild(fw);
      row.appendChild(fh);
      row.appendChild(ox);
      row.appendChild(oy);
      framesTable.appendChild(row);
      this.explodeInputs.frames.push({ x: fx, y: fy, w: fw, h: fh, visible: cb });
      this.explodeInputs.frameOffsets.push({ x: ox, y: oy });
    });
    wrap.appendChild(framesTable);

    // 8 帧叠加对比视图
    wrap.appendChild(this.buildOverlayPreview());
    // 连续动画预览视图
    wrap.appendChild(this.buildAnimPreview());

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';
    const applyBtn = this.makeButton('应用+游戏内播放', '#2f7ed8');
    applyBtn.addEventListener('click', () => {
      this.applyExplodeInputs();
      this.api.debugPlayStoneExplode();
    });
    const resetBtn = this.makeButton('重置为代码默认', '#6c7280');
    resetBtn.addEventListener('click', () => {
      const defaults = this.api.debugResetStoneExplodeParams();
      this.refreshExplodeInputs(defaults);
      this.refreshOverlayPreview();
    });
    actions.appendChild(applyBtn);
    actions.appendChild(resetBtn);
    wrap.appendChild(actions);

    // 导出 TS 代码
    const exportRow = document.createElement('div');
    exportRow.style.cssText = 'margin-top:10px';
    const exportBtn = this.makeButton('导出为 TS 代码（复制到剪贴板）', '#10b981');
    const exportStatus = document.createElement('div');
    exportStatus.style.cssText = 'font-size:11px;color:#10b981;margin-top:4px;min-height:14px';
    const exportPre = document.createElement('pre');
    exportPre.style.cssText = [
      'margin-top:8px',
      'padding:8px',
      'background:#f3f5f9',
      'border:1px solid #d0d4de',
      'border-radius:3px',
      'font-size:10px',
      'line-height:1.4',
      'white-space:pre',
      'overflow-x:auto',
      'max-height:220px',
      'overflow-y:auto',
      'display:none',
      'user-select:text',
    ].join(';');
    exportBtn.addEventListener('click', () => {
      const snippet = this.buildExplodeSnippet();
      exportPre.textContent = snippet;
      exportPre.style.display = 'block';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(snippet).then(
          () => { exportStatus.textContent = '✓ 已复制到剪贴板'; },
          () => { exportStatus.textContent = '⚠ 剪贴板不可用，请从下方文本框手动复制'; },
        );
      } else {
        exportStatus.textContent = '⚠ 剪贴板不可用，请从下方文本框手动复制';
      }
      setTimeout(() => { exportStatus.textContent = ''; }, 3000);
    });
    exportRow.appendChild(exportBtn);
    exportRow.appendChild(exportStatus);
    exportRow.appendChild(exportPre);
    wrap.appendChild(exportRow);

    this.explodeTab = wrap;
    return wrap;
  }

  private buildExplodeSnippet(): string {
    const p = this.readCurrentExplodeInputs();
    const lines: string[] = [];
    lines.push(`export const STONE_DESTROY_FRAME_SIZE = ${p.frameSize};`);
    lines.push(`export const STONE_DESTROY_CONTAINER_OFFSET_X = ${p.containerOffsetX};`);
    lines.push(`export const STONE_DESTROY_CONTAINER_OFFSET_Y = ${p.containerOffsetY};`);
    lines.push(`export const STONE_DESTROY_FRAME_DURATION_MS = ${p.frameDuration};`);
    lines.push('');
    lines.push('export const STONE_DESTROY_FRAME_OFFSETS = [');
    p.frameOffsets.forEach((o) => lines.push(`  { x: ${o.x}, y: ${o.y} },`));
    lines.push('];');
    lines.push('');
    lines.push('export const STONE_DESTROY_FRAMES: SpriteRegion[] = [');
    p.frames.forEach((f) => lines.push(`  { x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h} },`));
    lines.push('];');
    return lines.join('\n');
  }

  // ===== 合并特效调试（基本复用爆炸 tab 结构，用 mergeeffect-sheet0.png） =====

  private buildMergeEffectTab(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.display = 'none';

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#55596b;margin-bottom:10px;line-height:1.5';
    hint.textContent = 'mergeeffect-sheet0.png（512×1024），默认 3×3 网格切 9 帧，在游戏里播放或叠加预览里调整';
    wrap.appendChild(hint);

    const params = this.api.debugGetMergeEffectParams();

    const basicWrap = document.createElement('div');
    basicWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:12px';
    const frameSize = this.makeLabeledInput('显示尺寸(px)', String(params.frameSize));
    const frameDur = this.makeLabeledInput('每帧时长(ms)', String(params.frameDuration));
    const offX = this.makeLabeledInput('容器偏移 X', String(params.containerOffsetX));
    const offY = this.makeLabeledInput('容器偏移 Y', String(params.containerOffsetY));
    this.mergeInputs.frameSize = frameSize.input;
    this.mergeInputs.frameDuration = frameDur.input;
    this.mergeInputs.containerOffsetX = offX.input;
    this.mergeInputs.containerOffsetY = offY.input;
    basicWrap.appendChild(frameSize.row);
    basicWrap.appendChild(frameDur.row);
    basicWrap.appendChild(offX.row);
    basicWrap.appendChild(offY.row);
    wrap.appendChild(basicWrap);

    const framesTitle = document.createElement('div');
    framesTitle.style.cssText = 'font-size:11px;color:#55596b;margin-bottom:4px';
    framesTitle.textContent = `Frames（共 ${params.frames.length} 帧）- 勾选 / x / y / w / h / offX / offY`;
    wrap.appendChild(framesTitle);

    const framesTable = document.createElement('div');
    framesTable.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:14px';
    params.frames.forEach((f, i) => {
      const offset = params.frameOffsets[i] || { x: 0, y: 0 };
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:22px 16px repeat(6,1fr);gap:3px;align-items:center';
      const idx = document.createElement('span');
      idx.textContent = String(i);
      idx.style.cssText = 'color:#8d97ad;font-size:10px;text-align:center';
      row.appendChild(idx);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.style.cssText = 'width:14px;height:14px;cursor:pointer';
      cb.addEventListener('change', () => this.refreshMergeOverlayPreview());
      row.appendChild(cb);
      const fx = this.makeMiniInput(f.x);
      const fy = this.makeMiniInput(f.y);
      const fw = this.makeMiniInput(f.w);
      const fh = this.makeMiniInput(f.h);
      const ox = this.makeMiniInput(offset.x);
      const oy = this.makeMiniInput(offset.y);
      [fx, fy, fw, fh, ox, oy].forEach((el) =>
        el.addEventListener('input', () => this.refreshMergeOverlayPreview()),
      );
      row.appendChild(fx);
      row.appendChild(fy);
      row.appendChild(fw);
      row.appendChild(fh);
      row.appendChild(ox);
      row.appendChild(oy);
      framesTable.appendChild(row);
      this.mergeInputs.frames.push({ x: fx, y: fy, w: fw, h: fh, visible: cb });
      this.mergeInputs.frameOffsets.push({ x: ox, y: oy });
    });
    wrap.appendChild(framesTable);

    wrap.appendChild(this.buildMergeOverlayPreview(params.frames.length));
    wrap.appendChild(this.buildMergeAnimPreview());

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';
    const applyBtn = this.makeButton('应用+游戏内播放', '#2f7ed8');
    applyBtn.addEventListener('click', () => {
      this.applyMergeInputs();
      this.api.debugPlayMergeEffect();
    });
    const resetBtn = this.makeButton('重置为代码默认', '#6c7280');
    resetBtn.addEventListener('click', () => {
      const defaults = this.api.debugResetMergeEffectParams();
      this.refreshMergeInputs(defaults);
      this.refreshMergeOverlayPreview();
    });
    actions.appendChild(applyBtn);
    actions.appendChild(resetBtn);
    wrap.appendChild(actions);

    const exportRow = document.createElement('div');
    exportRow.style.cssText = 'margin-top:10px';
    const exportBtn = this.makeButton('导出为 TS 代码（复制到剪贴板）', '#10b981');
    const exportStatus = document.createElement('div');
    exportStatus.style.cssText = 'font-size:11px;color:#10b981;margin-top:4px;min-height:14px';
    const exportPre = document.createElement('pre');
    exportPre.style.cssText = [
      'margin-top:8px', 'padding:8px', 'background:#f3f5f9',
      'border:1px solid #d0d4de', 'border-radius:3px',
      'font-size:10px', 'line-height:1.4', 'white-space:pre',
      'overflow-x:auto', 'max-height:220px', 'overflow-y:auto',
      'display:none', 'user-select:text',
    ].join(';');
    exportBtn.addEventListener('click', () => {
      const snippet = this.buildMergeSnippet();
      exportPre.textContent = snippet;
      exportPre.style.display = 'block';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(snippet).then(
          () => { exportStatus.textContent = '✓ 已复制到剪贴板'; },
          () => { exportStatus.textContent = '⚠ 剪贴板不可用，请从下方文本框手动复制'; },
        );
      } else {
        exportStatus.textContent = '⚠ 剪贴板不可用，请从下方文本框手动复制';
      }
      setTimeout(() => { exportStatus.textContent = ''; }, 3000);
    });
    exportRow.appendChild(exportBtn);
    exportRow.appendChild(exportStatus);
    exportRow.appendChild(exportPre);
    wrap.appendChild(exportRow);

    this.mergeTab = wrap;
    return wrap;
  }

  private buildMergeOverlayPreview(frameCount: number): HTMLElement {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;color:#55596b;margin:6px 0 4px';
    title.textContent = `${frameCount} 帧叠加对比（对齐中心点用）`;
    const container = document.createElement('div');
    container.style.cssText = 'position:relative;width:256px;height:256px;border:2px solid #d9534f;background:#1a1d27';

    // 中心石头底图参考，方便对齐
    const base = document.createElement('div');
    base.style.cssText = [
      'position:absolute', 'left:64px', 'top:64px', 'width:128px', 'height:128px',
      "background:url('assets/images/border-sheet0.png') no-repeat",
      'background-position:-2px -1px',
      'border:1px dashed rgba(255,229,127,0.8)',
      'opacity:0.95', 'pointer-events:none',
    ].join(';');
    container.appendChild(base);

    for (let i = 0; i < frameCount; i++) {
      const layer = document.createElement('div');
      layer.style.cssText = [
        'position:absolute', 'top:0', 'left:0',
        "background:url('assets/images/mergeeffect-sheet0.png') no-repeat",
        'opacity:1',
      ].join(';');
      container.appendChild(layer);
      this.mergeOverlayLayers.push(layer);
    }

    const wrap = document.createElement('div');
    wrap.appendChild(title);
    wrap.appendChild(container);
    setTimeout(() => this.refreshMergeOverlayPreview(), 0);
    return wrap;
  }

  private buildMergeAnimPreview(): HTMLElement {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;color:#55596b;margin:14px 0 4px';
    title.textContent = '连续动画预览（按当前参数循环）';

    const container = document.createElement('div');
    container.style.cssText = 'position:relative;width:256px;height:256px;border:2px solid #ffd54a;background:#1a1d27;margin-bottom:6px';

    const base = document.createElement('div');
    base.style.cssText = [
      'position:absolute', 'left:64px', 'top:64px', 'width:128px', 'height:128px',
      "background:url('assets/images/border-sheet0.png') no-repeat",
      'background-position:-2px -1px',
      'border:1px dashed rgba(255,229,127,0.8)',
      'opacity:0.9', 'pointer-events:none',
    ].join(';');
    container.appendChild(base);

    const player = document.createElement('div');
    player.style.cssText = [
      'position:absolute', 'top:0', 'left:0',
      "background:url('assets/images/mergeeffect-sheet0.png') no-repeat",
      'display:none',
    ].join(';');
    container.appendChild(player);
    this.mergeAnimPlayerEl = player;

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px';
    const playBtn = this.makeButton('预览播放', '#2f7ed8');
    playBtn.addEventListener('click', () => this.startMergeAnimPreview());
    const stopBtn = this.makeButton('停止', '#6c7280');
    stopBtn.addEventListener('click', () => this.stopMergeAnimPreview());
    controls.appendChild(playBtn);
    controls.appendChild(stopBtn);

    const wrap = document.createElement('div');
    wrap.appendChild(title);
    wrap.appendChild(container);
    wrap.appendChild(controls);
    return wrap;
  }

  private refreshMergeOverlayPreview(): void {
    const p = this.readCurrentMergeInputs();
    this.mergeOverlayLayers.forEach((layer, i) => {
      const cb = this.mergeInputs.frames[i]?.visible;
      const frame = p.frames[i];
      const offset = p.frameOffsets[i] ?? { x: 0, y: 0 };
      if (!frame || !cb?.checked) {
        layer.style.display = 'none';
        return;
      }
      layer.style.display = 'block';
      layer.style.width = `${frame.w}px`;
      layer.style.height = `${frame.h}px`;
      layer.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
      layer.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    });
  }

  private startMergeAnimPreview(): void {
    this.stopMergeAnimPreview();
    const p = this.readCurrentMergeInputs();
    const player = this.mergeAnimPlayerEl;
    if (!player || p.frames.length === 0) return;
    let idx = 0;
    const show = (): void => {
      const frame = p.frames[idx];
      const offset = p.frameOffsets[idx] ?? { x: 0, y: 0 };
      player.style.display = 'block';
      player.style.width = `${frame.w}px`;
      player.style.height = `${frame.h}px`;
      player.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
      player.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    };
    show();
    this.mergeAnimInterval = window.setInterval(() => {
      idx = (idx + 1) % p.frames.length;
      show();
    }, Math.max(20, p.frameDuration));
  }

  private stopMergeAnimPreview(): void {
    if (this.mergeAnimInterval !== null) {
      clearInterval(this.mergeAnimInterval);
      this.mergeAnimInterval = null;
    }
    if (this.mergeAnimPlayerEl) this.mergeAnimPlayerEl.style.display = 'none';
  }

  private refreshMergeInputs(forced?: MergeEffectParams): void {
    const p = forced ?? this.api.debugGetMergeEffectParams();
    if (this.mergeInputs.frameSize) this.mergeInputs.frameSize.value = String(p.frameSize);
    if (this.mergeInputs.frameDuration) this.mergeInputs.frameDuration.value = String(p.frameDuration);
    if (this.mergeInputs.containerOffsetX) this.mergeInputs.containerOffsetX.value = String(p.containerOffsetX);
    if (this.mergeInputs.containerOffsetY) this.mergeInputs.containerOffsetY.value = String(p.containerOffsetY);
    p.frames.forEach((f, i) => {
      const row = this.mergeInputs.frames[i];
      if (!row) return;
      row.x.value = String(f.x);
      row.y.value = String(f.y);
      row.w.value = String(f.w);
      row.h.value = String(f.h);
      row.visible.checked = true;
    });
    p.frameOffsets.forEach((o, i) => {
      const row = this.mergeInputs.frameOffsets[i];
      if (!row) return;
      row.x.value = String(o.x);
      row.y.value = String(o.y);
    });
    this.refreshMergeOverlayPreview();
  }

  private applyMergeInputs(): void {
    const p = this.readCurrentMergeInputs();
    this.api.debugSetMergeEffectParams(p);
  }

  private readCurrentMergeInputs(): MergeEffectParams {
    const num = (el: HTMLInputElement | null, fallback: number): number => {
      if (!el) return fallback;
      const v = Number(el.value);
      return Number.isFinite(v) ? v : fallback;
    };
    const defaults = this.api.debugGetMergeEffectParams();
    const frames = this.mergeInputs.frames.map((row, i) => ({
      x: num(row.x, defaults.frames[i]?.x ?? 0),
      y: num(row.y, defaults.frames[i]?.y ?? 0),
      w: num(row.w, defaults.frames[i]?.w ?? 170),
      h: num(row.h, defaults.frames[i]?.h ?? 341),
    }));
    const frameOffsets = this.mergeInputs.frameOffsets.map((row, i) => ({
      x: num(row.x, defaults.frameOffsets[i]?.x ?? 0),
      y: num(row.y, defaults.frameOffsets[i]?.y ?? 0),
    }));
    return {
      frameSize: num(this.mergeInputs.frameSize, defaults.frameSize),
      frameDuration: num(this.mergeInputs.frameDuration, defaults.frameDuration),
      containerOffsetX: num(this.mergeInputs.containerOffsetX, defaults.containerOffsetX),
      containerOffsetY: num(this.mergeInputs.containerOffsetY, defaults.containerOffsetY),
      frames,
      frameOffsets,
    };
  }

  private buildMergeSnippet(): string {
    const p = this.readCurrentMergeInputs();
    const lines: string[] = [];
    lines.push(`export const MERGE_EFFECT_FRAME_SIZE = ${p.frameSize};`);
    lines.push(`export const MERGE_EFFECT_CONTAINER_OFFSET_X = ${p.containerOffsetX};`);
    lines.push(`export const MERGE_EFFECT_CONTAINER_OFFSET_Y = ${p.containerOffsetY};`);
    lines.push(`export const MERGE_EFFECT_FRAME_DURATION_MS = ${p.frameDuration};`);
    lines.push('');
    lines.push('export const MERGE_EFFECT_FRAME_OFFSETS = [');
    p.frameOffsets.forEach((o) => lines.push(`  { x: ${o.x}, y: ${o.y} },`));
    lines.push('];');
    lines.push('');
    lines.push('export const MERGE_EFFECT_FRAMES: SpriteRegion[] = [');
    p.frames.forEach((f) => lines.push(`  { x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h} },`));
    lines.push('];');
    return lines.join('\n');
  }

  private buildOverlayPreview(): HTMLElement {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;color:#55596b;margin:6px 0 4px';
    title.textContent = '8 帧叠加对比（对齐中心点用）';
    const container = document.createElement('div');
    container.style.cssText = 'position:relative;width:256px;height:256px;border:2px solid #d9534f;background:#1a1d27';

    // 石头底图参考（128×128 居中）
    const base = document.createElement('div');
    base.style.cssText = [
      'position:absolute',
      'left:64px',
      'top:64px',
      'width:128px',
      'height:128px',
      "background:url('assets/images/border-sheet0.png') no-repeat",
      'background-position:-2px -1px',
      'border:1px dashed rgba(255,229,127,0.8)',
      'opacity:0.95',
      'pointer-events:none',
    ].join(';');
    container.appendChild(base);

    for (let i = 0; i < 8; i++) {
      const layer = document.createElement('div');
      layer.style.cssText = [
        'position:absolute',
        'top:0',
        'left:0',
        "background:url('assets/images/stonedestroy-sheet0.png') no-repeat",
        'opacity:1',
      ].join(';');
      container.appendChild(layer);
      this.overlayLayers.push(layer);
    }

    const wrap = document.createElement('div');
    wrap.appendChild(title);
    wrap.appendChild(container);
    // 延迟到一次初始化后刷新
    setTimeout(() => this.refreshOverlayPreview(), 0);
    return wrap;
  }

  private buildAnimPreview(): HTMLElement {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;color:#55596b;margin:14px 0 4px';
    title.textContent = '连续动画预览（按当前参数循环）';

    const container = document.createElement('div');
    container.style.cssText = 'position:relative;width:256px;height:256px;border:2px solid #ffd54a;background:#1a1d27;margin-bottom:6px';

    const base = document.createElement('div');
    base.style.cssText = [
      'position:absolute',
      'left:64px',
      'top:64px',
      'width:128px',
      'height:128px',
      "background:url('assets/images/border-sheet0.png') no-repeat",
      'background-position:-2px -1px',
      'border:1px dashed rgba(255,229,127,0.8)',
      'opacity:0.9',
      'pointer-events:none',
    ].join(';');
    container.appendChild(base);

    const player = document.createElement('div');
    player.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      "background:url('assets/images/stonedestroy-sheet0.png') no-repeat",
      'display:none',
    ].join(';');
    container.appendChild(player);
    this.animPlayerEl = player;

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px';
    const playBtn = this.makeButton('预览播放', '#2f7ed8');
    playBtn.addEventListener('click', () => this.startAnimPreview());
    const stopBtn = this.makeButton('停止', '#6c7280');
    stopBtn.addEventListener('click', () => this.stopAnimPreview());
    controls.appendChild(playBtn);
    controls.appendChild(stopBtn);

    const wrap = document.createElement('div');
    wrap.appendChild(title);
    wrap.appendChild(container);
    wrap.appendChild(controls);
    return wrap;
  }

  private refreshOverlayPreview(): void {
    const p = this.readCurrentExplodeInputs();
    this.overlayLayers.forEach((layer, i) => {
      const cb = this.explodeInputs.frames[i]?.visible;
      const frame = p.frames[i];
      const offset = p.frameOffsets[i] ?? { x: 0, y: 0 };
      if (!frame || !cb?.checked) {
        layer.style.display = 'none';
        return;
      }
      layer.style.display = 'block';
      layer.style.width = `${frame.w}px`;
      layer.style.height = `${frame.h}px`;
      layer.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
      layer.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    });
  }

  private startAnimPreview(): void {
    this.stopAnimPreview();
    const p = this.readCurrentExplodeInputs();
    const player = this.animPlayerEl;
    if (!player || p.frames.length === 0) return;
    let idx = 0;
    const show = (): void => {
      const frame = p.frames[idx];
      const offset = p.frameOffsets[idx] ?? { x: 0, y: 0 };
      player.style.display = 'block';
      player.style.width = `${frame.w}px`;
      player.style.height = `${frame.h}px`;
      player.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
      player.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    };
    show();
    this.animInterval = window.setInterval(() => {
      idx = (idx + 1) % p.frames.length;
      show();
    }, Math.max(20, p.frameDuration));
  }

  private stopAnimPreview(): void {
    if (this.animInterval !== null) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    if (this.animPlayerEl) this.animPlayerEl.style.display = 'none';
  }

  private readCurrentExplodeInputs(): StoneExplodeParams {
    const num = (el: HTMLInputElement | null, fallback: number): number => {
      if (!el) return fallback;
      const v = Number(el.value);
      return Number.isFinite(v) ? v : fallback;
    };
    const defaults = this.api.debugGetStoneExplodeParams();
    const frames = this.explodeInputs.frames.map((row, i) => ({
      x: num(row.x, defaults.frames[i]?.x ?? 0),
      y: num(row.y, defaults.frames[i]?.y ?? 0),
      w: num(row.w, defaults.frames[i]?.w ?? 256),
      h: num(row.h, defaults.frames[i]?.h ?? 256),
    }));
    const frameOffsets = this.explodeInputs.frameOffsets.map((row, i) => ({
      x: num(row.x, defaults.frameOffsets[i]?.x ?? 0),
      y: num(row.y, defaults.frameOffsets[i]?.y ?? 0),
    }));
    return {
      frameSize: num(this.explodeInputs.frameSize, defaults.frameSize),
      frameDuration: num(this.explodeInputs.frameDuration, defaults.frameDuration),
      containerOffsetX: num(this.explodeInputs.containerOffsetX, defaults.containerOffsetX),
      containerOffsetY: num(this.explodeInputs.containerOffsetY, defaults.containerOffsetY),
      frames,
      frameOffsets,
    };
  }

  private makeMiniInput(value: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(value);
    input.style.cssText = [
      'width:100%',
      'min-width:0',
      'background:#ffffff',
      'color:#1f2230',
      'border:1px solid #d0d4de',
      'border-radius:3px',
      'padding:4px 4px',
      'font-family:inherit',
      'font-size:11px',
      'box-sizing:border-box',
    ].join(';');
    return input;
  }

  private refreshExplodeInputs(forced?: StoneExplodeParams): void {
    const p = forced ?? this.api.debugGetStoneExplodeParams();
    if (this.explodeInputs.frameSize) this.explodeInputs.frameSize.value = String(p.frameSize);
    if (this.explodeInputs.frameDuration) this.explodeInputs.frameDuration.value = String(p.frameDuration);
    if (this.explodeInputs.containerOffsetX) this.explodeInputs.containerOffsetX.value = String(p.containerOffsetX);
    if (this.explodeInputs.containerOffsetY) this.explodeInputs.containerOffsetY.value = String(p.containerOffsetY);
    p.frames.forEach((f, i) => {
      const row = this.explodeInputs.frames[i];
      if (!row) return;
      row.x.value = String(f.x);
      row.y.value = String(f.y);
      row.w.value = String(f.w);
      row.h.value = String(f.h);
      row.visible.checked = true;
    });
    p.frameOffsets.forEach((o, i) => {
      const row = this.explodeInputs.frameOffsets[i];
      if (!row) return;
      row.x.value = String(o.x);
      row.y.value = String(o.y);
    });
    this.refreshOverlayPreview();
  }

  private applyExplodeInputs(): void {
    const num = (el: HTMLInputElement | null, fallback: number): number => {
      if (!el) return fallback;
      const v = Number(el.value);
      return Number.isFinite(v) ? v : fallback;
    };
    const current = this.api.debugGetStoneExplodeParams();
    const frames = this.explodeInputs.frames.map((row, i) => ({
      x: num(row.x, current.frames[i]?.x ?? 0),
      y: num(row.y, current.frames[i]?.y ?? 0),
      w: num(row.w, current.frames[i]?.w ?? 256),
      h: num(row.h, current.frames[i]?.h ?? 256),
    }));
    const frameOffsets = this.explodeInputs.frameOffsets.map((row, i) => ({
      x: num(row.x, current.frameOffsets[i]?.x ?? 0),
      y: num(row.y, current.frameOffsets[i]?.y ?? 0),
    }));
    const params: StoneExplodeParams = {
      frameSize: num(this.explodeInputs.frameSize, current.frameSize),
      frameDuration: num(this.explodeInputs.frameDuration, current.frameDuration),
      containerOffsetX: num(this.explodeInputs.containerOffsetX, current.containerOffsetX),
      containerOffsetY: num(this.explodeInputs.containerOffsetY, current.containerOffsetY),
      frames,
      frameOffsets,
    };
    this.api.debugSetStoneExplodeParams(params);
  }

  isBoundingBoxVisible(): boolean {
    return !!this.explodeInputs.showBoundingBox?.checked;
  }

  private buildLogTab(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.display = 'none';

    const clearBtn = this.makeButton('清空日志', '#6c7280');
    clearBtn.style.marginBottom = '10px';
    clearBtn.addEventListener('click', () => this.clearDebugLog());

    const log = document.createElement('div');
    log.style.cssText = [
      'max-height:calc(100vh - 220px)',
      'overflow-y:auto',
      'background:#f7f8fb',
      'border:1px solid #e8eaf0',
      'border-radius:4px',
      'padding:2px',
    ].join(';');
    this.debugLogEl = log;

    wrap.appendChild(clearBtn);
    wrap.appendChild(log);
    this.logTab = wrap;
    return wrap;
  }

  private buildScoreTab(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.display = 'none';

    const total = document.createElement('div');
    total.style.cssText = [
      'font-size:16px',
      'font-weight:bold',
      'padding:10px 12px',
      'background:#fff9e5',
      'border:1px solid #ffe89a',
      'border-radius:4px',
      'color:#d48806',
      'margin-bottom:10px',
    ].join(';');
    total.textContent = '当前总分: 0';
    this.scoreTotalEl = total;

    const clearBtn = this.makeButton('清空日志', '#6c7280');
    clearBtn.style.marginBottom = '10px';
    clearBtn.addEventListener('click', () => this.clearScoreLog());

    const log = document.createElement('div');
    log.style.cssText = [
      'max-height:calc(100vh - 260px)',
      'overflow-y:auto',
      'background:#f7f8fb',
      'border:1px solid #e8eaf0',
      'border-radius:4px',
      'padding:2px',
    ].join(';');
    this.scoreLogEl = log;

    wrap.appendChild(total);
    wrap.appendChild(clearBtn);
    wrap.appendChild(log);
    this.scoreTab = wrap;
    return wrap;
  }

  private buildBoardSection(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:14px';
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;color:#55596b;margin-bottom:6px';
    title.textContent = '棋盘（5×5）';
    wrap.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${GRID_COLS},1fr);gap:5px`;
    for (let r = 0; r < GRID_ROWS; r++) {
      this.cellSelects[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const sel = this.makeSelect(CELL_OPTIONS, '');
        sel.style.padding = '0 2px';
        sel.style.fontSize = '16px';
        sel.style.height = '56px';
        sel.style.textAlign = 'center';
        sel.style.textAlignLast = 'center';
        sel.style.fontWeight = 'bold';
        sel.dataset.row = String(r);
        sel.dataset.col = String(c);
        sel.addEventListener('change', () => {
          const row = Number(sel.dataset.row);
          const col = Number(sel.dataset.col);
          const v = sel.value;
          let cellValue: number | 'stone' | null;
          if (v === '') cellValue = null;
          else if (v === 'S') cellValue = 'stone';
          else cellValue = Number(v);
          this.api.debugSetCell(row, col, cellValue);
        });
        grid.appendChild(sel);
        this.cellSelects[r][c] = sel;
      }
    }
    wrap.appendChild(grid);
    return wrap;
  }

  private buildCandySection(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:14px;display:flex;flex-direction:column;gap:8px';

    const cur = this.makeLabeledSelect('当前糖果', CANDY_OPTIONS_REQUIRED, '2');
    cur.select.addEventListener('change', () => {
      const v = Number(cur.select.value);
      if (Number.isFinite(v) && v > 0) this.api.debugSetCurrentCandy(v);
    });
    this.currentSelect = cur.select;

    const nxt = this.makeLabeledSelect('下一个糖果', CANDY_OPTIONS_NULLABLE, '4');
    nxt.select.addEventListener('change', () => {
      const raw = nxt.select.value;
      this.api.debugSetNextCandy(raw === '' ? null : Number(raw));
    });
    this.nextSelect = nxt.select;

    wrap.appendChild(cur.row);
    wrap.appendChild(nxt.row);
    return wrap;
  }

  private buildRatesSection(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:12px;display:flex;flex-direction:column;gap:8px';
    const empty = this.makeLabeledInput('空格比例(%)', '40');
    const stone = this.makeLabeledInput('石头比例(%)', '10');
    this.emptyRateInput = empty.input;
    this.stoneRateInput = stone.input;
    wrap.appendChild(empty.row);
    wrap.appendChild(stone.row);
    return wrap;
  }

  private buildActionsSection(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:6px;display:flex;gap:8px';

    const clearBtn = this.makeButton('清空棋盘', '#d9534f');
    clearBtn.addEventListener('click', () => {
      this.api.debugClearBoard();
      this.refreshFromGame();
    });

    const randBtn = this.makeButton('随机生成', '#2f7ed8');
    randBtn.addEventListener('click', () => {
      const emptyPct = this.clampPct(Number(this.emptyRateInput?.value ?? 40), 40);
      const stonePct = this.clampPct(Number(this.stoneRateInput?.value ?? 10), 10);
      const totalSkip = Math.min(100, emptyPct + stonePct);
      const adjustedStone = Math.max(0, totalSkip - emptyPct);
      this.api.debugRandomFill(emptyPct, adjustedStone);
      this.refreshFromGame();
    });

    wrap.appendChild(clearBtn);
    wrap.appendChild(randBtn);
    return wrap;
  }

  private clampPct(v: number, fallback: number): number {
    if (!Number.isFinite(v)) return fallback;
    return Math.max(0, Math.min(100, v));
  }

  private makeButton(label: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = [
      'flex:1',
      'padding:10px 8px',
      `background:${color}`,
      'color:#fff',
      'border:none',
      'border-radius:4px',
      'cursor:pointer',
      'font-size:13px',
      'font-weight:bold',
      'font-family:inherit',
    ].join(';');
    return btn;
  }

  private makeLabeledSelect(
    label: string,
    options: Array<{ value: string; label: string }>,
    defaultValue: string,
  ): { row: HTMLElement; select: HTMLSelectElement } {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.cssText = 'color:#55596b;font-size:12px';
    const sel = this.makeSelect(options, defaultValue);
    sel.style.flex = '0 0 140px';
    sel.style.fontSize = '13px';
    sel.style.padding = '6px 4px';
    row.appendChild(lbl);
    row.appendChild(sel);
    return { row, select: sel };
  }

  private makeLabeledInput(
    label: string,
    defaultValue: string,
    constraint?: { min?: number; max?: number },
  ): { row: HTMLElement; input: HTMLInputElement } {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.cssText = 'color:#55596b;font-size:12px';
    const input = document.createElement('input');
    input.type = 'number';
    if (constraint?.min !== undefined) input.min = String(constraint.min);
    if (constraint?.max !== undefined) input.max = String(constraint.max);
    input.value = defaultValue;
    input.style.cssText = [
      'flex:0 0 80px',
      'background:#ffffff',
      'color:#1f2230',
      'border:1px solid #d0d4de',
      'border-radius:3px',
      'padding:6px 6px',
      'font-family:inherit',
      'font-size:13px',
      'text-align:right',
    ].join(';');
    row.appendChild(lbl);
    row.appendChild(input);
    return { row, input };
  }

  private makeSelect(
    options: Array<{ value: string; label: string }>,
    defaultValue: string,
  ): HTMLSelectElement {
    const sel = document.createElement('select');
    sel.style.cssText = [
      'background:#ffffff',
      'color:#1f2230',
      'border:1px solid #d0d4de',
      'border-radius:3px',
      'padding:3px 4px',
      'font-family:inherit',
      'font-size:11px',
      'cursor:pointer',
    ].join(';');
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      sel.appendChild(o);
    }
    sel.value = defaultValue;
    return sel;
  }
}
