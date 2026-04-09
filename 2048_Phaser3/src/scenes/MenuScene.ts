import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GIANT_HEAD_FRAMES } from '../config';

export class MenuScene extends Phaser.Scene {
  // 4个独立Image对象，每帧一个，切帧时只切visible，不动scale/texture，避免抖动
  private headImages: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  // Phaser Scene 生命周期：资源加载完后自动调用，创建游戏对象
  create(): void {
    // 在画布中心放置背景图，'playbackground' 是 BootScene 里加载的 key
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'playbackground');
    // 取水平/垂直缩放比的较大值，保证背景完全覆盖画布（不留黑边）
    bg.setScale(Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height));
    // depth越小越在底层，-1000确保背景在所有元素下面
    bg.setDepth(-1000);

    // 头像位置和显示尺寸，4帧共用完全相同的值
    const headX = GAME_WIDTH / 2; // 320，水平居中
    const headY = 200;             // 离顶部200px
    const displayW = 280;          // 显示宽度
    const displayH = 400;          // 显示高度

    // 遍历4帧（i = 0,1,2,3），每帧创建一个独立Image
    for (let i = 0; i < GIANT_HEAD_FRAMES.length; i++) {
      // 取出第i帧配置：texture(哪张图) + region(裁切区域 x,y,w,h)
      const f = GIANT_HEAD_FRAMES[i];
      // 给每帧一个唯一key，如 "giant_head_0"
      const key = `giant_head_${i}`;
      // 获取Phaser Texture对象（如 'shared0' 对应 shared-0-sheet0.png 整张大图）
      const tex = this.textures.get(f.texture);
      // 在大图上定义裁切Frame：从(x,y)开始裁w×h区域，命名为key
      // 等价于CSS sprite的 background-position + width/height
      // 0是source index（单图默认0），if防止重复注册
      if (!tex.has(key)) {
        tex.add(key, 0, f.region.x, f.region.y, f.region.w, f.region.h);
      }
      // 创建Image，使用texture中名为key的Frame，放在(headX, headY)
      const img = this.add.image(headX, headY, f.texture, key);
      // 强制显示为280×400，Phaser自动算scaleX/scaleY
      img.setDisplaySize(displayW, displayH);
      // 顺时针旋转8度
      img.setAngle(8);
      // 深度10，在背景(-1000)之上，UI(20)之下
      img.setDepth(10);
      // 只有第0帧(睁眼)可见，其余3帧创建但隐藏
      img.setVisible(i === 0);
      // 存到数组，后面切帧用索引访问
      this.headImages.push(img);
    }

    // 启动眨眼定时器循环
    this.startBlinkLoop();

    // "2048"标题：白色+棕色描边+阴影，setOrigin(0.5)以自身中心对齐坐标点
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, '2048', {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#553300',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20);

    // PLAY按钮：绿色背景，setInteractive让它可点击，useHandCursor鼠标变手型
    const playBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '▶ PLAY', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#4caf50',
      padding: { x: 50, y: 18 },
      stroke: '#2e7d32',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

    // 鼠标悬停放大5%，移开恢复
    playBtn.on('pointerover', () => playBtn.setScale(1.05));
    playBtn.on('pointerout', () => playBtn.setScale(1));
    // 点击切换到GameScene
    playBtn.on('pointerdown', () => this.scene.start('GameScene'));
  }

  // 切帧：隐藏所有Image，只显示目标帧——不动scale/texture，零抖动
  private showFrame(index: number): void {
    for (let i = 0; i < this.headImages.length; i++) {
      this.headImages[i].setVisible(i === index);
    }
  }

  // 眨眼循环：帧0(睁眼)停留2-3秒，然后快速眨眼
  private startBlinkLoop(): void {
    this.showFrame(0);
    // 随机停留2000-3500ms模拟自然眨眼节奏
    const openDuration = Phaser.Math.Between(2000, 3500);
    this.time.delayedCall(openDuration, () => this.doBlink());
  }

  // 执行一次眨眼：1→2→3→2→1→0，每帧80ms
  private doBlink(): void {
    const blinkFrames = [1, 2, 3, 2, 1, 0];
    const blinkDelay = 80; // 每帧80ms，快速闭眼再睁开

    blinkFrames.forEach((frame, i) => {
      this.time.delayedCall(i * blinkDelay, () => this.showFrame(frame));
    });

    // 眨眼结束后重新开始循环
    this.time.delayedCall(blinkFrames.length * blinkDelay, () => this.startBlinkLoop());
  }
}
