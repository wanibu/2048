import Phaser from 'phaser';
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
   * 1. Tween 容器 angle ±90°（视觉旋转）
   * 2. 动画结束后重置 angle=0，更新数据层，重新定位所有元素
   */
  rotateCW(onComplete: () => void): void {
    this.rotateContainer(90, () => {
      this.updateDataCW();
      this.repositionAll();
      onComplete();
    });
  }

  rotateCCW(onComplete: () => void): void {
    this.rotateContainer(-90, () => {
      this.updateDataCCW();
      this.repositionAll();
      onComplete();
    });
  }

  // 整个容器旋转动画（和原版一样，用 Tween）
  private rotateContainer(angleDelta: number, onComplete: () => void): void {
    const container = this.grid.getContainer();

    // 设置旋转中心为网格中心
    const gridW = GRID_COLS * this.grid.layout.cellSize;
    const gridH = GRID_ROWS * this.grid.layout.cellSize;
    const pivotX = this.grid.layout.gridOffsetX + gridW / 2;
    const pivotY = this.grid.layout.gridOffsetY + gridH / 2;

    // 容器默认 origin 是 (0,0)，需要调整位置让它围绕中心旋转
    // 先移动容器到中心点，设置子元素相对偏移
    // 更简单的方式：直接对容器做旋转动画
    // Phaser Container 的旋转中心可以通过设置 (x, y) 来控制
    // 我们把容器的 position 设为旋转中心，子元素坐标相对于中心

    // 保存当前容器位置
    const origX = container.x;
    const origY = container.y;

    // 把容器移到旋转中心
    container.setPosition(pivotX, pivotY);
    // 所有子元素减去中心偏移
    container.each((child: Phaser.GameObjects.GameObject) => {
      const go = child as unknown as { x: number; y: number };
      if (go && typeof go.x === 'number') {
        go.x -= pivotX;
        go.y -= pivotY;
      }
    });

    // Tween 旋转
    this.scene.tweens.add({
      targets: container,
      angle: container.angle + angleDelta,
      duration: 200,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // 动画结束：重置容器位置和角度
        container.angle = 0;
        container.setPosition(origX, origY);
        // 子元素加回偏移（后面 repositionAll 会重新设置位置）
        container.each((child: Phaser.GameObjects.GameObject) => {
          const go = child as unknown as { x: number; y: number };
          if (go && typeof go.x === 'number') {
            go.x += pivotX;
            go.y += pivotY;
          }
        });

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

  // 旋转后重新定位所有元素到正确的网格位置（无动画，瞬间归位）
  private repositionAll(): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const { x, y } = this.grid.cellToPixel(r, c);

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
