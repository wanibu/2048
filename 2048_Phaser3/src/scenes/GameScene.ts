import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRID_ROWS, GRID_COLS, SPAWN_NUMBER_MAX, SHAPE_VALUES, STONE_SPAWN_INTERVAL, BASE_BG_REGION, ROTATE_BTN_REGION, calcLayout, LayoutConfig } from '../config';
import { Grid } from '../objects/Grid';
import { Sling } from '../objects/Sling';
import { Shape } from '../objects/Shape';
import { Border } from '../objects/Border';
import { Stone } from '../objects/Stone';
import { MergeSystem } from '../systems/MergeSystem';
import { RotateSystem } from '../systems/RotateSystem';
import { ActionRecorder } from '../systems/ActionRecorder';
import { HUD } from '../ui/HUD';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private sling!: Sling;
  private mergeSystem!: MergeSystem;
  private rotateSystem!: RotateSystem;
  private recorder!: ActionRecorder;
  private hud!: HUD;
  private layout!: LayoutConfig;
  private isRotating: boolean = false;
  private lastLandedCol: number | undefined;
  private shootCount: number = 0; // 发射计数，每5个生成石头

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const layout = calcLayout(w, h);

    // 背景：高度100%铺满，宽度auto按比例，从左侧开始（和首页一致）
    const bg = this.add.image(0, 0, 'playbackground');
    bg.setOrigin(0, 0);
    const bgScale = h / bg.height;
    bg.setScale(bgScale);
    bg.setDepth(-1000);

    // 底座背景 mobile-tray（原尺寸781×260，居中贴底）
    const tex = this.textures.get('shared0');
    if (!tex.has('mobile-tray')) {
      tex.add('mobile-tray', 0, 893, 752, 781, 260);
    }
    const trayScale = w / 781; // 宽度铺满
    const trayH = 260 * trayScale;
    const tray = this.add.image(0, h - trayH, 'shared0', 'mobile-tray');
    tray.setOrigin(0, 0); // 左上角对齐
    tray.setScale(trayScale);
    tray.setDepth(-999);

    // 坑（candy-hole）原尺寸120×120，底部居中，在tray上一层
    const tex2 = this.textures.get('shared2');
    if (!tex2.has('candy-hole')) {
      tex2.add('candy-hole', 0, 260, 263, 120, 120);
    }
    const hole = this.add.image(w / 2, h - trayH / 2 + 55, 'shared2', 'candy-hole');
    hole.setScale(0.7)
    hole.setDepth(-998);

    // 巨人头像睁眼闭眼动画（depth -2，棋盘后面，背景前面）
    const blinkFrames = [
      { x: 1622, y: 1025, w: 420, h: 611 }, // blink-1 睁眼
      { x: 4, y: 2023, w: 420, h: 611 },    // blink-2
      { x: 427, y: 2023, w: 420, h: 611 },  // blink-3
      { x: 4, y: 1027, w: 420, h: 611 },    // blink-4 闭眼
    ];
    const headImages: Phaser.GameObjects.Image[] = [];
    const headX = w / 2;
    const headY = h * 0.60 - 130 - 611 / 2 - 67; // 和首页一致
    for (let i = 0; i < blinkFrames.length; i++) {
      const f = blinkFrames[i];
      const key = `game_blink_${i}`;
      if (!tex.has(key)) {
        tex.add(key, 0, f.x, f.y, f.w, f.h);
      }
      const img = this.add.image(headX, headY, 'shared0', key);
      img.setAngle(7);
      img.setDepth(-2);
      img.setVisible(i === 0);
      headImages.push(img);
    }
    // 眨眼循环
    const doBlink = () => {
      const showFrame = (idx: number) => {
        headImages.forEach((img, i) => img.setVisible(i === idx));
      };
      showFrame(0);
      this.time.delayedCall(Phaser.Math.Between(2000, 3500), () => {
        const seq = [1, 2, 3, 2, 1, 0];
        seq.forEach((frame, i) => {
          this.time.delayedCall(i * 48, () => showFrame(frame));
        });
        this.time.delayedCall(seq.length * 48, doBlink);
      });
    };
    doBlink();

    // ===== 右上角：暂停按钮 + 声音按钮 =====
    const tex3 = this.textures.get('shared2');
    // 暂停按钮（默认状态）
    if (!tex3.has('pause-btn')) {
      tex3.add('pause-btn', 0, 7, 775, 120, 120);
    }
    if (!tex3.has('pause-btn-active')) {
      tex3.add('pause-btn-active', 0, 267, 523, 120, 120);
    }
    const pauseBtn = this.add.image(w - 140, 58, 'shared2', 'pause-btn');
    pauseBtn.setDepth(200);
    pauseBtn.setScale(0.70);
    pauseBtn.setInteractive({ useHandCursor: true });

    // ===== 暂停面板 =====
    const pauseContainer = this.add.container(0, 0).setDepth(150).setVisible(false);

    // 白色遮罩
    const pauseOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0.6);
    pauseContainer.add(pauseOverlay);

    // 暂停背景面板（pause-bg）
    if (!tex.has('pause-bg')) {
      tex.add('pause-bg', 0, 0, 0, 769, 1028);
    }
    const pauseBg = this.add.image(w / 2, h / 2, 'shared0', 'pause-bg');
    const pauseBgScale = (w * 0.85) / 769;
    pauseBg.setScale(pauseBgScale);
    pauseContainer.add(pauseBg);

    // 睡觉小女孩
    const texS1 = this.textures.get('shared1');
    if (!texS1.has('sleep-girl')) {
      texS1.add('sleep-girl', 0, 0, 767, 519, 246);
    }
    const sleepGirl = this.add.image(w / 2, h / 2 - 180, 'shared1', 'sleep-girl');
    sleepGirl.setScale(0.7);
    pauseContainer.add(sleepGirl);

    // 首页按钮
    if (!tex3.has('home-btn')) {
      tex3.add('home-btn', 0, 262, 4, 232, 108);
    }
    const homeBtn = this.add.image(w / 2, h / 2 - 20, 'shared2', 'home-btn');
    homeBtn.setScale(0.8);
    homeBtn.setInteractive({ useHandCursor: true });
    homeBtn.on('pointerdown', () => {
      pauseContainer.setVisible(false);
      this.scene.start('MenuScene');
    });
    pauseContainer.add(homeBtn);

    // 恢复按钮（粉色）
    if (!texS1.has('pink-off-btn')) {
      texS1.add('pink-off-btn', 0, 0, 1794, 250, 140);
    }
    const resumeBtn = this.add.image(w / 2, h / 2 + 80, 'shared1', 'pink-off-btn');
    resumeBtn.setScale(0.8);
    resumeBtn.setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => {
      isPaused = false;
      pauseBtn.setTexture('shared2', 'pause-btn');
      pauseContainer.setVisible(false);
    });
    pauseContainer.add(resumeBtn);

    // 绿色播放按钮
    if (!texS1.has('play-green-btn')) {
      texS1.add('play-green-btn', 0, 772, 1277, 250, 140);
    }
    const playGreenBtn = this.add.image(w / 2, h / 2 + 180, 'shared1', 'play-green-btn');
    playGreenBtn.setScale(0.8);
    playGreenBtn.setInteractive({ useHandCursor: true });
    playGreenBtn.on('pointerdown', () => {
      isPaused = false;
      pauseBtn.setTexture('shared2', 'pause-btn');
      pauseContainer.setVisible(false);
    });
    pauseContainer.add(playGreenBtn);

    let isPaused = false;
    pauseBtn.on('pointerdown', () => {
      console.log('[暂停按钮] 点击了');
      isPaused = !isPaused;
      pauseBtn.setTexture('shared2', isPaused ? 'pause-btn-active' : 'pause-btn');
      pauseContainer.setVisible(isPaused);
    });

    // DEBUG: 全屏点击监控
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hitObjects = this.input.hitTestPointer(pointer);
      const names = hitObjects.map((obj: Phaser.GameObjects.GameObject) => obj.constructor.name + (obj instanceof Phaser.GameObjects.Image ? ` (${(obj as Phaser.GameObjects.Image).frame?.name || ''})` : ''));
      console.log(`[点击] x=${Math.round(pointer.x)} y=${Math.round(pointer.y)} 命中: [${names.join(', ')}]`);
    });

    // 声音按钮（开启状态）
    if (!tex3.has('sound-on')) {
      tex3.add('sound-on', 0, 6, 514, 120, 120);
    }
    if (!tex3.has('sound-mute')) {
      tex3.add('sound-mute', 0, 136, 514, 120, 120);
    }
    const soundBtn = this.add.image(w - 55, 55, 'shared2', 'sound-on');
    soundBtn.setDepth(100);
    soundBtn.setScale(0.70)
    soundBtn.setInteractive({ useHandCursor: true });
    let soundOn = true;
    soundBtn.on('pointerdown', () => {
      soundOn = !soundOn;
      soundBtn.setTexture('shared2', soundOn ? 'sound-on' : 'sound-mute');
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
    const tex4 = this.textures.get('shared3');
    // 星星
    if (!tex4.has('star')) {
      tex4.add('star', 0, 58, 60, 64, 64);
    }
    const star = this.add.image(40, 40, 'shared3', 'star');
    star.setDepth(100);

    // 星星旁分数（白色数字精灵图）
    let scoreDigits = renderSpriteNumber(0, 80, 40, 100);

    // 皇冠
    if (!tex4.has('crown')) {
      tex4.add('crown', 0, 58, 189, 64, 64);
    }
    const crown = this.add.image(40, 100, 'shared3', 'crown');
    crown.setDepth(100);

    // 皇冠旁最高分（白色数字精灵图）
    const savedScore = parseInt(localStorage.getItem('giant2048_topscore') || '0');
    let topScoreDigits = renderSpriteNumber(savedScore, 80, 100, 100);

    this.layout = layout;
    // 操作记录器：和后端通信，每步操作发给后端验证
    this.recorder = new ActionRecorder();
    // this.hud = new HUD(this, w); // 暂时隐藏分数
    // 网格：根据实际canvas尺寸动态计算cellSize和偏移
    this.grid = new Grid(this, layout);
    // 合并系统：BFS扫描相邻同值方块，执行合并
    this.mergeSystem = new MergeSystem(this.grid);
    // 旋转系统：数据层矩阵转置 + 视觉Tween动画
    this.rotateSystem = new RotateSystem(this.grid, this);

    // // 弹弓：暂时注释，重新放
    // this.sling = new Sling(this, this.grid, layout);
    // this.sling.onShoot((shape, col) => this.handleShoot(shape, col));

    // 旋转按钮：左下↺ 右下↻，键盘A/D
    this.createRotateButtons(w, h, layout);

    // 恢复之前的游戏状态（窗口resize后）
    this.restoreState();

    // 监听窗口resize：保存状态后刷新页面
    window.addEventListener('resize', this.onResize);

    // 解析 URL 参数 userId
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId') || '';

    // 后端开局：获取 gameId + 50个糖果序列
    this.initBackend(userId);

    console.log('[GameScene] create done');
    this.printGrid('初始棋盘');
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
      gameId: this.recorder.getGameId(),
      sign: this.recorder.getSign(),
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

  // 后端开局：获取 gameId 和50个糖果序列
  private async initBackend(userId: string): Promise<void> {
    try {
      const { currentCandy, nextCandy } = await this.recorder.init(userId);
      console.log(`[开局] gameId=${this.recorder.getGameId()}, current=${currentCandy}, next=${nextCandy}`);
      this.sling.initCandies(currentCandy, nextCandy);
    } catch (e) {
      console.error('[开局失败] 使用本地随机模式', e);
      const pool = [2, 4, 8, 16, 32];
      const c = pool[Math.floor(Math.random() * pool.length)];
      const n = pool[Math.floor(Math.random() * pool.length)];
      this.sling.initCandies(c, n);
    }

    // // 启动超时检测（暂时注释）
    // this.startIdleTimer();
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
    console.log('[超时] 60秒无操作，游戏结束');
    this.hideHurryUp();
    this.recorder.finish('timeout');
    this.gameOver();
  }

  // 从后端序列取下一个糖果，设置到弹弓上
  private respawnWithSequence(): void {
    // 消费序列中的下一个值作为弹弓上的糖果
    const nextValue = this.recorder.consumeNext();
    this.sling.setNextCandy(nextValue);
    this.sling.respawn();

    // 更新预览：peek 下一个
    const peekValue = this.recorder.peekNext();
    // respawn 后 300ms 弹弓会调用 spawnNextShape → updateNextPreview
    // 这里提前设好 nextValue
    this.time.delayedCall(350, () => {
      this.sling.setNextCandy(peekValue);
    });
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

  // 创建左右旋转按钮，使用素材图片
  private createRotateButtons(w: number, h: number, layout: LayoutConfig): void {
    // 旋转按钮放在底部托盘区域，原尺寸132×118
    const btnY = h - 260 / 2 + 75; // tray中心高度

    // 注册旋转按钮帧
    const tex2 = this.textures.get('shared2');
    if (!tex2.has('rotate_btn')) {
      tex2.add('rotate_btn', 0, ROTATE_BTN_REGION.x, ROTATE_BTN_REGION.y, ROTATE_BTN_REGION.w, ROTATE_BTN_REGION.h);
    }

    // 左旋转按钮 — 原尺寸，左边
    const leftBtn = this.add.image(132 / 2 + 40, btnY, 'shared2', 'rotate_btn');
    leftBtn.setScale(0.8)
    leftBtn.setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    leftBtn.on('pointerdown', () => this.doRotate('ccw'));

    // 右旋转按钮 — 原尺寸，右边，水平翻转
    const rightBtn = this.add.image(w - 132 / 2 - 45, btnY, 'shared2', 'rotate_btn');
    rightBtn.setFlipX(true);
    rightBtn.setScale(0.8)
    rightBtn.setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    rightBtn.on('pointerdown', () => this.doRotate('cw'));

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
    if (this.isRotating) return;
    this.isRotating = true;

    console.log(`[旋转] 方向: ${direction === 'cw' ? '顺时针' : '逆时针'}`);
    this.printGrid('旋转前');

    this.sound.play('rotation', { volume: 0.3 });
    this.recorder.recordRotate(direction);

    // 棋盘背景旋转动画
    const targetAngle = this.grid.boardBg.angle + (direction === 'cw' ? 90 : -90);
    this.tweens.add({
      targets: this.grid.boardBg,
      angle: targetAngle,
      duration: 300,
      ease: 'Cubic.easeInOut',
    });

    const onComplete = () => {
      this.isRotating = false;
      this.printGrid('旋转后');
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
    console.log(`[发射] 列=${col + 1}, 值=${shape.value}`);
    this.printGrid('发射前');

    const landingRow = this.findLandingRow(col);
    console.log(`[落点] 计算结果: 行=${landingRow === -1 ? '满' : landingRow + 1}, 列=${col + 1}`);

    if (landingRow === -1) {
      // 列满了，检查最底行是否同值可直接合并
      const bottomRow = GRID_ROWS - 1;
      if (this.grid.data[bottomRow][col] === shape.value) {
        console.log(`[直接合并] 列${col + 1}满，底行值=${this.grid.data[bottomRow][col]}与发射值=${shape.value}相同，直接合并`);
        const shootValue = shape.value;
        shape.destroy();
        const newValue = shootValue * 2;
        this.recorder.recordDirectMerge(col, shootValue, newValue);
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
        this.hud.addScore(newValue);
        this.printGrid('直接合并后');
        this.time.delayedCall(150, () => this.checkMerges());
        this.respawnWithSequence();
        return;
      }
      // 打不出去，不换糖果，糖果回到弹弓上
      console.log(`[拒绝] 列${col + 1}满，底行值=${this.grid.data[bottomRow][col]}与发射值=${shape.value}不同，不能发射`);
      this.sling.cancelShoot(shape);
      return;
    }

    const body = shape.getBody();
    body.setVelocity(0, 0);

    const targetPos = this.grid.cellToPixel(landingRow, col);
    const distance = Math.abs(shape.y - targetPos.y);
    const duration = Math.max(150, distance * 0.4);

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
    const colData = Array.from({length: GRID_ROWS}, (_, r) => this.grid.data[r][col]);
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
    this.recorder.recordShoot(col, value);
    shape.destroy();

    const border = this.grid.placeBorder(targetRow, col, value);

    this.tweens.add({
      targets: border,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    this.sound.play('slingshot2', { volume: 0.3 });
    this.lastLandedCol = col;

    // 发射计数，每 STONE_SPAWN_INTERVAL 个生成一个石头
    this.shootCount++;
    if (this.shootCount % STONE_SPAWN_INTERVAL === 0) {
      this.spawnStone();
    }

    this.printGrid('落地后');
    this.time.delayedCall(150, () => this.checkMerges());
  }

  // 在棋盘随机空格生成一个石头
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
  private checkMerges(): void {
    const groups = this.mergeSystem.findMergeGroups();
    console.log(`[合并检查] 找到 ${groups.length} 个合并组`);

    if (groups.length === 0) {
      this.lastLandedCol = undefined;
      this.sling.respawn();
      // 检查是否游戏结束
      this.time.delayedCall(400, () => this.checkGameOver());
      return;
    }

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const group = groups[0];
    console.log(`[合并] 值=${group.value}, 数量=${group.cells.length}, 位置=[${group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ')}]`);

    const result = this.mergeSystem.executeMerge(group, this.lastLandedCol);
    console.log(`[合并结果] 新值=${result.newValue}, 位置=(${result.row + 1},${result.col + 1})`);

    this.hud.addScore(result.newValue);
    this.recorder.reportScore(this.hud.getScore());
    this.sound.play('collapse1', { volume: 0.4 });
    this.lastLandedCol = result.col;

    const border = this.grid.borders[result.row][result.col];
    if (border) {
      this.tweens.add({
        targets: border,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    // 石头碎掉音效
    if (result.destroyedStones.length > 0) {
      console.log(`[石头碎掉] ${result.destroyedStones.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
      this.sound.play('stonedestroy', { volume: 0.3 });
    }

    this.printGrid('合并后');
    // 合并后上靠：只处理被消除的列
    this.applyGravityUp([...result.removedCells, ...result.destroyedStones]);
    this.printGrid('上靠后');
    this.time.delayedCall(400, () => this.checkMerges());
  }

  // 旋转后合并检查——不调用 respawn，因为弹弓上已经有糖果
  private checkMergesAfterRotation(): void {
    const groups = this.mergeSystem.findMergeGroups();
    console.log(`[旋转后合并检查] 找到 ${groups.length} 个合并组`);

    if (groups.length === 0) return;

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const group = groups[0];
    console.log(`[旋转后合并] 值=${group.value}, 数量=${group.cells.length}, 位置=[${group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ')}]`);

    const result = this.mergeSystem.executeMerge(group);
    console.log(`[旋转后合并结果] 新值=${result.newValue}, 位置=(${result.row + 1},${result.col + 1})`);

    this.hud.addScore(result.newValue);
    this.sound.play('collapse1', { volume: 0.4 });

    const border = this.grid.borders[result.row][result.col];
    if (border) {
      this.tweens.add({
        targets: border,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    if (result.destroyedStones.length > 0) {
      console.log(`[旋转石头碎掉] ${result.destroyedStones.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}`);
      this.sound.play('stonedestroy', { volume: 0.3 });
    }
    this.printGrid('旋转合并后');
    this.applyGravityUp([...result.removedCells, ...result.destroyedStones]);
    this.printGrid('旋转上靠后');
    this.time.delayedCall(400, () => this.checkMergesAfterRotation());
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
          // 把行 r+1 的元素移到行 r
          this.grid.data[r][col] = this.grid.data[r + 1][col];
          this.grid.borders[r][col] = this.grid.borders[r + 1][col];
          this.grid.stones[r][col] = this.grid.stones[r + 1][col];

          this.grid.data[r + 1][col] = 0;
          this.grid.borders[r + 1][col] = null;
          this.grid.stones[r + 1][col] = null;

          const { x, y } = this.grid.cellToPixel(r, col);

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

  // 检查游戏是否结束：所有列都满且当前糖果无法放置到任何列
  private checkGameOver(): void {
    // 检查是否有任何列可以放置任何糖果
    let canPlace = false;
    for (let col = 0; col < GRID_COLS; col++) {
      // 列有空格 → 可以放
      const landingRow = this.findLandingRow(col);
      if (landingRow !== -1) {
        canPlace = true;
        break;
      }
      // 列满但最底行有同值 → 可以直接合并（但我们不知道未来的糖果值）
      // 所以只要有任何一列的最底行存在值，就检查所有可能的生成值
      const bottomVal = this.grid.data[GRID_ROWS - 1][col];
      if (bottomVal > 0) {
        // 检查当前弹弓糖果是否能打进
        const spawnPool = SHAPE_VALUES.slice(-SPAWN_NUMBER_MAX);
        if (spawnPool.includes(bottomVal)) {
          canPlace = true;
          break;
        }
      }
    }

    if (!canPlace) {
      console.log('[游戏结束] 无法放置任何糖果');
      this.gameOver();
    }
  }

  // 游戏结束处理
  private gameOver(): void {
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

    // 提交分数到后端并结束游戏
    this.recorder.reportScore(this.hud.getScore());
    this.recorder.finish();

    // 重新开始按钮
    const restartBtn = this.add.text(w / 2, h * 0.58, '↻ RESTART', {
      fontSize: `${Math.round(w * 0.06)}px`,
      color: '#ffffff',
      backgroundColor: '#4caf50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    restartBtn.on('pointerdown', () => {
      // 清除 resize 状态
      sessionStorage.removeItem('giant2048_state');
      sessionStorage.removeItem('giant2048_playing');
      // 移除 resize 监听
      window.removeEventListener('resize', this.onResize);
      this.scene.start('GameScene');
    });
  }

}
