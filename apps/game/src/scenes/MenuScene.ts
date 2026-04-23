import * as Phaser from 'phaser';
import {
  BORDER_EXPLODE_FRAMES,
  GAME_HEIGHT,
  GAME_WIDTH,
  GIANT_HEAD_FRAMES,
  PLAY_BACKGROUND_DISPLAY_HEIGHT,
  PLAY_BACKGROUND_DISPLAY_WIDTH,
  PLAY_BACKGROUND_MENU_X,
  PLAY_BACKGROUND_MENU_Y,
  SHAPE_REGIONS,
  SpriteAnimationFrame,
  SpriteRegion,
} from '../config';

export class MenuScene extends Phaser.Scene {
  private headImages: Phaser.GameObjects.Image[] = [];
  private readonly debugBackgroundOnly = true;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.ensureBackgroundMusic();

    // 刷新页面清理旧状态，不恢复游戏
    sessionStorage.removeItem('giant2048_playing');

    // 模拟 C3 fullscreen scale-outer：把 640×960 的 design layout 居中到被拉大的视窗里，
    // 这样窄屏能露出 layout 上/下方约 212px 的"边界外"区域（原游戏左下角那棵树就在这段）。
    this.cameras.main.setScroll(
      (GAME_WIDTH - this.cameras.main.width) / 2,
      (GAME_HEIGHT - this.cameras.main.height) / 2,
    );
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // ===== 1. PlayBackground =====
    // data.json Menu instance: x=-158, y=-314, size=958x1630, origin=(0,0).
    const bg = this.add.image(PLAY_BACKGROUND_MENU_X, PLAY_BACKGROUND_MENU_Y, 'playbackground');
    bg.setOrigin(0, 0);
    bg.setDisplaySize(PLAY_BACKGROUND_DISPLAY_WIDTH, PLAY_BACKGROUND_DISPLAY_HEIGHT);
    bg.setDepth(-1000);

    // ===== 2. 底部 GameRBanner（原版 Menu 实例：x=320, y=793, size=650×328）=====
    // Sheet 源帧 512×254，用 setDisplaySize 按 data.json 实例尺寸显示，而不是 setScale(1.27)
    // —— 后者 height 会算成 322.58，跟 data.json 的 328 差 5px。
    this.registerFrame('shared0', 'game-r-banner', { x: 1452, y: 1793, w: 512, h: 254 });
    const banner = this.add.image(w / 2, 1005, 'shared0', 'game-r-banner');
    banner.setDisplaySize(650, 328);
    banner.setDepth(5);

    if (this.debugBackgroundOnly) {
      return;
    }

    // ===== 3. Play 按钮（原版 Menu 实例位置）=====
    this.registerFrame('shared1', 'play-btn', { x: 515, y: 769, w: 256, h: 240 });
    const playBtn = this.add.image(w / 2, 490, 'shared1', 'play-btn');
    playBtn.setScale(1.054);
    playBtn.setDepth(20);
    playBtn.setInteractive({ useHandCursor: true });
    playBtn.on('pointerdown', () => this.scene.start('GameScene'));

    // ===== 4. 眨眼头像（原版 Menu 实例：pos=(339,139), angle=10°）=====
    this.headImages = []; // 清空旧引用
    const headX = 339;
    const headY = 139;
    for (let i = 0; i < GIANT_HEAD_FRAMES.length; i++) {
      const f = GIANT_HEAD_FRAMES[i];
      const key = `giant_head_${i}`;
      const tex = this.textures.get(f.texture);
      if (!tex.has(key)) {
        tex.add(key, 0, f.region.x, f.region.y, f.region.w, f.region.h);
      }
      const img = this.add.image(headX, headY, f.texture, key);
      img.setAngle(10);
      img.setDepth(10);
      img.setVisible(i === 0);
      this.headImages.push(img);
    }
    this.startBlinkLoop();

    // ===== 5. "2048" 标题进场：4 数字依次飞入 + BorderExplodeAnimation =====
    this.createTitleDigits();

    // // 4. 糖果球拼"2048"（depth 15）——旧代码
    // const candyValues = [2, 0, 4, 8];
    // const candySize = w * 0.12;
    // const candyY = h * 0.48;
    // const totalWidth = candyValues.length * candySize * 1.1;
    // const startX = (w - totalWidth) / 2 + candySize / 2;
    // candyValues.forEach((val, i) => {
    //   const region = SHAPE_REGIONS[val];
    //   if (region) {
    //     const frameKey = `menu_candy_${val}`;
    //     this.registerFrame('shape-full', frameKey, region);
    //     const candy = this.add.image(startX + i * candySize * 1.1, candyY, 'shape-full', frameKey);
    //     candy.setDisplaySize(candySize, candySize);
    //     candy.setDepth(15);
    //     this.tweens.add({
    //       targets: candy, y: candyY - 5, duration: 800 + i * 200,
    //       yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    //     });
    //   }
    // });

    // // 5. 圆形播放按钮（depth 20）
    // this.registerFrame('shared1', 'play-btn', { x: 514, y: 757, w: 260, h: 260 });
    // const playBtn = this.add.image(w / 2, h * 0.62, 'shared1', 'play-btn');
    // const btnSize = w * 0.2;
    // playBtn.setDisplaySize(btnSize, btnSize);
    // playBtn.setDepth(20);
    // playBtn.setInteractive({ useHandCursor: true });
    // playBtn.on('pointerover', () => playBtn.setScale(playBtn.scaleX * 1.05, playBtn.scaleY * 1.05));
    // playBtn.on('pointerout', () => playBtn.setDisplaySize(btnSize, btnSize));
    // playBtn.on('pointerdown', () => this.scene.start('GameScene'));

    // // BGM
    // if (!this.sound.get('bgm')) {
    //   this.sound.play('bgm', { loop: true, volume: 0.4 });
    // }

  }

  // 注册精灵帧（防重复）
  private registerFrame(texKey: string, frameKey: string, region: SpriteRegion): void {
    const tex = this.textures.get(texKey);
    if (!tex.has(frameKey)) {
      tex.add(frameKey, 0, region.x, region.y, region.w, region.h);
    }
  }

  private createTitleDigits(): void {
    const digits = [
      { value: 2, x: 94, y: 584 },
      { value: 0, x: 254, y: 504 },
      { value: 4, x: 408, y: 504 },
      { value: 8, x: 546, y: 584 },
    ];
    const firstDelay = 500;
    const stagger = 250;
    const popDuration = 400;
    const burstDelay = 380;
    const startY = GAME_HEIGHT + 280;
    const titleCandies: Phaser.GameObjects.Image[] = [];

    digits.forEach((digit, index) => {
      const region = SHAPE_REGIONS[digit.value];
      if (!region) return;

      const frameKey = `menu_title_${digit.value}`;
      this.registerFrame('shape-full', frameKey, region);
      const candy = this.add.image(digit.x, startY, 'shape-full', frameKey);
      candy.setDepth(15);
      candy.setDisplaySize(128, 128);
      candy.setAlpha(0);
      titleCandies.push(candy);

      this.time.delayedCall(firstDelay + index * stagger, () => {
        this.animateTitleDigit(candy, digit.x, digit.y, popDuration, burstDelay);
      });
    });

    this.time.delayedCall(4000, () => {
      this.startTitleRotationLoop(titleCandies);
    });
  }

  private animateTitleDigit(
    candy: Phaser.GameObjects.Image,
    x: number,
    y: number,
    popDuration: number,
    burstDelay: number
  ): void {
    this.tweens.add({
      targets: candy,
      y: y - 20,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 1,
      duration: popDuration * 0.7,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: candy,
          y,
          scaleX: 1,
          scaleY: 1,
          duration: popDuration * 0.3,
          ease: 'Sine.easeOut',
        });
      },
    });

    this.time.delayedCall(burstDelay, () => this.playBorderExplode(x, y));
  }

  private startTitleRotationLoop(candies: Phaser.GameObjects.Image[]): void {
    if (candies.length === 0) return;

    const rotateOnce = () => {
      this.tweens.add({
        targets: candies,
        angle: '+=360',
        duration: 800,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          candies.forEach(candy => candy.setAngle(0));
          this.time.delayedCall(4000, rotateOnce);
        },
      });
    };

    rotateOnce();
  }

  private playBorderExplode(x: number, y: number): void {
    const firstFrame = BORDER_EXPLODE_FRAMES[0];
    const frameKey = this.ensureAnimationFrame('menu_border_explode_0', firstFrame);
    const burst = this.add.image(x, y, firstFrame.texture, frameKey);
    burst.setDepth(16);
    burst.setOrigin(firstFrame.pivotX, firstFrame.pivotY);
    burst.setScale(0.4);

    BORDER_EXPLODE_FRAMES.forEach((frame, index) => {
      this.time.delayedCall(index * 50, () => {
        const key = this.ensureAnimationFrame(`menu_border_explode_${index}`, frame);
        burst.setTexture(frame.texture, key);
        burst.setOrigin(frame.pivotX, frame.pivotY);
      });
    });

    this.time.delayedCall(BORDER_EXPLODE_FRAMES.length * 50, () => {
      this.tweens.add({
        targets: burst,
        alpha: 0,
        duration: 150,
        ease: 'Sine.easeOut',
        onComplete: () => burst.destroy(),
      });
    });
  }

  private ensureAnimationFrame(frameKey: string, frame: SpriteAnimationFrame): string {
    const tex = this.textures.get(frame.texture);
    if (!tex.has(frameKey)) {
      tex.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
    }
    return frameKey;
  }

  private ensureBackgroundMusic(): void {
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.ensureBackgroundMusic());
      return;
    }

    const bgm = this.sound.get('bgm');
    if (bgm) {
      if (!bgm.isPlaying) {
        bgm.play({ loop: true, volume: 0.4 });
      }
      return;
    }

    this.sound.play('bgm', { loop: true, volume: 0.4 });
  }

  private showFrame(index: number): void {
    for (let i = 0; i < this.headImages.length; i++) {
      this.headImages[i].setVisible(i === index);
    }
  }

  private startBlinkLoop(): void {
    this.showFrame(0);
    const openDuration = Phaser.Math.Between(2000, 3500);
    this.time.delayedCall(openDuration, () => this.doBlink());
  }

  private doBlink(): void {
    const blinkFrames = [1, 2, 3, 2, 1, 0];
    const blinkDelay = 48;
    blinkFrames.forEach((frame, i) => {
      this.time.delayedCall(i * blinkDelay, () => this.showFrame(frame));
    });
    this.time.delayedCall(blinkFrames.length * blinkDelay, () => this.startBlinkLoop());
  }
}
