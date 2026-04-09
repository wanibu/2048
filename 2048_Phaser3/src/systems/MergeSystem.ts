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

  executeMerge(group: MergeGroup): { row: number; col: number; newValue: number } {
    const newValue = group.value * 2;

    // Find priority merge target (cell with most same-value neighbors)
    let bestCell = group.cells[0];
    let bestNeighborCount = 0;

    for (const cell of group.cells) {
      let count = 0;
      for (const other of group.cells) {
        if (Math.abs(cell.row - other.row) + Math.abs(cell.col - other.col) === 1) {
          count++;
        }
      }
      if (count > bestNeighborCount) {
        bestNeighborCount = count;
        bestCell = cell;
      }
    }

    // Remove all cells
    for (const cell of group.cells) {
      this.grid.removeBorder(cell.row, cell.col);
    }

    // Place merged result
    this.grid.placeBorder(bestCell.row, bestCell.col, newValue);

    return { row: bestCell.row, col: bestCell.col, newValue };
  }
}
