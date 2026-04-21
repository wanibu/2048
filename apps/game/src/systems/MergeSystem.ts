import { Grid } from '../objects/Grid';
import { GRID_ROWS, GRID_COLS } from '../config';
import { Border } from '../objects/Border';

interface MergeGroup {
  cells: { row: number; col: number }[];
  value: number;
}

export interface GhostBorder {
  border: Border;
  from: { row: number; col: number };
}

export interface MergeResult {
  finalRow: number;
  finalCol: number;
  landedRow: number;
  landedCol: number;
  newValue: number;
  affectedCols: number[];
  removedCells: { row: number; col: number }[];
  destroyedStones: { row: number; col: number }[];
  ghostBorders: GhostBorder[];
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

  executeMerge(group: MergeGroup, landedCol?: number): MergeResult {
    // 2个: ×2, 3个: ×4, 4个: ×8 ...
    const newValue = group.value * Math.pow(2, group.cells.length - 1);

    // 合并结果最终位置：纵向取最小行号（向上靠拢）
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

    // 落点位置：目标列内最靠下的同值格子。
    // 结果先在这里生成，后续再沿列滑到最终位置。
    let landedRow = minRow;
    for (const cell of group.cells) {
      if (cell.col === targetCol && cell.row > landedRow) {
        landedRow = cell.row;
      }
    }

    // 记录被消除的格子（落点位置除外，因为会被新值覆盖）
    const removedCells = group.cells.filter(
      c => !(c.row === landedRow && c.col === targetCol)
    );

    // 被消除的 border 先从 grid 里分离出来作为 ghost，交给调用方做"飞向目标"动画
    const ghostBorders: GhostBorder[] = [];
    for (const cell of removedCells) {
      const b = this.grid.borders[cell.row][cell.col];
      if (b) {
        ghostBorders.push({ border: b, from: cell });
        this.grid.borders[cell.row][cell.col] = null;
        this.grid.data[cell.row][cell.col] = 0;
      }
    }

    // 落点位置的旧 border 还要销毁（它会被新值覆盖）
    this.grid.removeBorder(landedRow, targetCol);

    // Place merged result at landed row first; GameScene will animate it upward later.
    this.grid.placeBorder(landedRow, targetCol, newValue);

    const affectedCols = [...new Set(group.cells.map(c => c.col))];

    // 碎掉合并组周围的石头
    const destroyedStones: { row: number; col: number }[] = [];
    const neighbors = [
      { row: minRow - 1, col: targetCol },
      { row: minRow + 1, col: targetCol },
      { row: minRow, col: targetCol - 1 },
      { row: minRow, col: targetCol + 1 },
    ];
    for (const n of neighbors) {
      if (
        n.row >= 0 && n.row < GRID_ROWS &&
        n.col >= 0 && n.col < GRID_COLS &&
        this.grid.isStone(n.row, n.col)
      ) {
        destroyedStones.push({ row: n.row, col: n.col });
        if (!affectedCols.includes(n.col)) {
          affectedCols.push(n.col);
        }
      }
    }

    return {
      finalRow: minRow,
      finalCol: targetCol,
      landedRow,
      landedCol: targetCol,
      newValue,
      affectedCols,
      removedCells,
      destroyedStones,
      ghostBorders,
    };
  }
}
