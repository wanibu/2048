import Phaser from 'phaser';
import { CELL_SIZE, STONE_REGION } from '../config';

export class Stone extends Phaser.GameObjects.Container {
  public gridRow: number;
  public gridCol: number;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, row: number, col: number) {
    super(scene, x, y);
    this.gridRow = row;
    this.gridCol = col;

    const size = CELL_SIZE - 8;

    const frameName = 'stone_0';
    if (!scene.textures.get('border-full').has(frameName)) {
      scene.textures.get('border-full').add(
        frameName, 0,
        STONE_REGION.x, STONE_REGION.y, STONE_REGION.w, STONE_REGION.h
      );
    }

    this.sprite = scene.add.image(0, 0, 'border-full', frameName);
    const scale = size / Math.max(STONE_REGION.w, STONE_REGION.h);
    this.sprite.setScale(scale);
    this.add(this.sprite);

    scene.add.existing(this);
    this.setSize(size, size);
  }
}
