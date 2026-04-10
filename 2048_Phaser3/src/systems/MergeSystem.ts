import { Grid } from '../objects/Grid';
import { GRID_ROWS, GRID_COLS } from '../config';

interface MergeGroup {
  cells: { row: number; col: number }[];
  value: number;
}

export class MergeSystem {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  findMergeGroups(): MergeGroup[] {
    const visited: boolean[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      visited[r] = new Array(GRID_COLS).fill(false);
    }

    const groups: MergeGroup[] = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (visited[r][c] || this.grid.data[r][c] <= 0) continue;

        const value = this.grid.data[r][c];
        const cells: { row: number; col: number }[] = [];
        this.bfs(r, c, value, visited, cells);

        if (cells.length >= 2) {
          groups.push({ cells, value });
        }
      }
    }

    return groups;
  }

  private bfs(
    startRow: number, startCol: number, value: number,
    visited: boolean[][], result: { row: number; col: number }[]
  ): void {
    const queue = [{ row: startRow, col: startCol }];
    visited[startRow][startCol] = true;

    while (queue.length > 0) {
      const { row, col } = queue.shift()!;
      result.push({ row, col });

      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];

      for (const n of neighbors) {
        if (
          n.row >= 0 && n.row < GRID_ROWS &&
          n.col >= 0 && n.col < GRID_COLS &&
          !visited[n.row][n.col] &&
          this.grid.data[n.row][n.col] === value
        ) {
          visited[n.row][n.col] = true;
          queue.push(n);
        }
      }
    }
  }

  executeMerge(group: MergeGroup, landedCol?: number): { row: number; col: number; newValue: number } {
    // 2个: ×2, 3个: ×4, 4个: ×8 ...
    const newValue = group.value * Math.pow(2, group.cells.length - 1);

    // 合并位置：纵向取最小行号（向上靠拢），横向取打入的列（吸引过来）
    let minRow = group.cells[0].row;
    for (const cell of group.cells) {
      if (cell.row < minRow) minRow = cell.row;
    }

    // 如果有打入列且该列在组内，用打入列；否则取最小列号
    let targetCol: number;
    if (landedCol !== undefined && group.cells.some(c => c.col === landedCol)) {
      targetCol = landedCol;
    } else {
      // fallback（旋转触发的合并）：取最小列号
      targetCol = group.cells[0].col;
      for (const cell of group.cells) {
        if (cell.col < targetCol) targetCol = cell.col;
      }
    }

    const mergeTarget = { row: minRow, col: targetCol };

    // Remove all cells
    for (const cell of group.cells) {
      this.grid.removeBorder(cell.row, cell.col);
    }

    // Place merged result
    this.grid.placeBorder(mergeTarget.row, mergeTarget.col, newValue);

    return { row: mergeTarget.row, col: mergeTarget.col, newValue };
  }
}
