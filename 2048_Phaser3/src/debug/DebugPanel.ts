import { GRID_ROWS, GRID_COLS, SHAPE_VALUES, STONE_VALUE } from '../config';

export interface DebugPanelGameAPI {
  debugSetCell(row: number, col: number, value: number | 'stone' | null): void;
  debugSetCurrentCandy(value: number): void;
  debugSetNextCandy(value: number | null): void;
  debugClearBoard(): void;
  debugRandomFill(emptyPct: number, stonePct: number): void;
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

type TabKey = 'board' | 'score' | 'log';

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
  private tabButtons: Record<TabKey, HTMLButtonElement | null> = { board: null, score: null, log: null };
  private scoreTotalEl: HTMLDivElement | null = null;
  private scoreLogEl: HTMLDivElement | null = null;
  private debugLogEl: HTMLDivElement | null = null;
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
    this.tabButtons = { board: null, score: null, log: null };
    this.scoreTotalEl = null;
    this.scoreLogEl = null;
    this.debugLogEl = null;
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
    bar.style.cssText = 'display:flex;gap:2px;margin-bottom:14px;border-bottom:1px solid #e8eaf0';
    const boardBtn = this.makeTabButton('棋盘编辑', 'board');
    const scoreBtn = this.makeTabButton('积分统计', 'score');
    const logBtn = this.makeTabButton('日志', 'log');
    bar.appendChild(boardBtn);
    bar.appendChild(scoreBtn);
    bar.appendChild(logBtn);
    this.tabButtons.board = boardBtn;
    this.tabButtons.score = scoreBtn;
    this.tabButtons.log = logBtn;
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
    for (const k of ['board', 'score', 'log'] as const) {
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
  }

  private buildBoardTab(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(this.buildBoardSection());
    wrap.appendChild(this.buildCandySection());
    wrap.appendChild(this.buildRatesSection());
    wrap.appendChild(this.buildActionsSection());
    this.boardTab = wrap;
    return wrap;
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
  ): { row: HTMLElement; input: HTMLInputElement } {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.cssText = 'color:#55596b;font-size:12px';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '100';
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
