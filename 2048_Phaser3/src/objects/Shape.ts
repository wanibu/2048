import * as Phaser from 'phaser';
import { SHAPE_REGIONS } from '../config';

export class Shape extends Phaser.GameObjects.Container {
  public value: number;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number, cellSize: number) {
    super(scene, x, y);
    this.value = value;

    const region = SHAPE_REGIONS[value];
    const size = cellSize;

    const frameName = `shape_${value}`;
    if (!scene.textures.exists(frameName)) {
      const tex = scene.textures.get('shape-full');
      if (region) {
        tex.add(frameName, 0, region.x, region.y, region.w, region.h);
      }
    }

    if (region) {
      this.sprite = scene.add.image(0, 0, 'shape-full', frameName);
      this.sprite.setDisplaySize(size, size);
    } else {
      const rect = scene.add.rectangle(0, 0, size, size, 0x888888);
      this.sprite = rect as unknown as Phaser.GameObjects.Image;
    }
    this.add(this.sprite);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(size, size);
    body.setOffset(-size / 2, -size / 2);

    this.setSize(size, size);
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}
