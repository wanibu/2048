import * as Phaser from 'phaser';
import { Grid } from '../objects/Grid';
import { GRID_ROWS, GRID_COLS } from '../config';

export class RotateSystem {
  private grid: Grid;
  private scene: Phaser.Scene;

  constructor(grid: Grid, scene: Phaser.Scene) {
    this.grid = grid;
    this.scene = scene;
  }

  /**
   * 原版实现方式：整个棋盘容器（背景+糖果+石头）一起旋转
   * 1. 创建临时旋转容器，把 grid container 的所有子元素移进去
   * 2. Tween 临时容器旋转 ±90°
   * 3. 动画结束后，更新数据层，把元素移回 grid container 并重新定位
   */
  rotateCW(onComplete: () => void): void {
    this.doRotate(90, () => {
      this.updateDataCW();
      this.repositionAll();
      onComplete();
    });
  }

  rotateCCW(onComplete: () => void): void {
    this.doRotate(-90, () => {
      this.updateDataCCW();
      this.repositionAll();
      onComplete();
    });
  }

  private doRotate(angleDelta: number, onComplete: () => void): void {
    const backgroundLayer = this.grid.getBackgroundLayer();
    const contentLayer = this.grid.getContentLayer();
    const bgTargetAngle = backgroundLayer.angle + angleDelta;

    this.scene.tweens.add({
      targets: backgroundLayer,
      angle: bgTargetAngle,
      duration: 200,
      ease: 'Quad.easeInOut',
    });

    this.scene.tweens.add({
      targets: contentLayer,
      angle: angleDelta,
      duration: 200,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // 内容层的旋转只用于过渡，结束后恢复正向，
        // 最终位置由数据重排后的局部坐标决定。
        contentLayer.setAngle(0);
        onComplete();
      },
    });
  }

  // 数据层顺时针旋转90度
  private updateDataCW(): void {
    const oldData = this.grid.data.map(row => [...row]);
    const oldBorders = this.grid.borders.map(row => [...row]);
    const oldStones = this.grid.stones.map(row => [...row]);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const newR = c;
        const newC = GRID_ROWS - 1 - r;
        this.grid.data[newR][newC] = oldData[r][c];
        this.grid.borders[newR][newC] = oldBorders[r][c];
        this.grid.stones[newR][newC] = oldStones[r][c];

        const border = oldBorders[r][c];
        if (border) {
          border.gridRow = newR;
          border.gridCol = newC;
        }
        const stone = oldStones[r][c];
        if (stone) {
          stone.gridRow = newR;
          stone.gridCol = newC;
        }
      }
    }
  }

  // 数据层逆时针旋转90度
  private updateDataCCW(): void {
    const oldData = this.grid.data.map(row => [...row]);
    const oldBorders = this.grid.borders.map(row => [...row]);
    const oldStones = this.grid.stones.map(row => [...row]);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const newR = GRID_COLS - 1 - c;
        const newC = r;
        this.grid.data[newR][newC] = oldData[r][c];
        this.grid.borders[newR][newC] = oldBorders[r][c];
        this.grid.stones[newR][newC] = oldStones[r][c];

        const border = oldBorders[r][c];
        if (border) {
          border.gridRow = newR;
          border.gridCol = newC;
        }
        const stone = oldStones[r][c];
        if (stone) {
          stone.gridRow = newR;
          stone.gridCol = newC;
        }
      }
    }
  }

  // 旋转后重新定位所有元素到正确的网格位置
  private repositionAll(): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const { x, y } = this.grid.localCellToPixel(r, c);

        const border = this.grid.borders[r][c];
        if (border) {
          border.setPosition(x, y);
        }

        const stone = this.grid.stones[r][c];
        if (stone) {
          stone.setPosition(x, y);
        }
      }
    }
  }
}
