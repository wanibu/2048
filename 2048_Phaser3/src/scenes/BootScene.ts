import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Full texture images (frames are cropped dynamically via regions in config)
    this.load.image('shape-full', 'assets/images/shape-sheet0.png');
    this.load.image('border-full', 'assets/images/border-sheet0.png');
    this.load.image('shared0', 'assets/images/shared-0-sheet0.png');
    this.load.image('shared1', 'assets/images/shared-0-sheet1.png');
    this.load.image('shared2', 'assets/images/shared-0-sheet2.png');
    this.load.image('shared3', 'assets/images/shared-0-sheet3.png');
    this.load.image('stonedestroy-full', 'assets/images/stonedestroy-sheet0.png');

    // Background
    this.load.image('playbackground', 'assets/images/playbackground-sheet0.png');

    // Audio
    this.load.audio('slingshot1', 'assets/audio/slingshot1.webm');
    this.load.audio('slingshot2', 'assets/audio/slingshot2.webm');
    this.load.audio('slingshot3', 'assets/audio/slingshot3.webm');
    this.load.audio('firsthit', 'assets/audio/firsthit.webm');
    this.load.audio('collapse1', 'assets/audio/candycollapse1.webm');
    this.load.audio('collapse2', 'assets/audio/candycollapse2.webm');
    this.load.audio('crunch1', 'assets/audio/candycrunch1.webm');
    this.load.audio('crunch2', 'assets/audio/candycrunch2.webm');
    this.load.audio('rotation', 'assets/audio/cuberotation.webm');
    this.load.audio('combo', 'assets/audio/combo.webm');
    this.load.audio('wow', 'assets/audio/wow.webm');
    this.load.audio('button', 'assets/audio/buttonfinal.webm');
    this.load.audio('endlevel', 'assets/audio/endoflevel.webm');
    this.load.audio('win', 'assets/audio/gameresultwin.webm');
    this.load.audio('stonesup', 'assets/audio/concretesup.webm');
    this.load.audio('stonedestroy', 'assets/audio/concretedestroy.webm');
    this.load.audio('bgm', 'assets/audio/giantost2.webm');
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
