import * as Phaser from 'phaser';
import { STONE_REGION } from '../config';

export class Stone extends Phaser.GameObjects.Container {
  public gridRow: number;
  public gridCol: number;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, row: number, col: number, cellSize: number) {
    super(scene, x, y);
    this.gridRow = row;
    this.gridCol = col;

    const size = cellSize;

    const frameName = 'stone_0';
    if (!scene.textures.get('border-full').has(frameName)) {
      scene.textures.get('border-full').add(
        frameName, 0,
        STONE_REGION.x, STONE_REGION.y, STONE_REGION.w, STONE_REGION.h
      );
    }

    this.sprite = scene.add.image(0, 0, 'border-full', frameName);
    this.sprite.setDisplaySize(size, size);
    this.add(this.sprite);

    scene.add.existing(this);
    this.setSize(size, size);
  }
}
