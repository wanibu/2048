import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRID_ROWS, GRID_COLS, SPAWN_NUMBER_MAX, SHAPE_VALUES, BASE_BG_REGION, ROTATE_BTN_REGION, STONE_DESTROY_FRAMES, STONE_DESTROY_FRAME_SIZE, STONE_DESTROY_CONTAINER_OFFSET_X, STONE_DESTROY_CONTAINER_OFFSET_Y, STONE_DESTROY_FRAME_DURATION_MS, STONE_DESTROY_FRAME_OFFSETS, MERGE_EFFECT_FRAMES, MERGE_EFFECT_FRAME_SIZE, MERGE_EFFECT_CONTAINER_OFFSET_X, MERGE_EFFECT_CONTAINER_OFFSET_Y, MERGE_EFFECT_FRAME_DURATION_MS, MERGE_EFFECT_FRAME_OFFSETS, COMBO_THRESHOLD, WOW_THRESHOLD, STONE_VALUE, SLING_DISPLAY_X, SLING_DISPLAY_Y, SLING_DISPLAY_HEIGHT, calcLayout, LayoutConfig } from '../config';
import { Grid } from '../objects/Grid';
import { ComboChainEffect } from '../objects/ComboChainEffect';
import { GameUiObjects } from '../objects/GameUiObjects';
import { Sling } from '../objects/Sling';
import { Shape } from '../objects/Shape';
import { Border } from '../objects/Border';
import { Stone } from '../objects/Stone';
import { MergeSystem, GhostBorder } from '../systems/MergeSystem';
import { RotateSystem } from '../systems/RotateSystem';
import { ActionRecorder } from '../systems/ActionRecorder';
import { setGameToken, authLogin } from '../utils/api';
import { HUD } from '../ui/HUD';
import { DebugPanel, StoneExplodeParams, MergeEffectParams, SNAPSHOT_STORAGE_KEY, SavedSnapshot } from '../debug/DebugPanel';

const IS_DEBUG = import.meta.env.VITE_DEBUG === '1';
const SCORE_DIGITS_X = 90;
const SCORE_DIGITS_Y = -173;
const TOP_SCORE_DIGITS_X = 90;
const TOP_SCORE_DIGITS_Y = -113;

type OriginalMergeTwinkleFrame = {
  textureKey: 'mergeeffect-full' | 'mergeeffect-full-1' | 'mergeeffect-full-2';
  frameKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pivotX: number;
  pivotY: number;
};

const ORIGINAL_MERGE_TWINKLE_FRAME_DURATION_MS = 40;
const ORIGINAL_MERGE_TWINKLE_FRAMES: OriginalMergeTwinkleFrame[] = [
  { textureKey: 'mergeeffect-full-1', frameKey: 'orig_merge_twinkle_0', x: 0, y: 0, w: 50, h: 64, pivotX: 0.320, pivotY: 0.391 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_1', x: 385, y: 897, w: 70, h: 90, pivotX: 0.314, pivotY: 0.344 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_2', x: 129, y: 897, w: 83, h: 106, pivotX: 0.313, pivotY: 0.330 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_3', x: 385, y: 769, w: 111, h: 125, pivotX: 0.423, pivotY: 0.384 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_4', x: 1, y: 769, w: 125, h: 154, pivotX: 0.448, pivotY: 0.481 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_5', x: 159, y: 513, w: 136, h: 185, pivotX: 0.463, pivotY: 0.514 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_6', x: 257, y: 1, w: 143, h: 207, pivotX: 0.469, pivotY: 0.541 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_7', x: 156, y: 257, w: 148, h: 226, pivotX: 0.473, pivotY: 0.566 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_8', x: 1, y: 257, w: 153, h: 227, pivotX: 0.477, pivotY: 0.568 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_9', x: 297, y: 513, w: 153, h: 164, pivotX: 0.484, pivotY: 0.409 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_10', x: 1, y: 513, w: 156, h: 167, pivotX: 0.481, pivotY: 0.431 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_11', x: 306, y: 257, w: 162, h: 168, pivotX: 0.463, pivotY: 0.458 },
  { textureKey: 'mergeeffect-full', frameKey: 'orig_merge_twinkle_12', x: 257, y: 961, w: 124, h: 62, pivotX: 0.250, pivotY: 1.306 },
  { textureKey: 'mergeeffect-full-2', frameKey: 'orig_merge_twinkle_13', x: 0, y: 0, w: 13, h: 13, pivotX: -6.462, pivotY: 3.077 },
];

export class GameScene extends Phaser.Scene {
  private static readonly SLING_PROMOTION_DELAY_MS = 150;
  // 调试输入区域时打开：按钮会打印定位日志，但不执行实际动作。
  private readonly debugDisableButtonActions = false;
  // 本地 dev (pnpm dev) 自动开按钮 hit-area 可视化；生产构建（pnpm build / build:debug）自动关
  private readonly showButtonHitAreaDebug = import.meta.env.DEV;
  // 分阶段调试：只渲染 PlayBackground，跳过 Girl / 棋盘 / 分数 / 按钮 / tray 等所有其他 UI
  private readonly debugBackgroundOnly = false;
  // Scene 是 Phaser 的主要工作单元。
  // 一个 Scene 往往对应一个页面状态，例如菜单、战斗、暂停后的主场景等。
  private grid!: Grid;
  private sling!: Sling;
  private mergeSystem!: MergeSystem;
  private rotateSystem!: RotateSystem;
  // ===== Debug 段创建、debug-after 段复用的可交互 UI sprite =====
  private giantHead!: Phaser.GameObjects.Image;
  private pauseBtn!: Phaser.GameObjects.Image;
  private soundBtn!: Phaser.GameObjects.Image;
  private rotateArrowL!: Phaser.GameObjects.Image;
  private rotateArrowR!: Phaser.GameObjects.Image;
  private recorder: ActionRecorder | null = null;
  private hud!: HUD;
  private layout!: LayoutConfig;
  private scoreDigits: Phaser.GameObjects.Image[] = [];
  private topScoreDigits: Phaser.GameObjects.Image[] = [];
  private isRotating: boolean = false;
  private isResolvingTurn: boolean = false;
  private isGameOver: boolean = false;
  private isPauseOpen: boolean = false;
  private lastLandedCol: number | undefined;
  private comboCount = 0;
  private comboFiredThisChain = false;
  private comboChainEffect!: ComboChainEffect;
  private debugPanel: DebugPanel | null = null;
  // 限时模式：URL 参数 ?mode=3m / 5m / 10m，未传 / 不合法 = 无限时
  private modeMs: number = 0;
  private modeRemainingMs: number = 0;
  private modeStartedAt: number = 0;
  private modeText: Phaser.GameObjects.Text | null = null;
  private modeTimer: Phaser.Time.TimerEvent | null = null;
  private debugCurrentCandy: number | null = 2;
  private debugNextCandy: number | null = 4;
  private stoneExplodeParams: StoneExplodeParams = this.defaultStoneExplodeParams();
  private stoneExplodeAnimBuildId: number = 0;
  private mergeEffectParams: MergeEffectParams = this.defaultMergeEffectParams();
  private mergeEffectAnimBuildId: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  // 默认 setInteractive() 有时会因为缩放/裁切和视觉区域不完全一致。
  // 这里显式按“当前显示尺寸”绑定热区，确保点击范围和看到的按钮一致。
  private bindHitAreaToDisplaySize(image: Phaser.GameObjects.Image, useHandCursor = true): void {
    image.setInteractive(
      new Phaser.Geom.Rectangle(
        0,
        0,
        image.displayWidth,
        image.displayHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    if (image.input) {
      image.input.cursor = useHandCursor ? 'pointer' : 'default';
    }
  }

  // 把按钮当前的交互区域可视化，便于调试热区与视觉位置是否一致。
  private addHitAreaDebugRect(
    container: Phaser.GameObjects.Container | null,
    image: Phaser.GameObjects.Image,
    color: number,
  ): void {
    if (!this.showButtonHitAreaDebug) return;
    const debugRect = this.add.rectangle(
      image.x,
      image.y,
      image.displayWidth,
      image.displayHeight,
    );
    debugRect.setOrigin(image.originX, image.originY);
    debugRect.setStrokeStyle(2, color, 0.95);
    debugRect.setFillStyle(color, 0.14);
    debugRect.setDepth(9999);
    if (container) {
      container.add(debugRect);
    }
  }

  // 对 UI 按钮，更稳的做法是叠一个独立的 Zone 当点击层，
  // 避免图片 frame / trim / origin 带来的命中偏差。
  private createButtonZone(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ): Phaser.GameObjects.Zone {
    const zone = this.add.zone(x, y, width, height);
    zone.setOrigin(0.5, 0.5);
    zone.setInteractive({ useHandCursor: true });

    if (this.showButtonHitAreaDebug) {
      const debugRect = this.add.rectangle(x, y, width, height);
      debugRect.setOrigin(0.5, 0.5);
      debugRect.setStrokeStyle(2, color, 0.95);
      debugRect.setFillStyle(color, 0.14);
      debugRect.setDepth(9999);
    }
    zone.setDepth(9998);

    return zone;
  }

  private logButtonBounds(label: string, image: Phaser.GameObjects.Image): void {
    const topLeft = image.getTopLeft();
    const bottomRight = image.getBottomRight();
    console.log(
      `[button-debug] ${label} center=(${Math.round(image.x)},${Math.round(image.y)}) ` +
      `bounds=(${Math.round(topLeft.x)},${Math.round(topLeft.y)})-(${Math.round(bottomRight.x)},${Math.round(bottomRight.y)}) ` +
      `size=${Math.round(image.displayWidth)}x${Math.round(image.displayHeight)}`
    );
  }

  create(): void {
    this.isGameOver = false;
    this.isResolvingTurn = false;
    this.isPauseOpen = false;
    this.ensureBackgroundMusic();

    // 模拟 C3 fullscreen scale-outer：把 640×960 的 design layout 居中到被拉大的视窗里。
    this.cameras.main.setScroll(
      (GAME_WIDTH - this.cameras.main.width) / 2,
      (GAME_HEIGHT - this.cameras.main.height) / 2,
    );
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const layout = calcLayout(w, h);

    const gameUi = new GameUiObjects(this, w, h);
    this.giantHead = gameUi.giantHead;
    this.pauseBtn = gameUi.pauseBtn;
    this.soundBtn = gameUi.soundBtn;
    this.rotateArrowL = gameUi.rotateArrowL;
    this.rotateArrowR = gameUi.rotateArrowR;
    this.comboChainEffect = new ComboChainEffect(this, gameUi.girl, gameUi.giantHead);

    if (this.debugBackgroundOnly) {
      return;
    }

    const tex = this.textures.get('shared0');

    // Giant 头像：debug 段已创建 this.giantHead（data.json 坐标 311,116 + angle 7°）。
    // 眨眼动画暂时没接入，B 阶段用 C3 的 Blink 定义（3 帧 28fps）回来。

    // ===== 右上角：暂停按钮 + 声音按钮 =====
    const tex3 = this.textures.get('shared2');
    // pauseBtn sprite 复用 debug 段创建的 this.pauseBtn（frame 'pause-inactive'/'pause-active'）
    const pauseBtn = this.pauseBtn;
    const pauseBtnZone = this.createButtonZone(
      pauseBtn.x,
      pauseBtn.y,
      pauseBtn.displayWidth,
      pauseBtn.displayHeight,
      0xff7a45,
    );

    // ===== 暂停面板 =====
    // Container 可以把多个对象当成一个整体管理。
    // 这里暂停遮罩、背景、人物、按钮都放进同一个 pauseContainer 里，
    // 这样显示/隐藏时只改一个容器就够了。
    const pauseContainer = this.add.container(0, -214).setDepth(150).setVisible(false);

    // 白色遮罩
    const pauseOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0.6);
    // 暂停打开后，让全屏遮罩吞掉其余点击，避免点到下层棋盘/按钮。
    pauseOverlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    pauseOverlay.on('pointerdown', () => {
      console.log('[pause-debug] overlay');
    });
    pauseContainer.add(pauseOverlay);

    // 暂停背景面板（pause-bg）
    if (!tex.has('pause-bg')) {
      tex.add('pause-bg', 0, 0, 0, 769, 1028);
    }
    const pauseBg = this.add.image(w / 2, h / 2 + 25, 'shared0', 'pause-bg');
    const pauseBgScale = w / 769;
    pauseBg.setScale(pauseBgScale);
    pauseContainer.add(pauseBg);

    // 睡觉小女孩
    const texS1 = this.textures.get('shared1');
    if (!texS1.has('sleep-girl')) {
      texS1.add('sleep-girl', 0, 0, 767, 519, 246);
    }
    const sleepGirl = this.add.image(w / 2, h / 2 - 240, 'shared1', 'sleep-girl');
    // const sleepGirlScale = w / 769;
    sleepGirl.setScale(1.21);
    pauseContainer.add(sleepGirl);

    // 首页按钮
    if (!tex3.has('home-btn')) {
      tex3.add('home-btn', 0, 262, 4, 232, 108);
    }
    const homeBtn = this.add.image(w / 2, h / 2 - 30, 'shared2', 'home-btn');
    // homeBtn.setScale(0.8);
    this.bindHitAreaToDisplaySize(homeBtn);
    this.addHitAreaDebugRect(pauseContainer, homeBtn, 0xff4d4f);
    homeBtn.on('pointerdown', () => {
      this.logButtonBounds('home', homeBtn);
      console.log('[pause-debug] home');
      if (this.debugDisableButtonActions) return;
      this.isPauseOpen = false;
      pauseContainer.setVisible(false);
      this.scene.start('MenuScene');
    });
    pauseContainer.add(homeBtn);

    // 恢复按钮（粉色）
    if (!texS1.has('pink-off-btn')) {
      texS1.add('pink-off-btn', 0, 0, 1794, 250, 140);
    }
    const resumeBtn = this.add.image(w / 2, h / 2 + 110, 'shared1', 'pink-off-btn');
    // resumeBtn.setScale(0.8);
    this.bindHitAreaToDisplaySize(resumeBtn);
    this.addHitAreaDebugRect(pauseContainer, resumeBtn, 0xeb2f96);
    resumeBtn.on('pointerdown', () => {
      this.logButtonBounds('restart', resumeBtn);
      console.log('[pause-debug] restart');
      if (this.debugDisableButtonActions) return;
      this.isPauseOpen = false;
      isPaused = false;
      pauseBtn.setTexture('shared2', 'pause-inactive');
      pauseContainer.setVisible(false);
      sessionStorage.removeItem('giant2048_state');
      sessionStorage.removeItem('giant2048_playing');
      void this.recorder?.finish(this.hud.getScore(), 'restart');
            this.scene.restart();
    });
    pauseContainer.add(resumeBtn);

    // 绿色播放按钮
    if (!texS1.has('play-green-btn')) {
      texS1.add('play-green-btn', 0, 772, 1277, 250, 140);
    }
    const playGreenBtn = this.add.image(w / 2, h / 2 + 240, 'shared1', 'play-green-btn');
    // playGreenBtn.setScale(0.8);
    this.bindHitAreaToDisplaySize(playGreenBtn);
    this.addHitAreaDebugRect(pauseContainer, playGreenBtn, 0x52c41a);
    playGreenBtn.on('pointerdown', () => {
      this.logButtonBounds('resume', playGreenBtn);
      console.log('[pause-debug] resume');
      if (this.debugDisableButtonActions) return;
      this.isPauseOpen = false;
      isPaused = false;
      pauseBtn.setTexture('shared2', 'pause-inactive');
      pauseContainer.setVisible(false);
    });
    pauseContainer.add(playGreenBtn);

    let isPaused = false;
    const closePause = (): void => {
      this.isPauseOpen = false;
      isPaused = false;
      pauseBtn.setTexture('shared2', 'pause-inactive');
      pauseContainer.setVisible(false);
    };

    const openPause = (): void => {
      this.isPauseOpen = true;
      isPaused = true;
      pauseBtn.setTexture('shared2', 'pause-active');
      pauseContainer.setVisible(true);
    };

    pauseBtnZone.on('pointerdown', () => {
      this.logButtonBounds('pause', pauseBtn);
      console.log('[暂停按钮] 点击了');
      if (this.debugDisableButtonActions) return;
      if (this.modeMs > 0) return; // 限时模式禁用暂停
      if (isPaused) {
        closePause();
      } else {
        openPause();
      }
    });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => {
        if (!this.isPauseOpen) return;
        console.log('[pause-debug] esc-close');
        closePause();
      });
    }

    // DEBUG: 全屏点击监控
    // input.hitTestPointer(pointer) 会返回当前指针命中的所有交互对象，
    // 很适合排查“看起来点到 A，实际上触发 B”的输入问题。
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hitObjects = this.input.hitTestPointer(pointer);
      const names = hitObjects.map((obj: Phaser.GameObjects.GameObject) => obj.constructor.name + (obj instanceof Phaser.GameObjects.Image ? ` (${(obj as Phaser.GameObjects.Image).frame?.name || ''})` : ''));
      console.log(`[点击] x=${Math.round(pointer.x)} y=${Math.round(pointer.y)} 命中: [${names.join(', ')}]`);
    });

    // 声音按钮 sprite 复用 debug 段创建的 this.soundBtn
    // debug 段已注册 'sound-on'=(1,513,128,128) 和 'sound-off'=(131,513,128,128)
    const soundBtn = this.soundBtn;
    const soundBtnZone = this.createButtonZone(
      soundBtn.x,
      soundBtn.y,
      soundBtn.displayWidth,
      soundBtn.displayHeight,
      0x69c0ff,
    );
    let soundOn = true;
    soundBtnZone.on('pointerdown', () => {
      this.logButtonBounds('sound', soundBtn);
      if (this.debugDisableButtonActions) return;
      soundOn = !soundOn;
      soundBtn.setTexture('shared2', soundOn ? 'sound-on' : 'sound-off');
      this.sound.mute = !soundOn;
    });

    // ===== 注册白色数字精灵帧（shared-0-sheet1.png）=====
    const texDigits = this.textures.get('shared1');
    const whiteDigitCoords = [
      { x: 260, y: 1666 }, // 0
      { x: 316, y: 1666 }, // 1
      { x: 378, y: 1666 }, // 2
      { x: 436, y: 1666 }, // 3
      { x: 495, y: 1666 }, // 4
      { x: 555, y: 1666 }, // 5
      { x: 615, y: 1666 }, // 6
      { x: 675, y: 1666 }, // 7
      { x: 732, y: 1666 }, // 8
      { x: 793, y: 1666 }, // 9
    ];
    for (let d = 0; d <= 9; d++) {
      const key = `white-${d}`;
      if (!texDigits.has(key)) {
        texDigits.add(key, 0, whiteDigitCoords[d].x, whiteDigitCoords[d].y, 45, 60);
      }
    }

    // 用精灵数字渲染一个数字的函数
    const renderSpriteNumber = (num: number, startX: number, startY: number, depth: number): Phaser.GameObjects.Image[] => {
      const digits = String(num).split('');
      const images: Phaser.GameObjects.Image[] = [];
      digits.forEach((d, i) => {
        const img = this.add.image(startX + i * 28, startY, 'shared1', `white-${d}`);
        img.setScale(0.65);
        img.setDepth(depth);
        images.push(img);
      });
      return images;
    };

    // 更新精灵数字的函数
    const updateSpriteNumber = (images: Phaser.GameObjects.Image[], num: number, startX: number, startY: number, depth: number): Phaser.GameObjects.Image[] => {
      images.forEach(img => img.destroy());
      return renderSpriteNumber(num, startX, startY, depth);
    };

    // ===== 左上角：星星 + 分数 / 皇冠 + 最高分 =====
    // Star / Crown sprite 已由 debug 段按 data.json 坐标创建（StarUI (44,38), CrownUI (44,98)）。
    // 这里只渲染旁边的白色数字精灵。
    this.scoreDigits = renderSpriteNumber(0, SCORE_DIGITS_X, SCORE_DIGITS_Y, 100);
    const savedScore = parseInt(localStorage.getItem('giant2048_topscore') || '0');
    this.topScoreDigits = renderSpriteNumber(savedScore, TOP_SCORE_DIGITS_X, TOP_SCORE_DIGITS_Y, 100);

    this.layout = layout;
    // 操作记录器：和后端通信，每步操作发给后端验证（DEBUG 模式下不创建）
    this.recorder = IS_DEBUG ? null : new ActionRecorder();
    this.hud = new HUD(this, w, false);
    // 网格：根据实际canvas尺寸动态计算cellSize和偏移
    this.grid = new Grid(this, layout);
    // 合并系统：BFS扫描相邻同值方块，执行合并
    this.mergeSystem = new MergeSystem(this.grid);
    // 旋转系统：数据层矩阵转置 + 视觉Tween动画
    this.rotateSystem = new RotateSystem(this.grid, this);

    // 弹弓：接回当前场景
    this.sling = new Sling(this, this.grid, layout);
    this.sling.onShoot((shape, col) => this.handleShoot(shape, col));

    // 旋转按钮：左下↺ 右下↻，键盘A/D
    this.createRotateButtons(w, h, layout);

    // 恢复之前的游戏状态（窗口resize后）
    this.restoreState();

    // 监听窗口resize：保存状态后刷新页面
    window.addEventListener('resize', this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);

    // 解析 URL 参数：?token=<上游平台 long JWT>，?mode=3m/5m/10m 限时模式
    const urlParams = new URLSearchParams(window.location.search);
    const platformToken = urlParams.get('token') || '';
    const modeRaw = (urlParams.get('mode') || '').trim().toLowerCase();
    const modeMap: Record<string, number> = { '3m': 3 * 60_000, '5m': 5 * 60_000, '10m': 10 * 60_000 };
    this.modeMs = modeMap[modeRaw] ?? 0;
    if (this.modeMs > 0) {
      console.log(`[GameScene] 限时模式 mode=${modeRaw} (${this.modeMs / 60_000} 分钟)`);
      // 隐藏暂停按钮：限时模式不让玩家暂停打断计时（对应 Q1=B）
      this.pauseBtn.setVisible(false);
    }

    if (IS_DEBUG) {
      this.initDebugMode();
      if (this.modeMs > 0) this.startCountdown();
    } else if (!platformToken) {
      console.warn('[GameScene] 未带 token 参数，无法进入游戏 — 上游平台需要 redirect 带 ?token=<JWT>');
    } else {
      void this.exchangeAndInit(platformToken).then(() => {
        if (this.modeMs > 0) this.startCountdown();
      });
    }

    this.refreshScoreSprites(updateSpriteNumber);

    console.log('[GameScene] create done');
    this.printGrid('初始棋盘');
  }

  private refreshScoreSprites(
    updater: (
      images: Phaser.GameObjects.Image[],
      num: number,
      startX: number,
      startY: number,
      depth: number
    ) => Phaser.GameObjects.Image[],
  ): void {
    this.scoreDigits = updater(this.scoreDigits, this.hud.getScore(), SCORE_DIGITS_X, SCORE_DIGITS_Y, 100);
    const topScore = parseInt(localStorage.getItem('giant2048_topscore') || '0');
    this.topScoreDigits = updater(this.topScoreDigits, topScore, TOP_SCORE_DIGITS_X, TOP_SCORE_DIGITS_Y, 100);
  }

  private scoreReportTimer: ReturnType<typeof setTimeout> | null = null;

  private addScore(points: number): void {
    const before = this.hud.getScore();
    console.log(`[score] +${points}, ${before} → ${before + points}`);
    this.hud.addScore(points);
    this.refreshScoreSprites((images, num, startX, startY, depth) => {
      images.forEach(img => img.destroy());
      const digits = String(num).split('');
      return digits.map((d, i) => {
        const img = this.add.image(startX + i * 28, startY, 'shared1', `white-${d}`);
        img.setScale(0.65);
        img.setDepth(depth);
        return img;
      });
    });
    this.debugPanel?.logScoreEvent(`+${points} → 总分 ${this.hud.getScore()}`);
    this.scheduleScoreReport();
  }

  // Combo 触发分发：3 连弹 ComboSprite + 5 颗糖；4 连升级 WowSprite + 再 5 颗；5+ 仅再 5 颗
  private fireComboChain(): void {
    if (this.comboCount === COMBO_THRESHOLD) {
      this.sound.play('combo', { volume: 0.6 });
      this.comboChainEffect.triggerCombo();
    } else if (this.comboCount === WOW_THRESHOLD) {
      this.sound.play('wow', { volume: 0.6 });
      this.comboChainEffect.triggerWow();
    } else if (this.comboCount > WOW_THRESHOLD) {
      this.comboChainEffect.addCandies();
    }
  }

  // Debounce: 连续加分时合并，最后 500ms 后上报一次最新分数到后端
  private scheduleScoreReport(): void {
    if (this.scoreReportTimer !== null) clearTimeout(this.scoreReportTimer);
    this.scoreReportTimer = setTimeout(() => {
      this.scoreReportTimer = null;
      this.recorder?.reportScore(this.hud.getScore());
    }, 500);
  }

  private flushScoreReport(): void {
    if (this.scoreReportTimer !== null) {
      clearTimeout(this.scoreReportTimer);
      this.scoreReportTimer = null;
      this.recorder?.reportScore(this.hud.getScore());
    }
  }

  private ensureBackgroundMusic(): void {
    const bgm = this.sound.get('bgm');
    if (bgm) {
      if (!bgm.isPlaying) {
        bgm.play({ loop: true, volume: 0.4 });
      }
      return;
    }

    this.sound.play('bgm', { loop: true, volume: 0.4 });
  }

  // 窗口resize处理：保存当前状态，刷新页面
  private onResize = (): void => {
    // 防抖：300ms内多次resize只触发一次
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.saveState();
      window.location.reload();
    }, 300);
  };
  private resizeTimer: number | null = null;

  // 保存当前游戏状态到 sessionStorage
  // 同时保存当前的操作记录，这样恢复后后端验证仍然有效
  private saveState(): void {
    const state = {
      grid: this.grid.data.map(row => [...row]),
      score: this.hud.getScore(),
      // 保存 gameId 和当前签名，恢复后继续
      gameId: this.recorder?.getGameId() ?? '',
      sign: this.recorder?.getSign() ?? '',
    };
    sessionStorage.setItem('giant2048_state', JSON.stringify(state));
    // 标记正在游戏中，刷新后 MenuScene 会直接跳到 GameScene
    sessionStorage.setItem('giant2048_playing', '1');
    console.log('[保存状态]', state);
  }

  // 从 sessionStorage 恢复游戏状态
  private restoreState(): void {
    const saved = sessionStorage.getItem('giant2048_state');
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      console.log('[恢复状态]', state);

      // 恢复棋盘
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const value = state.grid[r][c];
          if (value > 0) {
            this.grid.placeBorder(r, c, value);
          }
        }
      }

      // 恢复分数
      if (state.score > 0) {
        this.hud.setScore(state.score);
        this.refreshScoreSprites((images, num, startX, startY, depth) => {
          images.forEach(img => img.destroy());
          const digits = String(num).split('');
          return digits.map((d, i) => {
            const img = this.add.image(startX + i * 28, startY, 'shared1', `white-${d}`);
            img.setScale(0.65);
            img.setDepth(depth);
            return img;
          });
        });
      }

      // 注意：resize 恢复后后端状态已丢失，需要重新开局
      // TODO: 后续可以用 gameId 恢复后端会话

      // 用完即删，避免下次正常进入时还恢复
      sessionStorage.removeItem('giant2048_state');
      this.printGrid('恢复后棋盘');
    } catch (e) {
      console.error('[恢复失败]', e);
      sessionStorage.removeItem('giant2048_state');
    }
  }

  // 后端开局：获取本局完整 sequence。
  // 当前糖果、下一个糖果和 stone 指令都只来自这条序列。
  private static initBackendSeq: number = 0;

  // 用 super86 长 token 换我们的内部 short token，然后开局
  private async exchangeAndInit(platformToken: string): Promise<void> {
    try {
      console.log('[GameScene] /game/auth/login 换内部 token...');
      const { token: internalToken, user, super86Verified } = await authLogin(platformToken);
      console.log(`[GameScene] auth/login OK userId=${user.userId} kol=${user.kolUserId} platform=${user.platformId} verified=${super86Verified}`);
      setGameToken(internalToken);
      await this.initBackend();
    } catch (e) {
      console.error('[GameScene] auth/login failed:', e);
    }
  }

  private async initBackend(): Promise<void> {
    const recorder = this.recorder;
    if (!recorder) return;
    // 每次调用递增序号，只有最新的一次能继续执行
    const mySeq = ++GameScene.initBackendSeq;

    try {
      await recorder.init();

      // await 期间如果又有新的 create 调了 initBackend，序号已变，放弃本次
      if (mySeq !== GameScene.initBackendSeq) {
        console.warn(`[initBackend] 被更新的调用覆盖，丢弃 seq=${mySeq}, current=${GameScene.initBackendSeq}`);
        return;
      }

      const initialResult = recorder.prepareInitialCandies();
      if (!initialResult) {
        throw new Error('Sequence does not contain any playable candy');
      }
      console.log(
        `[开局] gameId=${recorder.getGameId()}, current=${initialResult.currentCandy}, ` +
        `next=${initialResult.nextCandy ?? 'none'}, pendingStones=${initialResult.pendingStones}`
      );
      // 开局时如果有 stone，先处理
      if (initialResult.pendingStones > 0) {
        this.processPendingStones(initialResult.pendingStones, () => {
          this.sling.initCandies(initialResult.currentCandy, initialResult.nextCandy);
        });
      } else {
        this.sling.initCandies(initialResult.currentCandy, initialResult.nextCandy);
      }
    } catch (e) {
      console.error('[开局失败]', e);
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.45, 'START GAME FAILED', {
        fontSize: `${Math.round(this.cameras.main.width * 0.07)}px`,
        color: '#ff5555',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(250);
          }
  }

  // ===== DEBUG 模式：脱机运行，由右侧面板控制棋盘与弹弓 =====
  private initDebugMode(): void {
    console.log('[DEBUG] 模式已启用，不走后端 API');
    if (this.debugCurrentCandy !== null) {
      this.sling.initCandies(this.debugCurrentCandy, this.debugNextCandy);
    } else {
      this.sling.setNextCandy(this.debugNextCandy);
    }
    this.debugPanel = new DebugPanel({
      debugSetCell: (row, col, value) => this.debugSetCell(row, col, value),
      debugSetCurrentCandy: (value) => this.debugSetCurrentCandy(value),
      debugSetNextCandy: (value) => this.debugSetNextCandy(value),
      debugClearBoard: () => this.debugClearBoard(),
      debugRandomFill: (emptyPct, stonePct) => this.debugRandomFill(emptyPct, stonePct),
      debugPlayStoneExplode: () => this.debugPlayStoneExplode(),
      debugPlayCandyMerge: () => this.debugPlayCandyMerge(),
      debugGetStoneExplodeParams: () => this.debugGetStoneExplodeParams(),
      debugSetStoneExplodeParams: (params) => this.debugSetStoneExplodeParams(params),
      debugResetStoneExplodeParams: () => this.debugResetStoneExplodeParams(),
      debugPlayMergeEffect: () => this.debugPlayMergeEffect(),
      debugGetMergeEffectParams: () => this.debugGetMergeEffectParams(),
      debugSetMergeEffectParams: (params) => this.debugSetMergeEffectParams(params),
      debugResetMergeEffectParams: () => this.debugResetMergeEffectParams(),
      debugGetBoardSnapshot: () => this.debugGetBoardSnapshot(),
      debugGetScore: () => this.hud.getScore(),
    });
    this.debugPanel.mount();
    // 场景关闭时卸载面板，避免重启后重复挂载
    this.events.once('shutdown', () => {
      this.debugPanel?.unmount();
      this.debugPanel = null;
    });
    this.restoreDebugSnapshotIfAny();
    this.debugPanel.refreshFromGame();
  }

  // DEBUG：如果 localStorage 里存着快照，启动时自动恢复
  private restoreDebugSnapshotIfAny(): void {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return;
    let snap: SavedSnapshot;
    try {
      snap = JSON.parse(raw) as SavedSnapshot;
    } catch (e) {
      console.warn('[DEBUG] 快照解析失败，忽略', e);
      return;
    }
    if (!snap.grid || snap.grid.length !== GRID_ROWS) return;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid.borders[r][c]) this.grid.removeBorder(r, c);
        if (this.grid.stones[r][c]) this.grid.removeStone(r, c);
        const v = snap.grid[r]?.[c] ?? 0;
        if (v === -1) this.grid.placeStone(r, c);
        else if (v > 0) this.grid.placeBorder(r, c, v);
      }
    }
    this.debugCurrentCandy = typeof snap.current === 'number' && snap.current > 0 ? snap.current : null;
    this.debugNextCandy = snap.next ?? null;
    if (this.debugCurrentCandy !== null) {
      this.sling.initCandies(this.debugCurrentCandy, this.debugNextCandy);
    } else {
      this.sling.setNextCandy(this.debugNextCandy);
    }
    console.log('[DEBUG] 已从本地快照恢复棋盘', snap);
    this.debugPanel?.logDebugEvent(`从本地快照恢复（${new Date(snap.savedAt).toLocaleTimeString()}）`);
  }

  private debugSetCell(row: number, col: number, value: number | 'stone' | null): void {
    if (this.grid.borders[row][col]) this.grid.removeBorder(row, col);
    if (this.grid.stones[row][col]) this.grid.removeStone(row, col);
    if (value === 'stone') this.grid.placeStone(row, col);
    else if (typeof value === 'number' && value > 0) this.grid.placeBorder(row, col, value);
    const label = value === 'stone' ? 'S' : value === null ? '空' : String(value);
    this.debugPanel?.logDebugEvent(`手动设置 (${row + 1},${col + 1}) = ${label}`, this.formatGrid());
  }

  private debugSetCurrentCandy(value: number): void {
    this.debugCurrentCandy = value;
    this.sling.initCandies(value, this.debugNextCandy);
    this.debugPanel?.logDebugEvent(`设置当前糖果 = ${value}`);
  }

  private debugSetNextCandy(value: number | null): void {
    this.debugNextCandy = value;
    this.sling.setNextCandy(value);
    this.debugPanel?.logDebugEvent(`设置下一个糖果 = ${value ?? '空'}`);
  }

  private debugClearBoard(): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid.borders[r][c]) this.grid.removeBorder(r, c);
        if (this.grid.stones[r][c]) this.grid.removeStone(r, c);
      }
    }
    this.debugPanel?.logDebugEvent('清空棋盘', this.formatGrid());
  }

  // DEBUG: 在中心格 (3,3) 播放石头爆炸特效（不改棋盘数据）
  private debugPlayStoneExplode(): void {
    const row = 2, col = 2;
    this.playStoneDestroyEffects([{ row, col }]);
    this.sound.play('stonedestroy', { volume: 0.3 });
    this.debugPanel?.logDebugEvent(`特效测试：石头爆炸 @ (${row + 1},${col + 1})`);
  }

  private defaultStoneExplodeParams(): StoneExplodeParams {
    return {
      frameSize: STONE_DESTROY_FRAME_SIZE,
      frameDuration: STONE_DESTROY_FRAME_DURATION_MS,
      containerOffsetX: STONE_DESTROY_CONTAINER_OFFSET_X,
      containerOffsetY: STONE_DESTROY_CONTAINER_OFFSET_Y,
      frames: STONE_DESTROY_FRAMES.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h })),
      frameOffsets: STONE_DESTROY_FRAME_OFFSETS.map((o) => ({ x: o.x, y: o.y })),
    };
  }

  private debugGetStoneExplodeParams(): StoneExplodeParams {
    return {
      frameSize: this.stoneExplodeParams.frameSize,
      frameDuration: this.stoneExplodeParams.frameDuration,
      containerOffsetX: this.stoneExplodeParams.containerOffsetX,
      containerOffsetY: this.stoneExplodeParams.containerOffsetY,
      frames: this.stoneExplodeParams.frames.map((f) => ({ ...f })),
      frameOffsets: this.stoneExplodeParams.frameOffsets.map((o) => ({ ...o })),
    };
  }

  private debugSetStoneExplodeParams(params: StoneExplodeParams): void {
    this.stoneExplodeParams = {
      frameSize: params.frameSize,
      frameDuration: params.frameDuration,
      containerOffsetX: params.containerOffsetX,
      containerOffsetY: params.containerOffsetY,
      frames: params.frames.map((f) => ({ ...f })),
      frameOffsets: params.frameOffsets.map((o) => ({ ...o })),
    };
    this.stoneExplodeAnimBuildId++;
    this.debugPanel?.logDebugEvent('石头爆炸参数已更新');
  }

  private debugResetStoneExplodeParams(): StoneExplodeParams {
    this.stoneExplodeParams = this.defaultStoneExplodeParams();
    this.stoneExplodeAnimBuildId++;
    return this.debugGetStoneExplodeParams();
  }

  private defaultMergeEffectParams(): MergeEffectParams {
    return {
      frameSize: MERGE_EFFECT_FRAME_SIZE,
      frameDuration: MERGE_EFFECT_FRAME_DURATION_MS,
      containerOffsetX: MERGE_EFFECT_CONTAINER_OFFSET_X,
      containerOffsetY: MERGE_EFFECT_CONTAINER_OFFSET_Y,
      frames: MERGE_EFFECT_FRAMES.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h })),
      frameOffsets: MERGE_EFFECT_FRAME_OFFSETS.map((o) => ({ x: o.x, y: o.y })),
    };
  }

  private debugGetMergeEffectParams(): MergeEffectParams {
    return {
      frameSize: this.mergeEffectParams.frameSize,
      frameDuration: this.mergeEffectParams.frameDuration,
      containerOffsetX: this.mergeEffectParams.containerOffsetX,
      containerOffsetY: this.mergeEffectParams.containerOffsetY,
      frames: this.mergeEffectParams.frames.map((f) => ({ ...f })),
      frameOffsets: this.mergeEffectParams.frameOffsets.map((o) => ({ ...o })),
    };
  }

  private debugSetMergeEffectParams(params: MergeEffectParams): void {
    this.mergeEffectParams = {
      frameSize: params.frameSize,
      frameDuration: params.frameDuration,
      containerOffsetX: params.containerOffsetX,
      containerOffsetY: params.containerOffsetY,
      frames: params.frames.map((f) => ({ ...f })),
      frameOffsets: params.frameOffsets.map((o) => ({ ...o })),
    };
    this.mergeEffectAnimBuildId++;
    this.debugPanel?.logDebugEvent('合并特效参数已更新');
  }

  private debugResetMergeEffectParams(): MergeEffectParams {
    this.mergeEffectParams = this.defaultMergeEffectParams();
    this.mergeEffectAnimBuildId++;
    return this.debugGetMergeEffectParams();
  }

  // DEBUG: 在中心格 (3,3) 播放合并特效（9 帧动画）
  private debugPlayMergeEffect(): void {
    const row = 2, col = 2;
    this.playMergeEffectFrames([{ row, col }]);
    this.debugPanel?.logDebugEvent(`特效测试：合并特效 @ (${row + 1},${col + 1})`);
  }

  // 按当前 mergeEffectParams 在指定格播放帧动画（与 playStoneDestroyEffects 结构一致，用 mergeeffect-full 纹理）
  private playMergeEffectFrames(cells: { row: number; col: number }[]): void {
    if (cells.length === 0) return;
    const p = this.mergeEffectParams;
    const buildId = this.mergeEffectAnimBuildId;
    const texture = this.textures.get('mergeeffect-full');
    const frameKeyPrefix = `merge_effect_v${buildId}_`;

    p.frames.forEach((frame, index) => {
      const frameKey = `${frameKeyPrefix}${index}`;
      if (!texture.has(frameKey)) {
        texture.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
      }
    });

    cells.forEach(({ row, col }) => {
      const { x, y } = this.grid.localCellToPixel(row, col);
      const baseX = x + p.containerOffsetX;
      const baseY = y + p.containerOffsetY;
      const effect = this.add.sprite(baseX, baseY, 'mergeeffect-full', `${frameKeyPrefix}0`);
      effect.setDisplaySize(p.frameSize, p.frameSize);
      effect.setOrigin(0.5, 0.5);
      this.grid.addToEffectLayer(effect);

      const applyFrame = (idx: number) => {
        const frame = p.frames[idx];
        if (!frame) return;
        const offset = p.frameOffsets[idx] || { x: 0, y: 0 };
        const scale = frame.w > 0 ? p.frameSize / frame.w : 1;
        effect.setFrame(`${frameKeyPrefix}${idx}`);
        effect.setPosition(baseX + offset.x * scale, baseY + offset.y * scale);
      };
      applyFrame(0);

      let idx = 0;
      const ticker = this.time.addEvent({
        delay: Math.max(16, p.frameDuration),
        loop: true,
        callback: () => {
          idx++;
          if (idx >= p.frames.length) {
            ticker.remove(false);
            if (effect.active) effect.destroy();
            return;
          }
          applyFrame(idx);
        },
      });
    });
  }

  // 合并时被消除格子的"飞向目标 + 淡出"动画
  // MergeSystem 已把这些 border 从 grid 里摘出来（不销毁），这里负责过渡+销毁
  private animateMergeGhosts(ghosts: GhostBorder[], targetRow: number, targetCol: number): Promise<void> {
    if (!ghosts || ghosts.length === 0) return Promise.resolve();
    const { x: tx, y: ty } = this.grid.localCellToPixel(targetRow, targetCol);
    return new Promise((resolve) => {
      let remaining = ghosts.length;
      for (const { border } of ghosts) {
        const stopTwinkle = this.playOriginalMergeTwinkleFollowBorder(border);
        this.tweens.add({
          targets: border,
          x: tx,
          y: ty,
          alpha: 0.5,
          scaleX: 0.6,
          scaleY: 0.6,
          duration: 180,
          ease: 'Quad.easeIn',
          onComplete: () => {
            stopTwinkle();
            border.destroy();
            remaining--;
            if (remaining === 0) {
              resolve();
            }
          },
        });
      }
    });
  }

  private ensureOriginalMergeTwinkleFrames(): void {
    for (const frame of ORIGINAL_MERGE_TWINKLE_FRAMES) {
      const texture = this.textures.get(frame.textureKey);
      if (!texture.has(frame.frameKey)) {
        texture.add(frame.frameKey, 0, frame.x, frame.y, frame.w, frame.h);
      }
    }
  }

  // 原版 14 帧 Twinkle：贴在正在合入的源数字身上，跟着它一起移动和缩小。
  // 返回 stop 函数，供 ghost tween 结束时销毁。
  private playOriginalMergeTwinkleFollowBorder(border: GhostBorder['border']): () => void {
    this.ensureOriginalMergeTwinkleFrames();

    const first = ORIGINAL_MERGE_TWINKLE_FRAMES[0];
    const effect = this.add.image(border.x, border.y, first.textureKey, first.frameKey);
    effect.setOrigin(first.pivotX, first.pivotY);
    this.grid.addToEffectLayer(effect);

    let idx = 0;
    let stopped = false;
    const applyFrame = (frameIndex: number) => {
      if (stopped || !effect.active || !border.active) return;
      const frame = ORIGINAL_MERGE_TWINKLE_FRAMES[frameIndex];
      if (!frame) return;
      effect.setTexture(frame.textureKey, frame.frameKey);
      effect.setOrigin(frame.pivotX, frame.pivotY);
      effect.setPosition(border.x, border.y);
      effect.setScale(border.scaleX, border.scaleY);
      effect.setAlpha(Math.max(0.35, border.alpha));
    };
    applyFrame(0);

    const ticker = this.time.addEvent({
      delay: ORIGINAL_MERGE_TWINKLE_FRAME_DURATION_MS,
      loop: true,
      callback: () => {
        if (stopped || !effect.active || !border.active) {
          ticker.remove(false);
          if (effect.active) effect.destroy();
          return;
        }
        idx++;
        if (idx >= ORIGINAL_MERGE_TWINKLE_FRAMES.length) {
          idx = 0;
        }
        applyFrame(idx);
      },
    });

    const follow = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (stopped || !effect.active || !border.active) {
          follow.remove(false);
          return;
        }
        effect.setPosition(border.x, border.y);
        effect.setScale(border.scaleX, border.scaleY);
        effect.setAlpha(Math.max(0.35, border.alpha));
      },
    });

    return () => {
      stopped = true;
      ticker.remove(false);
      follow.remove(false);
      if (effect.active) effect.destroy();
    };
  }

  private popMergedBorder(row: number, col: number): Promise<void> {
    return new Promise((resolve) => {
      const border = this.grid.borders[row][col];
      if (!border) {
        resolve();
        return;
      }

      this.tweens.add({
        targets: border,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  // 结果先在落点生成，再滑到最终 minRow。
  private slideResultToFinalRow(row: number, col: number, finalRow: number): Promise<void> {
    return new Promise((resolve) => {
      if (row === finalRow) {
        resolve();
        return;
      }

      const border = this.grid.borders[row][col];
      if (!border) {
        resolve();
        return;
      }

      this.grid.borders[finalRow][col] = border;
      this.grid.data[finalRow][col] = border.value;
      this.grid.borders[row][col] = null;
      this.grid.data[row][col] = 0;
      border.gridRow = finalRow;
      border.gridCol = col;

      const { x, y } = this.grid.localCellToPixel(finalRow, col);
      this.tweens.add({
        targets: border,
        x,
        y,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private playStoneDestroyAndWait(stones: { row: number; col: number }[]): Promise<void> {
    return new Promise((resolve) => {
      if (stones.length === 0) {
        resolve();
        return;
      }

      // 石头要保留到真正开始爆裂的这一刻，避免提前消失。
      for (const { row, col } of stones) {
        if (this.grid.stones[row][col]) {
          this.grid.removeStone(row, col);
        }
      }

      this.sound.play('stonedestroy', { volume: 0.3 });
      this.playStoneDestroyEffects(stones);

      const waitMs = STONE_DESTROY_FRAMES.length * STONE_DESTROY_FRAME_DURATION_MS + 20;
      this.time.delayedCall(waitMs, () => resolve());
    });
  }

  // DEBUG: 在中心格 (3,3) 播放糖果合并特效（临时放 16，动画后恢复）
  private debugPlayCandyMerge(): void {
    const row = 2, col = 2;
    const prevValue = this.grid.data[row][col];
    const prevWasStone = this.grid.isStone(row, col);
    if (this.grid.borders[row][col]) this.grid.removeBorder(row, col);
    if (this.grid.stones[row][col]) this.grid.removeStone(row, col);
    const temp = this.grid.placeBorder(row, col, 16);
    this.sound.play('collapse1', { volume: 0.4 });
    this.tweens.add({
      targets: temp,
      scaleX: 1.3, scaleY: 1.3,
      duration: 120, yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.grid.borders[row][col]) this.grid.removeBorder(row, col);
        if (prevWasStone) this.grid.placeStone(row, col);
        else if (prevValue > 0) this.grid.placeBorder(row, col, prevValue);
        this.debugPanel?.refreshFromGame();
      },
    });
    this.debugPanel?.logDebugEvent(`特效测试：糖果合并 @ (${row + 1},${col + 1})`);
  }

  // DEBUG: 将当前 grid.data 格式化为多行字符串（S 表示石头）
  private formatGrid(): string {
    const lines: string[] = ['['];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = this.grid.data[r].map((v) => {
        if (v === -1) return ' S';
        if (v === 0) return ' 0';
        return String(v).padStart(2, ' ');
      });
      lines.push('  ' + row.join(', ') + ',');
    }
    lines.push(']');
    return lines.join('\n');
  }

  // DEBUG: 按比例随机填充棋盘（糖果值偏向 ≤32）
  private debugRandomFill(emptyPct: number, stonePct: number): void {
    this.debugClearBoard();
    const emptyRate = Math.max(0, Math.min(100, emptyPct)) / 100;
    const stoneRate = Math.max(0, Math.min(100, stonePct)) / 100;
    // 糖果值加权：≤32 高频，≥64 低频
    const weighted: Array<{ value: number; w: number }> = [
      { value: 2, w: 5 }, { value: 4, w: 5 }, { value: 8, w: 5 },
      { value: 16, w: 4 }, { value: 32, w: 3 },
      { value: 64, w: 1 }, { value: 128, w: 0.5 }, { value: 256, w: 0.3 },
      { value: 512, w: 0.2 }, { value: 1024, w: 0.1 },
      { value: 2048, w: 0.05 }, { value: 4096, w: 0.02 }, { value: 8192, w: 0.01 },
    ];
    const totalW = weighted.reduce((sum, x) => sum + x.w, 0);
    const pickCandy = (): number => {
      let r = Math.random() * totalW;
      for (const item of weighted) {
        r -= item.w;
        if (r <= 0) return item.value;
      }
      return weighted[0].value;
    };
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const roll = Math.random();
        if (roll < emptyRate) continue;
        if (roll < emptyRate + stoneRate) {
          this.grid.placeStone(r, c);
        } else {
          this.grid.placeBorder(r, c, pickCandy());
        }
      }
    }
    console.log(`[DEBUG] 随机填充完成，空格${emptyPct}% 石头${stonePct}%`);
    this.debugPanel?.logDebugEvent(`随机生成 (空格${emptyPct}% 石头${stonePct}%)`, this.formatGrid());
  }

  private debugGetBoardSnapshot(): { grid: number[][]; current: number | null; next: number | null } {
    return {
      grid: this.grid.data.map((row) => [...row]),
      current: this.sling.getCurrentValue() ?? this.debugCurrentCandy,
      next: this.debugNextCandy,
    };
  }

  // ===== 超时机制：45秒无操作提示，60秒结束 =====
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private hurryUpTimer: ReturnType<typeof setTimeout> | null = null;
  private hurryUpOverlay: Phaser.GameObjects.Container | null = null;

  private startIdleTimer(): void {
    this.resetIdleTimer();
  }

  // 每次操作后调用，重置计时器
  private resetIdleTimer(): void {
    // 清除旧的计时器
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.hurryUpTimer) clearTimeout(this.hurryUpTimer);
    this.hideHurryUp();

    // 45秒后弹出 Hurry Up 提示
    this.idleTimer = setTimeout(() => {
      this.showHurryUp();

      // 再等15秒，如果还没操作就结束
      this.hurryUpTimer = setTimeout(() => {
        this.timeoutGameOver();
      }, 15000);
    }, 45000);
  }

  private showHurryUp(): void {
    if (this.hurryUpOverlay) return;
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    this.hurryUpOverlay = this.add.container(0, 0).setDepth(300);

    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4);
    this.hurryUpOverlay.add(bg);

    const text = this.add.text(w / 2, h * 0.4, 'HURRY UP!', {
      fontSize: `${Math.round(w * 0.12)}px`,
      color: '#ff5555',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.hurryUpOverlay.add(text);

    const subText = this.add.text(w / 2, h * 0.5, '15 seconds left...', {
      fontSize: `${Math.round(w * 0.05)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.hurryUpOverlay.add(subText);

    // 倒计时更新
    let countdown = 15;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0 && subText.active) {
        subText.setText(`${countdown} seconds left...`);
      } else {
        clearInterval(countdownInterval);
      }
    }, 1000);
  }

  private hideHurryUp(): void {
    if (this.hurryUpOverlay) {
      this.hurryUpOverlay.destroy();
      this.hurryUpOverlay = null;
    }
  }

  private timeoutGameOver(): void {
    if (this.isGameOver) return;
    console.log('[超时] 60秒无操作，游戏结束');
    this.hideHurryUp();
    this.gameOver('timeout');
  }

  // ===== 限时模式（mode=3m/5m/10m）倒计时 =====
  private startCountdown(): void {
    if (this.modeMs <= 0) return;
    this.modeStartedAt = Date.now();
    this.modeRemainingMs = this.modeMs;

    // 倒计时显示位置：弹弓 sprite 上方一点点（Q3）
    const x = SLING_DISPLAY_X;
    const y = SLING_DISPLAY_Y - SLING_DISPLAY_HEIGHT - 18;
    this.modeText = this.add.text(x, y, this.formatMmSs(this.modeRemainingMs), {
      fontSize: '32px',
      color: '#ff5050',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Fredoka, system-ui, sans-serif',
    }).setOrigin(0.5, 0.5).setDepth(90);

    this.modeTimer = this.time.addEvent({
      delay: 200, // 每 200ms 刷一次显示（足够丝滑），但用 wall-clock diff 算剩余时间
      loop: true,
      callback: () => {
        if (this.isGameOver) return;
        const elapsed = Date.now() - this.modeStartedAt;
        this.modeRemainingMs = Math.max(0, this.modeMs - elapsed);
        if (this.modeText && this.modeText.active) {
          this.modeText.setText(this.formatMmSs(this.modeRemainingMs));
          // 最后 10 秒变更鲜艳色
          if (this.modeRemainingMs <= 10_000) {
            this.modeText.setColor('#ff0000');
          }
        }
        if (this.modeRemainingMs <= 0) {
          this.modeTimer?.remove(false);
          this.modeTimer = null;
          console.log('[mode-timeout] 限时模式倒计时结束 → game over');
          this.gameOver('timeout');
        }
      },
    });
  }

  private formatMmSs(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // 推进 token 队列，处理待定石头，然后装填弹弓
  private respawnWithSequence(): void {
    console.log(`[GameScene] respawnWithSequence(), DEBUG=${IS_DEBUG}, isResolvingTurn=${this.isResolvingTurn}`);
    this.comboCount = 0;
    this.comboFiredThisChain = false;
    if (IS_DEBUG) {
      // DEBUG 模式：只消费当前面板里已设置的糖果，current -> next -> 停。
      const nextCandy = this.debugNextCandy;
      this.debugCurrentCandy = nextCandy;
      this.debugNextCandy = null;
      const hasPromotedCurrent = this.sling.getCurrentValue() !== null;
      if (!hasPromotedCurrent && nextCandy !== null) {
        this.sling.setNextCandy(nextCandy);
        this.sling.respawn();
      }
      this.time.delayedCall(350, () => {
        this.sling.setNextCandy(this.debugNextCandy);
        this.sling.unlockCurrentShape();
        this.isResolvingTurn = false;
        this.debugPanel?.refreshFromGame();
      });
      this.time.delayedCall(400, () => this.checkGameOver());
      return;
    }

    const result = this.recorder?.advanceAfterShot() ?? null;
    if (!result) {
      // 区分网络问题和序列真正耗尽
      if (this.recorder?.tokenQueue.isWaitingForNetwork()) {
        console.warn('[GameScene] 网络异常，等待重试...');
        this.waitForNetwork();
        return;
      }
      console.warn('[GameScene] sequence exhausted after shot');
      this.time.delayedCall(150, () => this.gameOver());
      return;
    }

    const doRespawn = () => {
      const hasPromotedCurrent = this.sling.getCurrentValue() !== null;
      if (!hasPromotedCurrent) {
        this.sling.setNextCandy(result.currentCandy);
        this.sling.respawn();
      }
      this.time.delayedCall(350, () => {
        this.sling.setNextCandy(result.nextCandy);
        // 装填完成，解锁操作
        this.sling.unlockCurrentShape();
        this.isResolvingTurn = false;
      });
      // 装填完成后检查 game over
      this.time.delayedCall(400, () => this.checkGameOver());
    };

    if (result.pendingStones > 0) {
      this.processPendingStones(result.pendingStones, doRespawn);
    } else {
      doRespawn();
    }
  }

  // 依次处理待定石头，每个间隔 400ms，全部完成后执行回调
  private processPendingStones(count: number, onComplete: () => void): void {
    console.log(`[GameScene] processPendingStones count=${count}`);
    let processed = 0;
    const processNext = () => {
      if (processed >= count) {
        onComplete();
        return;
      }
      console.log(`[GameScene] spawnStone #${processed + 1}/${count}`);
      this.spawnStone();
      processed++;
      if (processed < count) {
        this.time.delayedCall(400, processNext);
      } else {
        this.time.delayedCall(400, onComplete);
      }
    };
    // 第一个石头延迟 400ms 后开始
    this.time.delayedCall(400, processNext);
  }

  // 网络异常时显示提示并重试
  private networkRetryText: Phaser.GameObjects.Text | null = null;

  private waitForNetwork(): void {
    const w = this.cameras.main.width;

    if (!this.networkRetryText) {
      this.networkRetryText = this.add.text(w / 2, this.cameras.main.height * 0.45, 'Connecting...', {
        fontSize: `${Math.round(w * 0.05)}px`,
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(300);
    }

    const retry = async () => {
      console.log('[GameScene] 重试获取 token...');
      const success = (await this.recorder?.tokenQueue.retryRefill()) ?? false;
      if (success) {
        // 网络恢复，清除提示，继续游戏
        if (this.networkRetryText) {
          this.networkRetryText.destroy();
          this.networkRetryText = null;
        }
        this.respawnWithSequence();
      } else if (this.recorder?.tokenQueue.isWaitingForNetwork()) {
        // 仍然失败，3 秒后再试
        console.warn('[GameScene] 重试失败，3秒后再次尝试...');
        this.time.delayedCall(3000, retry);
      } else {
        // 序列真正耗尽
        if (this.networkRetryText) {
          this.networkRetryText.destroy();
          this.networkRetryText = null;
        }
        this.gameOver();
      }
    };

    this.time.delayedCall(2000, retry);
  }

  // ===== DEBUG: 打印棋盘 =====
  private printGrid(label: string): void {
    console.log(`\n===== ${label} =====`);
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = this.grid.data[r].map(v => v === 0 ? '  .' : v === -1 ? ' ST' : String(v).padStart(3));
      console.log(`行${r + 1}: [${row.join(',')}]`);
    }
    console.log('========================\n');
  }

  private playStoneDestroyEffects(cells: { row: number; col: number }[]): void {
    if (cells.length === 0) return;

    const p = this.stoneExplodeParams;
    const buildId = this.stoneExplodeAnimBuildId;
    const texture = this.textures.get('stonedestroy-full');
    const frameKeyPrefix = `stone_destroy_v${buildId}_`;

    // 注册该版本下的所有 frame（若不存在）
    p.frames.forEach((frame, index) => {
      const frameKey = `${frameKeyPrefix}${index}`;
      if (!texture.has(frameKey)) {
        texture.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
      }
    });

    const showBbox = this.debugPanel?.isBoundingBoxVisible() ?? false;

    cells.forEach(({ row, col }) => {
      const { x, y } = this.grid.localCellToPixel(row, col);
      const baseX = x + p.containerOffsetX;
      const baseY = y + p.containerOffsetY;
      const effect = this.add.sprite(baseX, baseY, 'stonedestroy-full', `${frameKeyPrefix}0`);
      effect.setDisplaySize(p.frameSize, p.frameSize);
      effect.setOrigin(0.5, 0.5);
      this.grid.addToEffectLayer(effect);

      // DEBUG: 可视化 sprite 的定位边框
      let bbox: Phaser.GameObjects.Rectangle | null = null;
      if (showBbox) {
        bbox = this.add.rectangle(baseX, baseY, p.frameSize, p.frameSize);
        bbox.setStrokeStyle(2, 0xff3355, 1);
        bbox.setFillStyle(0, 0);
        bbox.setOrigin(0.5, 0.5);
        this.grid.addToEffectLayer(bbox);
      }

      // offset 在预览（源图 256 尺寸下测得）→ 换算到显示尺寸：scale = frameSize / frame.w
      const applyFrame = (idx: number) => {
        const frame = p.frames[idx];
        if (!frame) return;
        const offset = p.frameOffsets[idx] || { x: 0, y: 0 };
        const scale = frame.w > 0 ? p.frameSize / frame.w : 1;
        const sx = offset.x * scale;
        const sy = offset.y * scale;
        effect.setFrame(`${frameKeyPrefix}${idx}`);
        effect.setPosition(baseX + sx, baseY + sy);
        if (bbox) bbox.setPosition(baseX + sx, baseY + sy);
      };
      applyFrame(0);

      let idx = 0;
      const ticker = this.time.addEvent({
        delay: Math.max(16, p.frameDuration),
        loop: true,
        callback: () => {
          idx++;
          if (idx >= p.frames.length) {
            ticker.remove(false);
            if (effect.active) effect.destroy();
            if (bbox && bbox.active) bbox.destroy();
            return;
          }
          applyFrame(idx);
        },
      });
    });
  }

  // 创建左右旋转按钮，使用素材图片
  private createRotateButtons(_w: number, _h: number, _layout: LayoutConfig): void {
    // 旋转按钮 sprite 复用 debug 段创建的 this.rotateArrowL / this.rotateArrowR
    const leftBtn = this.rotateArrowL;
    const rightBtn = this.rotateArrowR;

    const leftBtnZone = this.createButtonZone(
      leftBtn.x,
      leftBtn.y,
      leftBtn.displayWidth,
      leftBtn.displayHeight,
      0xfaad14,
    );
    leftBtnZone.on('pointerdown', () => {
      this.logButtonBounds('rotate-left', leftBtn);
      if (this.debugDisableButtonActions) return;
      this.doRotate('ccw');
    });

    const rightBtnZone = this.createButtonZone(
      rightBtn.x,
      rightBtn.y,
      rightBtn.displayWidth,
      rightBtn.displayHeight,
      0x13c2c2,
    );
    rightBtnZone.on('pointerdown', () => {
      this.logButtonBounds('rotate-right', rightBtn);
      if (this.debugDisableButtonActions) return;
      this.doRotate('cw');
    });

    // 键盘 A=逆时针 D=顺时针
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-A', () => this.doRotate('ccw'));
      this.input.keyboard.on('keydown-D', () => this.doRotate('cw'));
    }
  }

  // 执行旋转：数据层转置 + 视觉动画 + 旋转后检查合并
  // 执行旋转：整个棋盘容器（背景+糖果+石头）一起旋转动画
  private doRotate(direction: 'cw' | 'ccw'): void {
    // this.resetIdleTimer(); // 用户操作，重置超时（暂时注释）
    if (this.isPauseOpen || this.isResolvingTurn) return;
    if (this.isRotating) return;
    this.isRotating = true;

    console.log(`[旋转] 方向: ${direction === 'cw' ? '顺时针' : '逆时针'}`);
    this.debugPanel?.logDebugEvent(`旋转 ${direction === 'cw' ? '顺时针' : '逆时针'}（旋转前）`, this.formatGrid());
    this.printGrid('旋转前');

    this.sound.play('rotation', { volume: 0.3 });
    this.recorder?.recordRotate(direction);

    const onComplete = () => {
      this.isRotating = false;
      this.printGrid('旋转后');
      this.sling.refreshPreview();
      this.checkMergesAfterRotation();
    };

    if (direction === 'cw') {
      this.rotateSystem.rotateCW(onComplete);
    } else {
      this.rotateSystem.rotateCCW(onComplete);
    }
  }

  // 处理发射：计算落点 → 飞行动画 → 落地 → 合并检查
  private handleShoot(shape: Shape, col: number): void {
    // this.resetIdleTimer(); // 用户操作，重置超时（暂时注释）
    if (this.isPauseOpen || this.isResolvingTurn) return;
    this.isResolvingTurn = true;
    console.log(`[发射] 列=${col + 1}, 值=${shape.value}`);
    this.debugPanel?.logDebugEvent(`发射：列${col + 1} 值=${shape.value}`);
    this.printGrid('发射前');

    const landingRow = this.findLandingRow(col);
    console.log(`[落点] 计算结果: 行=${landingRow === -1 ? '满' : landingRow + 1}, 列=${col + 1}`);

    if (landingRow === -1) {
      // 列满了，检查最底行是否同值可直接合并
      const bottomRow = GRID_ROWS - 1;
      if (this.grid.data[bottomRow][col] === shape.value) {
        console.log(`[直接合并] 列${col + 1}满，底行值=${this.grid.data[bottomRow][col]}与发射值=${shape.value}相同，直接合并`);
        this.debugPanel?.logDebugEvent(`直接合并：列${col + 1} ${shape.value}+${shape.value}→${shape.value * 2}`);
        const shootValue = shape.value;
        this.time.delayedCall(GameScene.SLING_PROMOTION_DELAY_MS, () => {
          this.sling.promoteNextToCurrent();
        });
        shape.destroy();
        const newValue = shootValue * 2;
        this.recorder?.recordDirectMerge(col, shootValue, newValue);
        const border = this.grid.borders[bottomRow][col];
        if (border) {
          border.setValue(newValue);
          this.grid.data[bottomRow][col] = newValue;
        }
        this.sound.play('slingshot2', { volume: 0.3 });
        this.lastLandedCol = col;
        if (border) {
          this.tweens.add({
            targets: border,
            scaleX: 1.3, scaleY: 1.3,
            duration: 120, yoyo: true,
            ease: 'Back.easeOut',
          });
        }
        // 碎掉直接合并位置周围的石头
        this.destroyStonesAround(bottomRow, col);

        this.addScore(newValue);
        this.printGrid('直接合并后');
        // 由 checkMerges 统一处理后续（合并链 → 石头 → 装填）
        this.time.delayedCall(400, () => this.checkMerges());
        return;
      }
      // 打不出去，不换糖果，糖果回到弹弓上
      console.log(`[拒绝] 列${col + 1}满，底行值=${this.grid.data[bottomRow][col]}与发射值=${shape.value}不同，不能发射`);
      this.sling.cancelShoot(shape);
      this.isResolvingTurn = false;
      return;
    }

    const body = shape.getBody();
    body.setVelocity(0, 0);

    const targetPos = this.grid.cellToPixel(landingRow, col);
    const distance = Math.abs(shape.y - targetPos.y);
    const duration = Math.max(150, distance * 0.4);
    this.time.delayedCall(GameScene.SLING_PROMOTION_DELAY_MS, () => {
      this.sling.promoteNextToCurrent();
    });

    this.tweens.add({
      targets: shape,
      y: targetPos.y,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.landShape(shape, col, landingRow);
      },
    });
  }

  private findLandingRow(col: number): number {
    const colData = Array.from({ length: GRID_ROWS }, (_, r) => this.grid.data[r][col]);
    console.log(`[findLandingRow] 列${col + 1}数据: [${colData.map(v => v || '.').join(', ')}]`);

    // 糖果从下方（行5）往上飞
    // 最底行有东西 → 糖果进不去，返回-1（由handleShoot判断是否可直接合并）
    if (this.grid.data[GRID_ROWS - 1][col] !== 0) {
      console.log(`[findLandingRow] 最底行已占据，进不去`);
      return -1;
    }

    // 从底部往上找：第一个有东西的行，糖果停在它下方一格
    for (let r = GRID_ROWS - 2; r >= 0; r--) {
      if (this.grid.data[r][col] !== 0) {
        // 行r有阻挡，糖果停在行r+1（已确认行GRID_ROWS-1是空的，r+1也在范围内）
        console.log(`[findLandingRow] 从底往上，阻挡在行${r + 1}，落在行${r + 2}`);
        return r + 1;
      }
    }

    // 整列为空，飞到最顶行
    console.log(`[findLandingRow] 整列空，落在行1`);
    return 0;
  }

  // 糖果落地：销毁Shape → 创建Border → 播放音效 → 检查合并
  private landShape(shape: Shape, col: number, targetRow: number): void {
    const value = shape.value;
    console.log(`[落地] 行${targetRow + 1} 列${col + 1} 值=${value}`);
    this.debugPanel?.logDebugEvent(`落地：(${targetRow + 1},${col + 1}) = ${value}`, this.formatGrid());
    this.recorder?.recordShoot(col, value);
    shape.destroy();

    const border = this.grid.placeBorder(targetRow, col, value);

    this.tweens.add({
      targets: border,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 250,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    this.sound.play('slingshot2', { volume: 0.3 });
    this.lastLandedCol = col;

    this.printGrid('落地后');
    this.time.delayedCall(400, () => this.checkMerges());
  }

  // 碎掉指定位置周围的石头（直接合并时使用）
  private destroyStonesAround(row: number, col: number): void {
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
    const destroyed: { row: number; col: number }[] = [];
    for (const n of neighbors) {
      if (
        n.row >= 0 && n.row < GRID_ROWS &&
        n.col >= 0 && n.col < GRID_COLS &&
        this.grid.isStone(n.row, n.col)
      ) {
        this.grid.removeStone(n.row, n.col);
        destroyed.push(n);
      }
    }
    if (destroyed.length > 0) {
      console.log(`[直接合并石头碎掉] ${destroyed.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
      this.debugPanel?.logDebugEvent(`直接合并石头碎掉：${destroyed.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
      this.sound.play('stonedestroy', { volume: 0.3 });
      this.playStoneDestroyEffects(destroyed);
    }
  }

  // sequence 中遇到 "stone" 时，在棋盘随机空格生成一个石头。
  private spawnStone(): void {
    // 收集所有空格
    const emptyCells: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid.data[r][c] === 0) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    if (emptyCells.length === 0) return;

    // 随机选一个空格
    const cell = emptyCells[Phaser.Math.Between(0, emptyCells.length - 1)];
    const stone = this.grid.placeStone(cell.row, cell.col);
    console.log(`[石头生成] 行${cell.row + 1} 列${cell.col + 1}`);
    this.debugPanel?.logDebugEvent(`石头生成：(${cell.row + 1},${cell.col + 1})`);

    // 石头出现动画
    stone.setScale(0);
    this.tweens.add({
      targets: stone,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    this.sound.play('stonesup', { volume: 0.3 });
  }

  // 合并检查：BFS找相邻同值组 → 执行最大组合并 → 链式检查
  // 合并规则：2个×2, 3个×4, 4个×8
  // 合并位置：纵向取最小行号（向上靠拢），横向取打入的列（吸引）
  private async checkMerges(): Promise<void> {
    const groups = this.mergeSystem.findMergeGroups();
    console.log(`[合并检查] 找到 ${groups.length} 个合并组`);

    if (groups.length === 0) {
      this.lastLandedCol = undefined;
      if (this.comboCount >= COMBO_THRESHOLD) {
        this.comboChainEffect.notifyChainEnd();
      }
      this.comboCount = 0;
      this.comboFiredThisChain = false;
      this.respawnWithSequence();
      return;
    }

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const group = groups[0];
    console.log(`[合并] 值=${group.value}, 数量=${group.cells.length}, 位置=[${group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ')}]`);
    const mergeCellsStr = group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ');
    this.debugPanel?.logDebugEvent(`合并：${group.value}×${group.cells.length} @ ${mergeCellsStr}`);

    const result = this.mergeSystem.executeMerge(group, this.lastLandedCol);
    this.comboCount++;
    this.fireComboChain();
    console.log(
      `[合并结果] 新值=${result.newValue}, 落点=(${result.landedRow + 1},${result.landedCol + 1}), ` +
      `最终=(${result.finalRow + 1},${result.finalCol + 1})`
    );
    this.debugPanel?.logDebugEvent(
      `合并结果：${result.newValue} @ 落点(${result.landedRow + 1},${result.landedCol + 1}) → 最终(${result.finalRow + 1},${result.finalCol + 1})`,
      this.formatGrid(),
    );

    this.addScore(result.newValue);
    this.sound.play('collapse1', { volume: 0.4 });
    this.lastLandedCol = result.finalCol;

    await this.animateMergeGhosts(result.ghostBorders, result.landedRow, result.landedCol);
    await this.popMergedBorder(result.landedRow, result.landedCol);
    await this.slideResultToFinalRow(result.landedRow, result.landedCol, result.finalRow);

    if (result.destroyedStones.length > 0) {
      console.log(`[石头碎掉] ${result.destroyedStones.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
      this.debugPanel?.logDebugEvent(`石头碎掉：${result.destroyedStones.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
    }
    await this.playStoneDestroyAndWait(result.destroyedStones);

    this.printGrid('合并后');
    this.applyGravityUp([...result.removedCells, ...result.destroyedStones]);
    this.printGrid('上靠后');
    this.time.delayedCall(400, () => {
      void this.checkMerges();
    });
  }

  // 旋转后合并检查——不调用 respawn，因为弹弓上已经有糖果
  private async checkMergesAfterRotation(): Promise<void> {
    const groups = this.mergeSystem.findMergeGroups();
    console.log(`[旋转后合并检查] 找到 ${groups.length} 个合并组`);

    if (groups.length === 0) {
      if (this.comboCount >= COMBO_THRESHOLD) {
        this.comboChainEffect.notifyChainEnd();
      }
      this.comboCount = 0;
      this.comboFiredThisChain = false;
      this.sling.refreshPreview();
      return;
    }

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const group = groups[0];
    console.log(`[旋转后合并] 值=${group.value}, 数量=${group.cells.length}, 位置=[${group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ')}]`);
    const rotMergeCellsStr = group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ');
    this.debugPanel?.logDebugEvent(`旋转后合并：${group.value}×${group.cells.length} @ ${rotMergeCellsStr}`);

    const result = this.mergeSystem.executeMerge(group);
    this.comboCount++;
    this.fireComboChain();
    console.log(
      `[旋转后合并结果] 新值=${result.newValue}, 落点=(${result.landedRow + 1},${result.landedCol + 1}), ` +
      `最终=(${result.finalRow + 1},${result.finalCol + 1})`
    );
    this.debugPanel?.logDebugEvent(
      `旋转合并结果：${result.newValue} @ 落点(${result.landedRow + 1},${result.landedCol + 1}) → 最终(${result.finalRow + 1},${result.finalCol + 1})`,
      this.formatGrid(),
    );

    this.addScore(result.newValue);
    this.sound.play('collapse1', { volume: 0.4 });

    await this.animateMergeGhosts(result.ghostBorders, result.landedRow, result.landedCol);
    await this.popMergedBorder(result.landedRow, result.landedCol);
    await this.slideResultToFinalRow(result.landedRow, result.landedCol, result.finalRow);

    if (result.destroyedStones.length > 0) {
      console.log(`[旋转石头碎掉] ${result.destroyedStones.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
      this.debugPanel?.logDebugEvent(`旋转石头碎掉：${result.destroyedStones.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
    }
    await this.playStoneDestroyAndWait(result.destroyedStones);
    this.printGrid('旋转合并后');
    this.applyGravityUp([...result.removedCells, ...result.destroyedStones]);
    this.printGrid('旋转上靠后');
    this.time.delayedCall(400, () => {
      void this.checkMergesAfterRotation();
    });
  }

  // 上靠逻辑：只在被消除的格子处，把下方元素往上填补
  // 元素只在正上方因合并/碎石被消除时才往上移，其他空格不触发
  private applyGravityUp(removedCells: { row: number; col: number }[]): void {
    // 用被消除格子 + 碎石格子作为初始空位
    // 从每个空位开始，把下方紧邻的元素往上拉，连锁处理
    const emptyCells = new Set(removedCells.map(c => `${c.row},${c.col}`));

    let changed = true;
    while (changed) {
      changed = false;
      for (const key of Array.from(emptyCells)) {
        const [rStr, cStr] = key.split(',');
        const r = parseInt(rStr);
        const col = parseInt(cStr);

        // 当前格确实是空的，且下方有元素
        if (this.grid.data[r][col] === 0 && r + 1 < GRID_ROWS && this.grid.data[r + 1][col] !== 0) {
          // 石头是屏障：石头不上移，且其上方的空位也不再被填补（连锁中断）
          if (this.grid.data[r + 1][col] === STONE_VALUE) {
            emptyCells.delete(key);
            continue;
          }

          // 把行 r+1 的元素移到行 r
          this.grid.data[r][col] = this.grid.data[r + 1][col];
          this.grid.borders[r][col] = this.grid.borders[r + 1][col];
          this.grid.stones[r][col] = this.grid.stones[r + 1][col];

          this.grid.data[r + 1][col] = 0;
          this.grid.borders[r + 1][col] = null;
          this.grid.stones[r + 1][col] = null;

          const { x, y } = this.grid.localCellToPixel(r, col);

          const border = this.grid.borders[r][col];
          if (border) {
            border.gridRow = r;
            border.gridCol = col;
            this.tweens.add({ targets: border, x, y, duration: 150, ease: 'Quad.easeOut' });
          }
          const stone = this.grid.stones[r][col];
          if (stone) {
            stone.gridRow = r;
            stone.gridCol = col;
            this.tweens.add({ targets: stone, x, y, duration: 150, ease: 'Quad.easeOut' });
          }

          // 行 r 现在有东西了，移出空位集合
          emptyCells.delete(key);
          // 行 r+1 变成空位了，加入集合（继续连锁）
          emptyCells.add(`${r + 1},${col}`);
          changed = true;
        }
      }
    }
  }

  // 检查游戏是否结束：当前糖果在 4 种旋转状态下都无法放入任何列
  private checkGameOver(): void {
    if (this.isGameOver) {
      console.log('[checkGameOver] 已经 gameOver，跳过');
      return;
    }

    const currentValue = this.sling.getCurrentValue();
    if (currentValue === null) {
      console.log('[checkGameOver] currentValue=null，跳过');
      return;
    }

    const gridData = this.grid.data;

    for (let rotation = 0; rotation < 4; rotation++) {
      const rotated = this.rotateGridData(gridData, rotation);
      if (this.canPlaceInGrid(rotated, currentValue)) {
        console.log(`[checkGameOver] currentValue=${currentValue} 可放入（rotation=${rotation}）`);
        return;
      }
    }

    console.log(`[游戏结束] 当前糖果=${currentValue}，4种旋转都无法放入`);
    this.gameOver();
  }

  // 将 5x5 棋盘顺时针旋转 n 次（0=不转, 1=90°, 2=180°, 3=270°）
  private rotateGridData(data: number[][], times: number): number[][] {
    let result = data.map(row => [...row]);
    for (let t = 0; t < times; t++) {
      const size = result.length;
      const rotated: number[][] = [];
      for (let r = 0; r < size; r++) {
        rotated[r] = [];
        for (let c = 0; c < size; c++) {
          rotated[r][c] = result[size - 1 - c][r];
        }
      }
      result = rotated;
    }
    return result;
  }

  // 检查当前糖果能否放入某个棋盘状态的任何列
  private canPlaceInGrid(data: number[][], value: number): boolean {
    const rows = data.length;
    const cols = data[0].length;

    for (let col = 0; col < cols; col++) {
      // 从顶部往下找第一个非空格子
      let blocked = false;
      for (let r = 0; r < rows; r++) {
        if (data[r][col] !== 0) {
          // 被阻挡，糖果落在上一行
          if (r > 0) {
            return true; // r-1 行是空的，可以放
          }
          blocked = true;
          break;
        }
      }

      if (!blocked) {
        // 整列空，可以放
        return true;
      }

      // 列从顶部就满了（r=0 就有东西），检查底行能否直接合并
      const bottomVal = data[rows - 1][col];
      if (bottomVal === value) {
        return true;
      }
    }

    return false;
  }

  // 游戏结束处理
  private gameOver(endReason: string = 'gameover'): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.debugPanel?.logDebugEvent(`Game Over (${endReason})`, this.formatGrid());

    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // 半透明遮罩
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    overlay.setDepth(200);

    // Game Over 文字
    this.add.text(w / 2, h * 0.35, 'GAME OVER', {
      fontSize: `${Math.round(w * 0.1)}px`,
      color: '#ff5555',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(201);

    // 分数
    this.add.text(w / 2, h * 0.45, `Score: ${this.hud.getScore()}`, {
      fontSize: `${Math.round(w * 0.07)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    // 整局结束后一次性提交结果
    void this.recorder?.finish(this.hud.getScore(), endReason);

    // 重新开始按钮（跟其他按钮一致：用独立 Zone 当点击层，避免 Text.setInteractive 在缩放 canvas 下命中失效）
    const restartBtn = this.add.text(w / 2, h * 0.58, '↻ RESTART', {
      fontSize: `${Math.round(w * 0.06)}px`,
      color: '#ffffff',
      backgroundColor: '#4caf50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setDepth(201);

    // Zone 比按钮稍大（外扩 10px）确保点击范围足够
    const restartZone = this.createButtonZone(
      restartBtn.x,
      restartBtn.y,
      restartBtn.width + 20,
      restartBtn.height + 20,
      0x4caf50,
    );
    restartZone.setDepth(202);
    restartZone.on('pointerdown', () => {
      console.log('[restart] button clicked');
      sessionStorage.removeItem('giant2048_state');
      sessionStorage.removeItem('giant2048_playing');
      this.scene.restart();
    });
  }

  private handleSceneShutdown(): void {
    window.removeEventListener('resize', this.onResize);
    this.comboCount = 0;
    this.comboFiredThisChain = false;

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.hurryUpTimer) {
      clearTimeout(this.hurryUpTimer);
      this.hurryUpTimer = null;
    }
    if (this.modeTimer) {
      this.modeTimer.remove(false);
      this.modeTimer = null;
    }
    this.flushScoreReport();

    this.hideHurryUp();
  }

}
