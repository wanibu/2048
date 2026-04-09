import Phaser from 'phaser';
import { CELL_SIZE, SHAPE_REGIONS } from '../config';

export class Border extends Phaser.GameObjects.Container {
  public value: number;
  public gridRow: number;
  public gridCol: number;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number, row: number, col: number) {
    super(scene, x, y);
    this.value = value;
    this.gridRow = row;
    this.gridCol = col;

    const size = CELL_SIZE;

    // Reuse the same cropped frames from shape spritesheet
    const frameName = `shape_${value}`;
    const region = SHAPE_REGIONS[value];
    if (region) {
      if (!scene.textures.get('shape-full').has(frameName)) {
        scene.textures.get('shape-full').add(frameName, 0, region.x, region.y, region.w, region.h);
      }
      this.sprite = scene.add.image(0, 0, 'shape-full', frameName);
      this.sprite.setDisplaySize(size, size);
    } else {
      const rect = scene.add.rectangle(0, 0, size, size, 0x888888);
      this.sprite = rect as unknown as Phaser.GameObjects.Image;
    }
    this.add(this.sprite);

    scene.add.existing(this);
    this.setSize(size, size);
  }

  setValue(newValue: number): void {
    this.value = newValue;
    const region = SHAPE_REGIONS[newValue];
    const size = CELL_SIZE;
    if (region) {
      const frameName = `shape_${newValue}`;
      if (!this.scene.textures.get('shape-full').has(frameName)) {
        this.scene.textures.get('shape-full').add(frameName, 0, region.x, region.y, region.w, region.h);
      }
      (this.sprite as Phaser.GameObjects.Image).setTexture('shape-full', frameName);
      this.sprite.setDisplaySize(size, size);
    }
  }
}
