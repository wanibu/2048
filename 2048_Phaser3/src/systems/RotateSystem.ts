import { Grid } from '../objects/Grid';
import { GRID_ROWS, GRID_COLS } from '../config';

export class RotateSystem {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  /**
   * 顺时针旋转90度：
   * 新[col][ROWS-1-row] = 旧[row][col]
   * 即 newData[c][ROWS-1-r] = oldData[r][c]
   */
  rotateCW(): void {
    const oldData = this.grid.data.map(row => [...row]);
    const oldBorders = this.grid.borders.map(row => [...row]);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const newR = c;
        const newC = GRID_ROWS - 1 - r;
        this.grid.data[newR][newC] = oldData[r][c];
        this.grid.borders[newR][newC] = oldBorders[r][c];

        const border = oldBorders[r][c];
        if (border) {
          border.gridRow = newR;
          border.gridCol = newC;
          // Tween to new position
          const { x, y } = this.grid.cellToPixel(newR, newC);
          this.grid.getContainer().scene.tweens.add({
            targets: border,
            x, y,
            duration: 200,
            ease: 'Quad.easeInOut',
          });
        }
      }
    }
  }

  /**
   * 逆时针旋转90度：
   * 新[COLS-1-col][row] = 旧[row][col]
   * 即 newData[COLS-1-c][r] = oldData[r][c]
   */
  rotateCCW(): void {
    const oldData = this.grid.data.map(row => [...row]);
    const oldBorders = this.grid.borders.map(row => [...row]);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const newR = GRID_COLS - 1 - c;
        const newC = r;
        this.grid.data[newR][newC] = oldData[r][c];
        this.grid.borders[newR][newC] = oldBorders[r][c];

        const border = oldBorders[r][c];
        if (border) {
          border.gridRow = newR;
          border.gridCol = newC;
          const { x, y } = this.grid.cellToPixel(newR, newC);
          this.grid.getContainer().scene.tweens.add({
            targets: border,
            x, y,
            duration: 200,
            ease: 'Quad.easeInOut',
          });
        }
      }
    }
  }
}
