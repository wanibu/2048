import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GIANT_HEAD_FRAMES, SHAPE_REGIONS, SpriteRegion } from '../config';

export class MenuScene extends Phaser.Scene {
  private headImages: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // 如果是resize后刷新，直接跳到GameScene恢复游戏
    if (sessionStorage.getItem('giant2048_playing') === '1') {
      sessionStorage.removeItem('giant2048_playing');
      this.scene.start('GameScene');
      return;
    }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // ===== 1. 全屏背景 =====
    // 高度100%铺满，宽度auto按比例，从左侧开始
    const bg = this.add.image(0, 0, 'playbackground');
    bg.setOrigin(0, 0); // 左上角对齐
    const bgScale = h / bg.height; // 高度铺满
    bg.setScale(bgScale);
    bg.setDepth(-1000);

    // ===== 2. 小姑娘庆祝（depth 5，底部）=====
    this.registerFrame('shared0', 'girl-win', { x: 1446, y: 1794, w: 525, h: 237 });
    const girlScale = w / 525; // 宽度铺满窗口
    const girlH = 237 * girlScale;
    const girl = this.add.image(w / 2, h - girlH / 2 - 30, 'shared0', 'girl-win');
    girl.setScale(girlScale);
    girl.setDepth(5);

    // ===== 3. 圆形播放按钮（depth 20，正中间）=====
    this.registerFrame('shared1', 'play-btn', { x: 514, y: 757, w: 260, h: 260 });
    const playBtn = this.add.image(w / 2, h * 0.57, 'shared1', 'play-btn');
    playBtn.setDepth(20);
    playBtn.setInteractive({ useHandCursor: true });
    playBtn.on('pointerdown', () => this.scene.start('GameScene'));

    // ===== 4. 眨眼头像（depth 10，原尺寸420×611，倾斜7度）=====
    this.headImages = []; // 清空旧引用
    const headX = w / 2;
    const headY = h * 0.60 - 130 - 611 / 2 - 40; // 播放按钮Y - 按钮半径 - 头像半高，紧挨着
    for (let i = 0; i < GIANT_HEAD_FRAMES.length; i++) {
      const f = GIANT_HEAD_FRAMES[i];
      const key = `giant_head_${i}`;
      const tex = this.textures.get(f.texture);
      if (!tex.has(key)) {
        tex.add(key, 0, f.region.x, f.region.y, f.region.w, f.region.h);
      }
      const img = this.add.image(headX, headY, f.texture, key);
      img.setAngle(7);
      img.setDepth(10);
      img.setVisible(i === 0);
      this.headImages.push(img);
    }
    this.startBlinkLoop();

    // ===== 5. 糖果球 2048 弧形排列（depth 15）=====
    const candyValues = [2, 0, 4, 8];
    const btnCenterX = w / 2;
    const btnCenterY = h * 0.60;
    const arcRadius = 300; // 弧形半径（加大间距）
    // 90度弧，从225度到315度
    const startAngle = 225;
    const endAngle = 315;
    const angleStep = (endAngle - startAngle) / (candyValues.length - 1);

    candyValues.forEach((val, i) => {
      const region = SHAPE_REGIONS[val];
      if (region) {
        const frameKey = `menu_candy_${val}`;
        this.registerFrame('shape-full', frameKey, region);
        const angleDeg = startAngle + i * angleStep;
        const angleRad = (angleDeg * Math.PI) / 180;
        const cx = btnCenterX + Math.cos(angleRad) * arcRadius;
        const cy = btnCenterY + Math.sin(angleRad) * arcRadius - 20; // 上移20px（原30，下移10）
        const candy = this.add.image(cx, cy, 'shape-full', frameKey);
        candy.setDepth(15);
        // 每隔15秒自动旋转360度，旋转速度1秒
        const spinCandy = () => {
          this.tweens.add({
            targets: candy,
            angle: candy.angle + 360,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              this.time.delayedCall(15000, spinCandy);
            },
          });
        };
        this.time.delayedCall(15000, spinCandy); // 同时启动
      }
    });

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

    // 临时：点击任意位置进入游戏
    this.input.on('pointerdown', () => this.scene.start('GameScene'));
  }

  // 注册精灵帧（防重复）
  private registerFrame(texKey: string, frameKey: string, region: SpriteRegion): void {
    const tex = this.textures.get(texKey);
    if (!tex.has(frameKey)) {
      tex.add(frameKey, 0, region.x, region.y, region.w, region.h);
    }
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
