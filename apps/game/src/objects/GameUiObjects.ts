import * as Phaser from 'phaser';
import {
  GIANT_BLINK_FRAMES,
  GIANT_BLINK_FRAME_MS,
  GIANT_BLINK_INTERVAL_MAX_MS,
  GIANT_BLINK_INTERVAL_MIN_MS,
  GIRL_BLINK_FRAMES,
  GIRL_BLINK_FRAME_MS,
  GIRL_BLINK_INTERVAL_MAX_MS,
  GIRL_BLINK_INTERVAL_MIN_MS,
  GIRL_SURPRISE_FRAMES,
  PLAY_BACKGROUND_DISPLAY_HEIGHT,
  PLAY_BACKGROUND_DISPLAY_WIDTH,
  PLAY_BACKGROUND_GAME_X,
  PLAY_BACKGROUND_GAME_Y,
} from '../config';

export class GameUiObjects {
  readonly girl: Phaser.GameObjects.Image;
  readonly giantHead: Phaser.GameObjects.Image;
  readonly pauseBtn: Phaser.GameObjects.Image;
  readonly soundBtn: Phaser.GameObjects.Image;
  readonly rotateArrowL: Phaser.GameObjects.Image;
  readonly rotateArrowR: Phaser.GameObjects.Image;
  readonly trayHeight = 374;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.createBackground(scene);
    this.createTray(scene);
    const rotate = this.createRotateArrows(scene);
    this.rotateArrowL = rotate.left;
    this.rotateArrowR = rotate.right;
    this.createBgSquare(scene);
    this.girl = this.createGirl(scene);
    this.giantHead = this.createGiant(scene);
    this.createKeyHints(scene);
    this.createScoreIcons(scene);
    this.soundBtn = this.createSoundButton(scene);
    this.pauseBtn = this.createPauseButton(scene);
    this.createCandyHole(scene, w, h);
  }

  private createBackground(scene: Phaser.Scene): void {
    const bg = scene.add.image(PLAY_BACKGROUND_GAME_X, PLAY_BACKGROUND_GAME_Y, 'playbackground');
    bg.setOrigin(0, 0);
    bg.setDisplaySize(PLAY_BACKGROUND_DISPLAY_WIDTH, PLAY_BACKGROUND_DISPLAY_HEIGHT);
    bg.setDepth(-1000);
  }

  private createTray(scene: Phaser.Scene): void {
    const tex = scene.textures.get('shared0-orig');
    if (!tex.has('panel-default')) {
      tex.add('panel-default', 0, 770, 736, 1024, 273);
    }
    const tray = scene.add.image(320, 1238, 'shared0-orig', 'panel-default');
    tray.setOrigin(0.5, 1);
    tray.setDisplaySize(837, this.trayHeight);
    tray.setDepth(70);
  }

  private createRotateArrows(scene: Phaser.Scene): {
    left: Phaser.GameObjects.Image;
    right: Phaser.GameObjects.Image;
  } {
    const tex = scene.textures.get('shared2');
    if (!tex.has('rotate-arrow')) {
      tex.add('rotate-arrow', 0, 257, 769, 128, 115);
    }
    const left = scene.add.image(110, 1110, 'shared2', 'rotate-arrow');
    left.setOrigin(0.504132, 0.458015);
    left.setDisplaySize(96, 96);
    left.setDepth(80);

    const right = scene.add.image(530, 1110, 'shared2', 'rotate-arrow');
    right.setOrigin(0.504132, 0.458015);
    right.setDisplaySize(96, 96);
    right.setFlipX(true);
    right.setDepth(80);

    return { left, right };
  }

  private createBgSquare(scene: Phaser.Scene): void {
    const tex = scene.textures.get('shared2');
    if (!tex.has('bg-square')) {
      tex.add('bg-square', 0, 255, 257, 128, 128);
    }
    const bgSquare = scene.add.image(320, 1115, 'shared2', 'bg-square');
    bgSquare.setOrigin(0.5, 0.5);
    bgSquare.setDisplaySize(96, 96);
    bgSquare.setDepth(75);
  }

  private createGirl(scene: Phaser.Scene): Phaser.GameObjects.Image {
    const tex = scene.textures.get('girl-full');
    if (!tex.has('girl-default')) {
      tex.add('girl-default', 0, 769, 769, 204, 244);
    }
    GIRL_SURPRISE_FRAMES.forEach((frame, index) => {
      const frameKey = `girl-surprise-${index}`;
      if (!tex.has(frameKey)) {
        tex.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
      }
    });
    GIRL_BLINK_FRAMES.forEach((frame, index) => {
      const frameKey = `girl-blink-${index}`;
      if (!tex.has(frameKey)) {
        tex.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
      }
    });
    const girl = scene.add.image(555, 1065, 'girl-full', 'girl-default');
    girl.setOrigin(0.4167, 0.9959);
    girl.setScale(0.8);
    girl.setDepth(50);
    this.startGirlBlinkLoop(scene, girl);
    return girl;
  }

  private startGirlBlinkLoop(scene: Phaser.Scene, girl: Phaser.GameObjects.Image): void {
    // 眨眼序列（ping-pong）：半闭 → 全闭 → 半闭 → 默认
    const sequence = ['girl-blink-0', 'girl-blink-1', 'girl-blink-0', 'girl-default'];
    const scheduleNext = (): void => {
      const delay = Phaser.Math.Between(GIRL_BLINK_INTERVAL_MIN_MS, GIRL_BLINK_INTERVAL_MAX_MS);
      scene.time.delayedCall(delay, () => {
        if (girl.getData('busy') === true) {
          scheduleNext();
          return;
        }
        sequence.forEach((frameKey, i) => {
          scene.time.delayedCall(i * GIRL_BLINK_FRAME_MS, () => {
            if (girl.getData('busy') === true) return;
            girl.setFrame(frameKey);
          });
        });
        scene.time.delayedCall(sequence.length * GIRL_BLINK_FRAME_MS, scheduleNext);
      });
    };
    scheduleNext();
  }

  private createGiant(scene: Phaser.Scene): Phaser.GameObjects.Image {
    const tex = scene.textures.get('shared0-orig');
    if (!tex.has('giant-default')) {
      tex.add('giant-default', 0, 1619, 1025, 421, 610);
    }
    GIANT_BLINK_FRAMES.forEach((frame, index) => {
      const frameKey = `giant-blink-${index + 1}`;
      const frameTex = scene.textures.get(frame.texture);
      if (!frameTex.has(frameKey)) {
        frameTex.add(frameKey, 0, frame.region.x, frame.region.y, frame.region.w, frame.region.h);
      }
    });
    const giant = scene.add.image(321, 116, 'shared0-orig', 'giant-default');
    giant.setOrigin(0.505938, 0.501639);
    giant.setDisplaySize(421, 610);
    giant.setAngle(7);
    giant.setDepth(-10);
    this.startGiantBlinkLoop(scene, giant);
    return giant;
  }

  private startGiantBlinkLoop(scene: Phaser.Scene, giant: Phaser.GameObjects.Image): void {
    // ping-pong: blink-1 → blink-2 → blink-3 (闭眼) → blink-2 → blink-1 → default (回睁眼)
    const sequence: { tex: string; frame: string }[] = [
      { tex: 'shared1', frame: 'giant-blink-1' },
      { tex: 'shared1', frame: 'giant-blink-2' },
      { tex: 'shared0-orig', frame: 'giant-blink-3' },
      { tex: 'shared1', frame: 'giant-blink-2' },
      { tex: 'shared1', frame: 'giant-blink-1' },
      { tex: 'shared0-orig', frame: 'giant-default' },
    ];
    const scheduleNext = (): void => {
      const delay = Phaser.Math.Between(GIANT_BLINK_INTERVAL_MIN_MS, GIANT_BLINK_INTERVAL_MAX_MS);
      scene.time.delayedCall(delay, () => {
        if (giant.getData('busy') === true) {
          scheduleNext();
          return;
        }
        sequence.forEach((step, i) => {
          scene.time.delayedCall(i * GIANT_BLINK_FRAME_MS, () => {
            if (giant.getData('busy') === true) return;
            giant.setTexture(step.tex, step.frame);
          });
        });
        scene.time.delayedCall(sequence.length * GIANT_BLINK_FRAME_MS, scheduleNext);
      });
    };
    scheduleNext();
  }

  private createKeyHints(scene: Phaser.Scene): void {
    const tex = scene.textures.get('shared2');
    if (!tex.has('key-a')) {
      tex.add('key-a', 0, 131, 769, 122, 122);
    }
    if (!tex.has('key-d')) {
      tex.add('key-d', 0, 385, 257, 122, 122);
    }
    const keyA = scene.add.image(119, 1110, 'shared2', 'key-a');
    keyA.setOrigin(0.5, 0.4508);
    keyA.setDisplaySize(30.5, 30.5);
    keyA.setDepth(85);

    const keyD = scene.add.image(521, 1110, 'shared2', 'key-d');
    keyD.setOrigin(0.4713, 0.4508);
    keyD.setDisplaySize(30.5, 30.5);
    keyD.setDepth(85);
  }

  // 左上角玩家信息：圆形头像 + 昵称 + 余额。
  // 数据由 GameScene 在 auth/login 返回后调进来。
  applyUserInfo(
    scene: Phaser.Scene,
    info: { avatar: string; nickname: string; score: string; currency: string },
  ): void {
    const ax = 44;
    const ay = -160;
    const radius = 28;

    // 灰色 placeholder 圆，避免头像 URL 加载前空白
    const placeholder = scene.add.circle(ax, ay, radius, 0x666666);
    placeholder.setDepth(90);
    placeholder.setStrokeStyle(2, 0xffffff, 0.9);

    const nickname = (info.nickname || 'Player').slice(0, 16);
    const nameText = scene.add.text(85, -192, nickname, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    nameText.setDepth(90);

    // 余额：用游戏精灵数字（white-0..9）渲染，不带逗号、不显示 VND
    const num = parseInt(info.score || '0') || 0;
    const texDigits = scene.textures.get('shared1');
    const whiteDigitCoords = [
      { x: 260, y: 1666 }, { x: 316, y: 1666 }, { x: 378, y: 1666 }, { x: 436, y: 1666 },
      { x: 495, y: 1666 }, { x: 555, y: 1666 }, { x: 615, y: 1666 }, { x: 675, y: 1666 },
      { x: 732, y: 1666 }, { x: 793, y: 1666 },
    ];
    for (let d = 0; d <= 9; d++) {
      const k = `white-${d}`;
      if (!texDigits.has(k)) texDigits.add(k, 0, whiteDigitCoords[d].x, whiteDigitCoords[d].y, 45, 60);
    }
    String(num).split('').forEach((d, i) => {
      const img = scene.add.image(92 + i * 28, -150, 'shared1', `white-${d}`);
      img.setScale(0.65);
      img.setDepth(90);
    });

    if (!info.avatar) return;

    // 动态加载头像 URL，用 Graphics 圆做几何 mask 实现圆形裁切
    const key = `avatar-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    scene.load.image(key, info.avatar);
    scene.load.once(`filecomplete-image-${key}`, () => {
      const img = scene.add.image(ax, ay, key);
      img.setDisplaySize(radius * 2, radius * 2);
      img.setDepth(91);
      const mask = scene.make.graphics();
      mask.fillStyle(0xffffff);
      mask.fillCircle(ax, ay, radius);
      img.setMask(mask.createGeometryMask());
      placeholder.destroy();
    });
    scene.load.once('loaderror', (file: { key: string }) => {
      if (file.key === key) console.warn('[avatar] load failed:', info.avatar);
    });
    scene.load.start();
  }

  private createScoreIcons(scene: Phaser.Scene): void {
    const tex = scene.textures.get('shared3');
    if (!tex.has('star-ui')) {
      tex.add('star-ui', 0, 1, 193, 50, 50);
    }
    if (!tex.has('crown-ui')) {
      tex.add('crown-ui', 0, 65, 193, 50, 50);
    }
    const star = scene.add.image(44, -95, 'shared3', 'star-ui');
    star.setOrigin(0.5, 0.5);
    star.setDisplaySize(50, 50);
    star.setDepth(90);

    const crown = scene.add.image(44, -35, 'shared3', 'crown-ui');
    crown.setOrigin(0.5, 0.5);
    crown.setDisplaySize(50, 50);
    crown.setDepth(90);
  }

  private createSoundButton(scene: Phaser.Scene): Phaser.GameObjects.Image {
    const tex = scene.textures.get('shared2');
    if (!tex.has('sound-on')) {
      tex.add('sound-on', 0, 1, 513, 128, 128);
    }
    if (!tex.has('sound-off')) {
      tex.add('sound-off', 0, 131, 513, 128, 128);
    }
    const sound = scene.add.image(586, -162, 'shared2', 'sound-on');
    sound.setOrigin(0.5, 0.5);
    sound.setDisplaySize(84.48, 84.48);
    sound.setDepth(90);
    return sound;
  }

  private createPauseButton(scene: Phaser.Scene): Phaser.GameObjects.Image {
    const tex = scene.textures.get('shared2');
    if (!tex.has('pause-inactive')) {
      tex.add('pause-inactive', 0, 1, 769, 128, 128);
    }
    if (!tex.has('pause-active')) {
      tex.add('pause-active', 0, 261, 513, 128, 128);
    }
    const pause = scene.add.image(508, -163, 'shared2', 'pause-inactive');
    pause.setOrigin(0.504132, 0.470149);
    pause.setDisplaySize(84.48, 84.48);
    pause.setDepth(90);
    return pause;
  }

  private createCandyHole(scene: Phaser.Scene, w: number, h: number): void {
    const tex = scene.textures.get('shared2');
    if (!tex.has('candy-hole')) {
      tex.add('candy-hole', 0, 260, 263, 120, 120);
    }
    const hole = scene.add.image(w / 2, h - this.trayHeight / 2 + 5, 'shared2', 'candy-hole');
    hole.setScale(0.7);
    hole.setDepth(71);
  }
}
