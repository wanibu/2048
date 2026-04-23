import * as Phaser from 'phaser';
import {
  PLAY_BACKGROUND_DISPLAY_HEIGHT,
  PLAY_BACKGROUND_DISPLAY_WIDTH,
  PLAY_BACKGROUND_GAME_X,
  PLAY_BACKGROUND_GAME_Y,
} from '../config';

export class GameUiObjects {
  readonly giantHead: Phaser.GameObjects.Image;
  readonly pauseBtn: Phaser.GameObjects.Image;
  readonly soundBtn: Phaser.GameObjects.Image;
  readonly rotateArrowL: Phaser.GameObjects.Image;
  readonly rotateArrowR: Phaser.GameObjects.Image;
  readonly trayHeight = 234;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.createBackground(scene);
    this.createTray(scene);
    const rotate = this.createRotateArrows(scene);
    this.rotateArrowL = rotate.left;
    this.rotateArrowR = rotate.right;
    this.createBgSquare(scene);
    this.createGirl(scene);
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
    const tray = scene.add.image(320, 1171, 'shared0-orig', 'panel-default');
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

  private createGirl(scene: Phaser.Scene): void {
    const tex = scene.textures.get('girl-full');
    if (!tex.has('girl-default')) {
      tex.add('girl-default', 0, 769, 769, 204, 244);
    }
    const girl = scene.add.image(555, 1065, 'girl-full', 'girl-default');
    girl.setOrigin(0.4167, 0.9959);
    girl.setScale(0.8);
    girl.setDepth(50);
  }

  private createGiant(scene: Phaser.Scene): Phaser.GameObjects.Image {
    const tex = scene.textures.get('shared0-orig');
    if (!tex.has('giant-default')) {
      tex.add('giant-default', 0, 1619, 1025, 421, 610);
    }
    const giant = scene.add.image(321, 116, 'shared0-orig', 'giant-default');
    giant.setOrigin(0.505938, 0.501639);
    giant.setDisplaySize(421, 610);
    giant.setAngle(7);
    giant.setDepth(-10);
    return giant;
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

  private createScoreIcons(scene: Phaser.Scene): void {
    const tex = scene.textures.get('shared3');
    if (!tex.has('star-ui')) {
      tex.add('star-ui', 0, 1, 193, 50, 50);
    }
    if (!tex.has('crown-ui')) {
      tex.add('crown-ui', 0, 65, 193, 50, 50);
    }
    const star = scene.add.image(44, -175, 'shared3', 'star-ui');
    star.setOrigin(0.5, 0.5);
    star.setDisplaySize(50, 50);
    star.setDepth(90);

    const crown = scene.add.image(44, -115, 'shared3', 'crown-ui');
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
